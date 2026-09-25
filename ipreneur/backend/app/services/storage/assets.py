"""
Local file storage for user-uploaded assets (logo, gallery photos).

Files are written to backend/uploads/<project_id>/ and served by FastAPI's
StaticFiles mount at /uploads (see app/main.py). URLs returned are relative
(e.g. "/uploads/<id>/logo_ab12.png"); the frontend prefixes the API origin.

S3-swappable: to move to MinIO/S3/Supabase Storage later, replace save_upload()
with an uploader that returns a public URL — nothing else changes.
"""
import os
import uuid
from typing import Optional

from fastapi import UploadFile

# backend/uploads  (this file is backend/app/services/storage/assets.py → up 4 levels)
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
UPLOAD_DIR = os.path.join(_BACKEND_DIR, "uploads")

_ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/svg+xml"}
_EXT = {
    "image/png": ".png", "image/jpeg": ".jpg", "image/jpg": ".jpg",
    "image/webp": ".webp", "image/gif": ".gif", "image/svg+xml": ".svg",
}
_MAX_BYTES = 8 * 1024 * 1024  # 8 MB per file


class StorageError(Exception):
    pass


async def save_upload(project_id: str, file: UploadFile, kind: str) -> str:
    """Validate + persist one uploaded image. Returns its relative URL."""
    content_type = (file.content_type or "").lower()
    if content_type not in _ALLOWED_TYPES:
        raise StorageError(f"Unsupported file type '{content_type}'. Use PNG, JPG, WEBP, GIF or SVG.")

    data = await file.read()
    if len(data) > _MAX_BYTES:
        raise StorageError(f"'{file.filename}' is too large (max {_MAX_BYTES // (1024*1024)} MB).")
    if not data:
        raise StorageError(f"'{file.filename}' is empty.")

    proj_dir = os.path.join(UPLOAD_DIR, project_id)
    os.makedirs(proj_dir, exist_ok=True)

    ext = _EXT.get(content_type, ".png")
    fname = f"{kind}_{uuid.uuid4().hex[:10]}{ext}"
    with open(os.path.join(proj_dir, fname), "wb") as fh:
        fh.write(data)

    return f"/uploads/{project_id}/{fname}"


def read_asset_bytes(url: Optional[str]) -> Optional[bytes]:
    """Read a locally-stored asset back by the relative URL save_upload() returned.

    The PPTX renderer needs the raw bytes of user-uploaded gallery photos. They
    live on this machine at backend/uploads/<project_id>/<file>, so read them off
    disk rather than issuing an HTTP request back to our own StaticFiles mount —
    that would need a base URL the worker doesn't reliably know, and would fail
    whenever the app is behind a proxy or a different internal port.

    Returns None for anything that isn't one of our own relative /uploads paths
    (an absolute S3/CDN URL, say) so callers can fall back to fetch_image_bytes.
    """
    if not url or not url.startswith("/uploads/"):
        return None
    rel = url[len("/uploads/"):]
    # Refuse traversal: the resolved path must stay inside UPLOAD_DIR.
    path = os.path.normpath(os.path.join(UPLOAD_DIR, rel))
    if not path.startswith(os.path.normpath(UPLOAD_DIR) + os.sep):
        return None
    try:
        with open(path, "rb") as fh:
            return fh.read()
    except OSError:
        return None


async def load_gallery_bytes(assets: Optional[dict]) -> dict:
    """{slot id -> image bytes} for a project's uploaded gallery photos.

    Slots with unreadable or non-raster files are omitted, so the renderer falls
    back to the captioned placeholder for those tiles rather than failing.
    """
    out: dict = {}
    for img in (assets or {}).get("gallery_images", []) or []:
        slot, url = img.get("slot"), img.get("url")
        if not slot or not url:
            continue
        data = read_asset_bytes(url)
        if data is None and url.startswith(("http://", "https://")):
            from app.services.images.image_service import fetch_image_bytes
            data = await fetch_image_bytes(url)
        if data:
            out[slot] = data
    return out
