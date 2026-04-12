"""
app/utils/s3.py
────────────────
AWS S3 helpers for photo uploads and signed URL generation.
All S3 object keys follow a consistent naming convention:
    photos/{move_id}/{item_id}/{photo_type}.jpg
    manifests/{move_id}/manifest.pdf
"""

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import get_settings
from app.core.exceptions import ZenMoveException

settings = get_settings()


def _get_s3_client():
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def build_photo_key(move_id: str, item_id: str, photo_type: str) -> str:
    """
    photo_type: 'open' | 'sealed'
    Returns: 'photos/move-uuid/item-uuid/open.jpg'
    """
    return f"photos/{move_id}/{item_id}/{photo_type}.jpg"


def build_manifest_key(move_id: str) -> str:
    return f"manifests/{move_id}/manifest.pdf"


def upload_file_bytes(
    data: bytes,
    key: str,
    content_type: str,
    bucket: str | None = None,
) -> str:
    """
    Upload raw bytes to S3.

    Returns:
        The S3 object key (not a URL — signed URLs are generated separately).
    """
    bucket = bucket or settings.s3_bucket_photos

    # Local development mocking when AWS keys aren't provided
    if not settings.aws_access_key_id or settings.aws_access_key_id in ("aws_access_key_id_here", "test", ""):
        return key

    s3 = _get_s3_client()
    try:
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
            ServerSideEncryption="AES256",  # encrypt at rest
        )
        return key
    except (BotoCoreError, ClientError) as e:
        raise ZenMoveException(f"S3 upload failed: {e}") from e


def generate_signed_url(
    key: str,
    bucket: str | None = None,
    expiry: int | None = None,
) -> str:
    """
    Generate a pre-signed GET URL for private S3 objects.

    Args:
        key: S3 object key.
        bucket: Override bucket (defaults to photos bucket).
        expiry: TTL in seconds (defaults to settings value = 900s / 15 min).

    Returns:
        A time-limited HTTPS URL.
    """
    bucket = bucket or settings.s3_bucket_photos
    expiry = expiry or settings.s3_signed_url_expiry

    if not settings.aws_access_key_id or settings.aws_access_key_id in ("aws_access_key_id_here", "test", ""):
        return f"https://zenmove-local-mock.s3.amazonaws.com/{key}?expires={expiry}"

    s3 = _get_s3_client()
    try:
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expiry,
        )
    except (BotoCoreError, ClientError) as e:
        raise ZenMoveException(f"Failed to generate signed URL: {e}") from e


def delete_object(key: str, bucket: str | None = None) -> None:
    """Remove an object from S3 (used in cleanup / test teardown)."""
    bucket = bucket or settings.s3_bucket_photos

    if not settings.aws_access_key_id or settings.aws_access_key_id in ("aws_access_key_id_here", "test", ""):
        return

    s3 = _get_s3_client()
    try:
        s3.delete_object(Bucket=bucket, Key=key)
    except (BotoCoreError, ClientError) as e:
        raise ZenMoveException(f"S3 delete failed: {e}") from e
