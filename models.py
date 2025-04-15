from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import json
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String,  index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)  # Added


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, index=True)
    question_text = Column(Text)
    options = Column(Text, nullable=True)
    correct_answers = Column(Text)
    is_text_input = Column(Integer, default=0)
    image_url = Column(String, nullable=True)
    audio_url = Column(String, nullable=True)
    video_url = Column(String, nullable=True)



    def get_options(self):
        return json.loads(self.options) if self.options else None

    def get_correct_answers(self):
        return json.loads(self.correct_answers) if self.correct_answers else None

    def set_correct_answers(self, answers):
        self.correct_answers = json.dumps(answers)

class Score(Base):
    __tablename__ = "scores"
    id = Column(Integer, primary_key=True, index=True)
    student_number = Column(String, index=True)
    quiz_id = Column(Integer, index=True)
    score = Column(Integer)
    total_questions = Column(Integer)
    first_name = Column(String)
    last_name = Column(String)
    course_number = Column(String)