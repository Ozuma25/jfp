"""Utility helpers — IP extraction, device fingerprint, image upload."""

import base64
import io
import uuid

from django.conf import settings


def get_client_ip(request) -> str | None:
    """Extract real IP, respecting X-Forwarded-For from proxies."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_device_info(request) -> dict:
    """Extract device name, browser, OS from User-Agent."""
    ua = request.META.get("HTTP_USER_AGENT", "")
    # Simple extraction — good enough for internal HR tool
    browser = "Unknown"
    os_name = "Unknown"

    if "Chrome" in ua and "Edg" not in ua:
        browser = "Chrome"
    elif "Firefox" in ua:
        browser = "Firefox"
    elif "Safari" in ua and "Chrome" not in ua:
        browser = "Safari"
    elif "Edg" in ua:
        browser = "Edge"

    if "Windows" in ua:
        os_name = "Windows"
    elif "Android" in ua:
        os_name = "Android"
    elif "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"
    elif "Macintosh" in ua:
        os_name = "macOS"
    elif "Linux" in ua:
        os_name = "Linux"

    return {"browser": browser, "os": os_name, "device_name": f"{os_name} / {browser}"}


def upload_selfie_to_cloudinary(base64_data: str, folder: str = "attendance_selfies") -> str:
    """
    Upload a base64-encoded image to Cloudinary.
    Returns the secure URL string.
    Falls back to saving locally if Cloudinary is not configured.
    """
    try:
        import cloudinary.uploader

        # Strip data URI prefix if present
        if "," in base64_data:
            base64_data = base64_data.split(",", 1)[1]

        image_bytes = base64.b64decode(base64_data)
        public_id = f"{folder}/{uuid.uuid4().hex}"

        result = cloudinary.uploader.upload(
            image_bytes,
            public_id=public_id,
            resource_type="image",
            format="jpg",
        )
        return result.get("secure_url", "")
    except Exception:
        # Graceful fallback: save to media/attendance_selfies/
        return _save_base64_locally(base64_data, folder)


def _save_base64_locally(base64_data: str, folder: str) -> str:
    """Save base64 image to Django MEDIA_ROOT and return URL."""
    from pathlib import Path

    if "," in base64_data:
        base64_data = base64_data.split(",", 1)[1]

    try:
        media_root = Path(settings.MEDIA_ROOT)
        save_dir = media_root / folder
        save_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4().hex}.jpg"
        filepath = save_dir / filename
        filepath.write_bytes(base64.b64decode(base64_data))
        return f"{settings.MEDIA_URL}{folder}/{filename}"
    except Exception:
        return ""
