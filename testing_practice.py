from database import SessionLocal
from models import Quiz
db = SessionLocal()
quizzes = db.query(Quiz).all()
for q in quizzes:
    print(f"ID: {q.id}, Title: {q.title}")
db.close()