import React, { useEffect, useState } from 'react';
import { HiOutlineArrowDownTray, HiOutlineFilm } from 'react-icons/hi2';
import { videoAPI } from '../../services/api';
import { saveBlob } from '../../utils/format';

const clock = (seconds = 0) => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const slug = (title) => (title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video';

/**
 * Player for a video made by the Video agent. The MP4 needs the auth header, so it is fetched
 * as a blob and played from an object URL. `video` = { id, title?, description?, duration_seconds?, scene_count? }
 */
const VideoCard = ({ video }) => {
  const [blob, setBlob] = useState(null);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    videoAPI.file(video.id)
      .then((data) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setBlob(data);
        setUrl(objectUrl);
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [video.id]);

  const meta = [
    video.duration_seconds ? clock(video.duration_seconds) : null,
    video.scene_count ? `${video.scene_count} scenes` : null,
    'MP4',
  ].filter(Boolean).join(' · ');

  return (
    <div className="mt-4 max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="relative aspect-video bg-black/40">
        {url ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={url} controls preload="metadata" className="h-full w-full" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-faint">
            <HiOutlineFilm className={`h-8 w-8 ${error ? '' : 'animate-pulse'}`} />
            {error || 'Loading video…'}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
          <HiOutlineFilm className="h-5 w-5 text-rose-200/90" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{video.title || 'Generated video'}</p>
          <p className="truncate text-xs text-faint">{meta}</p>
        </div>
        <button
          type="button"
          onClick={() => saveBlob(blob, `${slug(video.title)}.mp4`)}
          disabled={!blob}
          title="Download MP4"
          className="flex h-9 w-9 items-center justify-center rounded-full text-mute hover:bg-white/[0.08] hover:text-ink disabled:opacity-40"
        >
          <HiOutlineArrowDownTray className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default VideoCard;
