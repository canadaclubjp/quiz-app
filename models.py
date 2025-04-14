from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import json
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True)
    title = Column(String)
    description = Column(String)
    created_at = Column(DateTime, nullable=False, server_default=func.now())  # Added
    questions = relationship("Question", back_populates="quiz")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question_text = Column(String)
    options = Column(String)
    correct_answers = Column(String)
    is_text_input = Column(Boolean)
    image_url = Column(String)
    audio_url = Column(String)
    video_url = Column(String)
    quiz = relationship("Quiz", back_populates="questions")


    def get_options(self):
        return json.loads(self.options) if self.options else None

    def get_correct_answers(self):
        return json.loads(self.correct_answers) if self.correct_answers else None

    def set_correct_answers(self, answers):
        self.correct_answers = json.dumps(answers)

class Score(Base):
    __tablename__ = "scores"
    id = Column(Integer, primary_key=True)
    student_number = Column(String)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    score = Column(Integer)
    total_questions = Column(Integer)
    first_name = Column(String)
    last_name = Column(String)
    course_number = Column(String)