"""Video assembly endpoint."""

import asyncio
import logging
import tempfile
from datetime import date
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..models.requests import AssemblyMetadata
from ..services.ffmpeg import assemble_video

logger = logging.getLogger(__name__)

router = APIRouter(tags=["assembly"])


@router.post("/assemble-video")
async def assemble_video_endpoint(
    metadata: str = Form(..., description="JSON string of AssemblyMetadata"),
    images: list[UploadFile] = File(..., description="Image files for each scene"),
    audio: list[UploadFile] = File(..., description="Audio files for each scene"),
) -> FileResponse:
    """Assemble images and audio into a video.

    Accepts multipart form data with:
    - metadata: JSON string containing assembly configuration
    - images: Image files (one per scene)
    - audio: Audio files (one per scene)

    Returns the assembled MP4 video file.
    """
    logger.info(
        f"Received assembly request: {len(images)} images, {len(audio)} audio files"
    )

    # Parse and validate metadata
    try:
        meta = AssemblyMetadata.model_validate_json(metadata)
    except Exception as e:
        logger.error(f"Invalid metadata: {e}")
        raise HTTPException(
            status_code=400,
            detail={"error": "INVALID_METADATA", "message": f"Invalid metadata JSON: {e}"},
        )

    # Validate file counts match scenes
    expected_count = len(meta.scenes)
    if len(images) != expected_count:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "INVALID_REQUEST",
                "message": f"Expected {expected_count} images, got {len(images)}",
            },
        )
    if len(audio) != expected_count:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "INVALID_REQUEST",
                "message": f"Expected {expected_count} audio files, got {len(audio)}",
            },
        )

    # Create temp directory for processing
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)

            # Save uploaded files
            image_paths = []
            audio_paths = []

            for i, img in enumerate(images):
                path = tmppath / f"image_{i}.jpg"
                content = await img.read()
                path.write_bytes(content)
                image_paths.append(path)
                logger.debug(f"Saved image {i}: {len(content)} bytes")

            for i, aud in enumerate(audio):
                path = tmppath / f"audio_{i}.mp3"
                content = await aud.read()
                path.write_bytes(content)
                audio_paths.append(path)
                logger.debug(f"Saved audio {i}: {len(content)} bytes")

            # Get scene durations from metadata
            scene_durations = [scene.imageDuration for scene in meta.scenes]

            # Assemble video
            output_path = tmppath / "output.mp4"
            try:
                duration = await asyncio.wait_for(
                    assemble_video(
                        image_paths=image_paths,
                        audio_paths=audio_paths,
                        scene_durations=scene_durations,
                        resolution=(meta.resolution.width, meta.resolution.height),
                        frame_rate=meta.frameRate,
                        output_path=output_path,
                    ),
                    timeout=300,  # 5 minute timeout
                )
            except asyncio.TimeoutError:
                logger.error("Video assembly timed out")
                raise HTTPException(
                    status_code=504,
                    detail={"error": "TIMEOUT", "message": "Video assembly timed out"},
                )

            # Generate filename with date
            filename = f"slop-video-{date.today().isoformat()}.mp4"

            logger.info(f"Video assembled successfully: {filename}, {duration:.1f}s")

            # Read file into memory since temp dir will be deleted
            video_content = output_path.read_bytes()

            # Create a new temp file that persists for the response
            # FastAPI's FileResponse needs a file that exists
            final_output = Path(tempfile.gettempdir()) / f"output_{id(video_content)}.mp4"
            final_output.write_bytes(video_content)

            return FileResponse(
                path=str(final_output),
                media_type="video/mp4",
                filename=filename,
                headers={
                    "X-Video-Duration": str(duration),
                    "Content-Disposition": f'attachment; filename="{filename}"',
                },
                background=None,  # Don't delete the file in background
            )

    except HTTPException:
        raise
    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(
            status_code=400,
            detail={"error": "MISSING_FILES", "message": str(e)},
        )
    except RuntimeError as e:
        logger.error(f"FFmpeg error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "FFMPEG_ERROR", "message": str(e)},
        )
    except Exception as e:
        logger.exception("Video assembly failed")
        raise HTTPException(
            status_code=500,
            detail={"error": "INTERNAL_ERROR", "message": str(e)},
        )
