from typing import Literal
from pydantic import BaseModel, AnyHttpUrl, model_validator


class IngestRequest(BaseModel):
    file_url: AnyHttpUrl
    file_type: Literal["video", "pdf", "docx", "txt"]
    course_id: int
    subject_id: int
    lesson_id: int
    organization_id: int | None = None


class IngestResponse(BaseModel):
    status: str


class QdrantChunkCountResponse(BaseModel):
    lesson_id: int
    count: int


class ProcessLessonRequest(BaseModel):
    lessonId: str
    organizationId: str
    fileUrl: AnyHttpUrl | None = None
    fileType: Literal["video", "pdf", "docx", "txt"] | None = None
    sourceName: str | None = None
    videoUrl: AnyHttpUrl | None = None

    @model_validator(mode="after")
    def normalize_legacy_payload(self):
        # Backward compatibility with old payloads that still send videoUrl only.
        if self.fileUrl is None and self.videoUrl is not None:
            self.fileUrl = self.videoUrl

        if self.fileType is None:
            self.fileType = "video"

        if self.fileUrl is None:
            raise ValueError("fileUrl is required")

        return self


class ProcessLessonResponse(BaseModel):
    status: str


class RetrieveRequest(BaseModel):
    query: str
    lessonId: str | None = None
    limit: int = 5


class RetrieveMatch(BaseModel):
    text: str | None = None
    sourceType: str | None = None
    sourceName: str | None = None
    timestamp: float | None = None
    page: int | None = None
    section: str | None = None
    score: float | None = None
    sourceHint: str | None = None


class RetrieveResponse(BaseModel):
    matches: list[RetrieveMatch]
