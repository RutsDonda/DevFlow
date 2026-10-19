"""
app/services/videos.py – Narrated explainer videos made by the Video agent.

A video is a list of scenes (heading, on-screen bullets, narration). Each scene becomes a
1280×720 slide drawn with Pillow plus a voice-over from edge-tts (free neural voices, no API
key); ffmpeg (bundled by imageio-ffmpeg) turns every slide + voice-over into a clip and joins
them into one MP4. The file is stored in MongoDB GridFS so it survives serverless restarts.

Settings are tuned for small files (still frames at 5 fps, mono speech audio): a 3-minute
video is ~1.5 MB, comfortably below the 4.5 MB response limit of a Vercel Function.
"""

import asyncio
import logging
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

import imageio_ffmpeg
from bson import ObjectId
from bson.errors import InvalidId
from gridfs import AsyncGridFSBucket
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

from app.core.database import GENERATED_VIDEOS, VIDEO_BUCKET, col, get_db

logger = logging.getLogger(__name__)

W, H = 1280, 720
MAX_SCENES = 12
MAX_NARRATION_WORDS = 90
MAX_BYTES = 4_000_000
DEFAULT_VOICE = "en-US-AriaNeural"
TITLE_SECONDS = 3.0
WORDS_PER_SECOND = 2.5  # pacing for silent scenes when text-to-speech is unavailable

# Midnight Indigo palette (frontend/src/index.css)
BG = (11, 13, 23)
INK = (232, 234, 246)
MUTE = (155, 161, 192)
FAINT = (95, 102, 136)
ACCENT = (124, 108, 255)
ACCENT_2 = (34, 211, 238)


class VideoError(Exception):
    pass


# ── Slides ────────────────────────────────────────────────────────────────────

@lru_cache
def _font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.load_default(size)


@lru_cache
def _background() -> Image.Image:
    """Dark surface with soft indigo / cyan glows, like the app."""
    img = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((W - 520, -380, W + 380, 360), fill=(70, 58, 160))
    d.ellipse((-420, H - 260, 380, H + 420), fill=(12, 92, 112))
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    return ImageChops.add(img, glow.point(lambda v: v * 0.5))


def _wrap(text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines, line = [], ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if font.getlength(candidate) <= width or not line:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def _chrome(d: ImageDraw.ImageDraw, video_title: str, index: int, total: int) -> None:
    """Brand + title on top, progress segments at the bottom."""
    d.ellipse((64, 44, 80, 60), outline=ACCENT, width=3)
    d.text((92, 40), "AI DevFlow", font=_font(20), fill=INK)
    title = video_title if len(video_title) <= 60 else video_title[:57] + "…"
    d.text((W - 64, 40), title, font=_font(20), fill=FAINT, anchor="ra")
    gap, left, right, y = 8, 64, W - 64, H - 52
    seg = (right - left - gap * (total - 1)) / total
    for i in range(total):
        x = left + i * (seg + gap)
        d.rounded_rectangle((x, y, x + seg, y + 5), radius=3, fill=ACCENT_2 if i <= index else (40, 44, 66))


def _title_slide(title: str, subtitle: str, total: int) -> Image.Image:
    img = _background().copy()
    d = ImageDraw.Draw(img)
    _chrome(d, "", -1, total)
    lines = _wrap(title, _font(64), W - 240)[:3]
    y = H / 2 - len(lines) * 40 - (30 if subtitle else 0)
    d.rounded_rectangle((W / 2 - 40, y - 44, W / 2 + 40, y - 38), radius=3, fill=ACCENT)
    for line in lines:
        d.text((W / 2, y), line, font=_font(64), fill=INK, anchor="ma", stroke_width=1, stroke_fill=INK)
        y += 80
    for line in _wrap(subtitle, _font(28), W - 320)[:2]:
        d.text((W / 2, y + 16), line, font=_font(28), fill=MUTE, anchor="ma")
        y += 40
    return img


def _scene_slide(video_title: str, scene: dict, index: int, total: int) -> Image.Image:
    img = _background().copy()
    d = ImageDraw.Draw(img)
    _chrome(d, video_title, index, total)
    y = 140
    d.text((96, y), f"{index + 1:02d}", font=_font(26), fill=ACCENT_2)
    y += 44
    for line in _wrap(scene["heading"], _font(52), W - 192)[:2]:
        d.text((96, y), line, font=_font(52), fill=INK, stroke_width=1, stroke_fill=INK)
        y += 66
    y += 28
    for bullet in scene["bullets"][:4]:
        lines = _wrap(bullet, _font(30), W - 260)[:2]
        d.rounded_rectangle((100, y + 12, 112, y + 24), radius=3, fill=ACCENT)
        for line in lines:
            d.text((136, y), line, font=_font(30), fill=MUTE)
            y += 42
        y += 18
    return img


# ── Audio + encoding ──────────────────────────────────────────────────────────

async def _speak(text: str, voice: str, path: Path) -> bool:
    import edge_tts

    try:
        await edge_tts.Communicate(text, voice).save(str(path))
        return path.exists() and path.stat().st_size > 0
    except Exception:  # network / service hiccup → that scene is silent
        logger.warning("Text-to-speech failed for a scene", exc_info=True)
        return False


def _ffmpeg(*args: str) -> str:
    proc = subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-y", *args],
        capture_output=True, text=True, timeout=240,
    )
    if proc.returncode != 0:
        raise VideoError(f"ffmpeg failed: {proc.stderr[-400:]}")
    return proc.stderr


