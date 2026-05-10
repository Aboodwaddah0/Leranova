from pathlib import Path
import tempfile
import requests

from config import settings


def download_file(file_url: str, lesson_id: str, suffix: str) -> Path:
    temp_dir = Path(settings.temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        dir=temp_dir,
        prefix=f"lesson_{lesson_id}_",
        suffix=suffix,
        delete=False,
    ) as tmp_file:
        file_path = Path(tmp_file.name)

    with requests.get(file_url, stream=True, timeout=settings.request_timeout_seconds) as response:
        response.raise_for_status()

        content_length = int(response.headers.get("Content-Length", 0))
        if content_length > settings.max_download_bytes:
            raise ValueError(
                f"File size {content_length} bytes exceeds limit of {settings.max_download_bytes} bytes"
            )

        written = 0
        with file_path.open("wb") as file:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    written += len(chunk)
                    if written > settings.max_download_bytes:
                        file_path.unlink(missing_ok=True)
                        raise ValueError(
                            f"Download aborted: exceeded size limit of {settings.max_download_bytes} bytes"
                        )
                    file.write(chunk)

    return file_path


def download_video(video_url: str, lesson_id: str) -> Path:
    return download_file(video_url, lesson_id, ".mp4")
