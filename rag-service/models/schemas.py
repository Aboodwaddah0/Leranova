from pydantic import BaseModel, AnyHttpUrl


class ProcessLessonRequest(BaseModel):
    lessonId: str
    videoUrl: AnyHttpUrl
    organizationId: str


class ProcessLessonResponse(BaseModel):
    status: str