def _clip(slide: Path, audio: Path | None, seconds: float, out: Path) -> None:
    """One slide held for the length of its voice-over plus a short pause (`seconds` when silent)."""
    if audio:
        seconds = _duration(audio) + 0.7
        sound = ["-i", str(audio)]
    else:
        sound = ["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono"]
    _ffmpeg(
        "-loop", "1", "-framerate", "5", "-i", str(slide), *sound,
        "-af", "apad", "-t", f"{seconds:.2f}",
        "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-crf", "30", "-pix_fmt", "yuv420p", "-r", "5",
        "-c:a", "aac", "-b:a", "48k", "-ac", "1", "-ar", "24000",
        str(out),
    )


def _duration(path: Path) -> float:
    """Length of a media file in seconds, read from ffmpeg's banner (imageio-ffmpeg ships no ffprobe)."""
    info = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-i", str(path)], capture_output=True, text=True).stderr
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", info)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0.0


def _encode(tmp: Path, title: str, subtitle: str, scenes: list[dict], voiced: list[bool]) -> tuple[bytes, float]:
    total = len(scenes)
    clips = []
    _title_slide(title, subtitle, total).save(tmp / "title.png")
    _clip(tmp / "title.png", None, TITLE_SECONDS, tmp / "clip_title.mp4")
    clips.append(tmp / "clip_title.mp4")
    for i, scene in enumerate(scenes):
        _scene_slide(title, scene, i, total).save(tmp / f"slide{i}.png")
        audio = tmp / f"voice{i}.mp3" if voiced[i] else None
        seconds = max(4.0, len(scene["narration"].split()) / WORDS_PER_SECOND)
        _clip(tmp / f"slide{i}.png", audio, seconds, tmp / f"clip{i}.mp4")
        clips.append(tmp / f"clip{i}.mp4")

    (tmp / "list.txt").write_text("".join(f"file '{c.name}'\n" for c in clips), encoding="utf-8")
    out = tmp / "video.mp4"
    _ffmpeg("-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"), "-c", "copy", "-movflags", "+faststart", str(out))
    return out.read_bytes(), _duration(out)


def _clean_scenes(scenes: list[dict]) -> list[dict]:
    out = []
    for s in scenes[:MAX_SCENES]:
        heading = " ".join(str(s.get("heading", "")).split())[:120]
        narration = " ".join(str(s.get("narration", "")).split()[:MAX_NARRATION_WORDS])
        bullets = [" ".join(str(b).split())[:160] for b in (s.get("bullets") or []) if str(b).strip()][:4]
        if heading or narration:
            out.append({"heading": heading or "…", "bullets": bullets, "narration": narration or heading})
    return out


# ── Persistence ───────────────────────────────────────────────────────────────

def _bucket() -> AsyncGridFSBucket:
    return AsyncGridFSBucket(get_db(), bucket_name=VIDEO_BUCKET)


def serialize_video(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "description": doc.get("description", ""),
        "source_files": doc.get("source_files", []),
        "scene_count": len(doc.get("scenes", [])),
        "duration_seconds": doc.get("duration_seconds", 0.0),
        "size_bytes": doc.get("size_bytes", 0),
        "thread_id": doc.get("thread_id"),
        "created_at": doc["created_at"],
    }


async def create_video(
    user_id: str,
    thread_id: str | None,
    title: str,
    description: str,
    scenes: list[dict],
    source_files: list[str],
    voice: str = DEFAULT_VOICE,
) -> dict:
    scenes = _clean_scenes(scenes)
    if len(scenes) < 2:
        raise VideoError("A video needs at least 2 scenes")
    title = " ".join(title.split())[:120] or "Explainer video"

    with tempfile.TemporaryDirectory(prefix="devflow-video-") as name:
        tmp = Path(name)
        voiced = await asyncio.gather(*(_speak(s["narration"], voice, tmp / f"voice{i}.mp3") for i, s in enumerate(scenes)))
        data, duration = await asyncio.to_thread(_encode, tmp, title, description, scenes, list(voiced))
    if len(data) > MAX_BYTES:
        raise VideoError(f"The video came out too large ({len(data) / 1e6:.1f} MB) – use fewer or shorter scenes")

    file_id = await _bucket().upload_from_stream(f"{title}.mp4", data, metadata={"user_id": user_id})
    doc = {
        "user_id": user_id,
        "thread_id": thread_id,
        "title": title,
        "description": description.strip()[:500],
        "source_files": source_files,
        "scenes": scenes,
        "narrated": all(voiced),
        "file_id": file_id,
        "duration_seconds": round(duration, 1),
        "size_bytes": len(data),
        "created_at": datetime.now(timezone.utc),
    }
    doc["_id"] = (await col(GENERATED_VIDEOS).insert_one(doc)).inserted_id
    return doc


async def get_video(user_id: str, video_id: str) -> dict | None:
    try:
        oid = ObjectId(video_id)
    except (InvalidId, TypeError):
        return None
    return await col(GENERATED_VIDEOS).find_one({"_id": oid, "user_id": user_id})


async def list_videos(user_id: str) -> list[dict]:
    cursor = col(GENERATED_VIDEOS).find({"user_id": user_id}, {"scenes": 0}).sort("created_at", -1)
    return [serialize_video(d) async for d in cursor]


async def read_video_file(doc: dict) -> bytes:
    stream = await _bucket().open_download_stream(doc["file_id"])
    return await stream.read()


async def delete_video(user_id: str, video_id: str) -> bool:
    doc = await get_video(user_id, video_id)
    if not doc:
        return False
    await col(GENERATED_VIDEOS).delete_one({"_id": doc["_id"]})
    await _bucket().delete(doc["file_id"])
    return True


async def delete_user_videos(user_id: str) -> None:
    async for doc in col(GENERATED_VIDEOS).find({"user_id": user_id}, {"file_id": 1}):
        await _bucket().delete(doc["file_id"])
    await col(GENERATED_VIDEOS).delete_many({"user_id": user_id})
