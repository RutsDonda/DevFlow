"""
app/agents/tools/video_tools.py – Tools for the Video agent (documents → narrated explainer video).
"""

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.agents.tools.context import thread_id_from, user_id_from
from app.agents.tools.rag_tools import list_my_documents, read_document, search_documents
from app.models.schemas import VideoScene
from app.services import videos as video_service

VOICES = {
    "female": "en-US-AriaNeural",
    "male": "en-US-GuyNeural",
    "british": "en-GB-SoniaNeural",
    "indian": "en-IN-NeerjaNeural",
}


@tool
async def create_video(
    title: str,
    subtitle: str,
    scenes: list[VideoScene],
    source_files: list[str],
    config: RunnableConfig,
    voice: str = "female",
) -> str:
    """Render a narrated explainer video (MP4, 1280x720 slides with voice-over) and show it to the user in the chat.
    Rendering takes about a few seconds per scene.

    Args:
        title: Video title shown on the opening card, e.g. "Understanding Transformers".
        subtitle: One short line under the title, e.g. "A 2-minute summary of attention.pdf".
        scenes: 3-12 scenes in order. Each scene is one slide: a heading, up to 4 short bullets, and its narration.
        source_files: File names the video is based on.
        voice: Narrator voice: "female" (default), "male", "british" or "indian".
    """
    try:
        video = await video_service.create_video(
            user_id=user_id_from(config),
            thread_id=thread_id_from(config),
            title=title,
            description=subtitle,
            scenes=[s.model_dump() if isinstance(s, VideoScene) else dict(s) for s in scenes],
            source_files=source_files,
            voice=VOICES.get(voice.lower().strip(), VOICES["female"]),
        )
    except video_service.VideoError as exc:
        return f"ERROR: {exc}"
    minutes, seconds = divmod(round(video["duration_seconds"]), 60)
    note = "" if video["narrated"] else " Some scenes are silent because the text-to-speech service was unavailable."
    return (
        f"Created video '{video['title']}' (id {video['_id']}): {len(video['scenes'])} scenes, {minutes}:{seconds:02d} long."
        f"{note} It is shown to the user in the chat with a player and a download button."
    )


VIDEO_TOOLS = [create_video, read_document, search_documents, list_my_documents]
