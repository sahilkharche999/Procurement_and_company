import mimetypes
from functools import lru_cache

import boto3

from config import (
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_S3_BUCKET_NAME,
    AWS_S3_PUBLIC_BASE_URL,
)


def _require_s3_config():
    missing = []
    if not AWS_ACCESS_KEY_ID:
        missing.append("AWS_ACCESS_KEY_ID")
    if not AWS_SECRET_ACCESS_KEY:
        missing.append("AWS_SECRET_ACCESS_KEY")
    if not AWS_REGION:
        missing.append("AWS_REGION")
    if not AWS_S3_BUCKET_NAME:
        missing.append("AWS_S3_BUCKET_NAME")

    if missing:
        raise RuntimeError(
            "Missing AWS S3 configuration: " + ", ".join(missing)
        )


@lru_cache(maxsize=1)
def _s3_client():
    _require_s3_config()
    return boto3.client(
        "s3",
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )


def _normalize_key(s3_key: str) -> str:
    return str(s3_key or "").strip().lstrip("/")


def _build_public_url(s3_key: str) -> str:
    key = _normalize_key(s3_key)
    if AWS_S3_PUBLIC_BASE_URL:
        return f"{AWS_S3_PUBLIC_BASE_URL.rstrip('/')}/{key}"
    return f"https://{AWS_S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"


def upload_file_to_s3(local_file_path: str, s3_key: str, content_type: str | None = None) -> str:
    """
    Upload a local file to S3 and return its public URL.
    """
    key = _normalize_key(s3_key)
    guessed_content_type = content_type or mimetypes.guess_type(local_file_path)[0]

    extra_args = {}
    if guessed_content_type:
        extra_args["ContentType"] = guessed_content_type

    client = _s3_client()
    if extra_args:
        client.upload_file(local_file_path, AWS_S3_BUCKET_NAME, key, ExtraArgs=extra_args)
    else:
        client.upload_file(local_file_path, AWS_S3_BUCKET_NAME, key)

    return _build_public_url(key)
