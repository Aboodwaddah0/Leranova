from pathlib import Path
import tempfile
import requests

from config import settings


def download_video(video_url: str, lesson_id: str) -> Path:
    temp_dir = Path(settings.temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        dir=temp_dir,
        prefix=f"lesson_{lesson_id}_",
        suffix=".mp4",
        delete=False,
    ) as tmp_file:
        video_path = Path(tmp_file.name)

    with requests.get(video_url, stream=True, timeout=settings.request_timeout_seconds) as response:
        response.raise_for_status()
        with video_path.open("wb") as file:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    file.write(chunk)

    return video_path
