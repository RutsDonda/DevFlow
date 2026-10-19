"""
app/routes/videos.py – Videos made by the Video agent.

  GET    /api/videos              – list
  GET    /api/videos/{id}/file    – the MP4 (fetched with the auth header, played from a blob URL)
  DELETE /api/videos/{id}
"""

import re

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.firebase import FirebaseUser
from app.core.security import get_registered_user
from app.models.schemas import VideoSummary
from app.services import videos as video_service

router = APIRouter(prefix="/videos", tags=["videos"])


@router.get("", response_model=list[VideoSummary])
async def list_videos(user: FirebaseUser = Depends(get_registered_user)):
    return await video_service.list_videos(user.uid)


@router.get("/{video_id}/file")
async def video_file(video_id: str, user: FirebaseUser = Depends(get_registered_user)):
    video = await video_service.get_video(user.uid, video_id)
    if not video:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Video not found")
    filename = re.sub(r"[^A-Za-z0-9._-]+", "-", video["title"]).strip("-")[:80] or "video"
    return Response(
        content=await video_service.read_video_file(video),
        media_type="video/mp4",
        headers={"Content-Disposition": f'inline; filename="{filename}.mp4"', "Cache-Control": "private, max-age=86400"},
    )


@router.delete("/{video_id}", status_code=204)
async def delete_video(video_id: str, user: FirebaseUser = Depends(get_registered_user)):
    if not await video_service.delete_video(user.uid, video_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Video not found")
