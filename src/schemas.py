from pydantic import BaseModel
from typing import List, Optional

class QuestionCreate(BaseModel):
    question_text: str
    options: Optional[List[str]] = None
    correct_answers: List[str]
    is_text_input: Optional[bool] = False
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    video_url: Optional[str] = None

class QuizCreate(BaseModel):
    title: str
    description: str
    questions: List[QuestionCreate]


class AnswerSubmission(BaseModel):
    student_number: str
    first_name_english: str
    last_name_english: str
    course_number: str
    answers: dict