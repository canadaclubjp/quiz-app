import os
import logging
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
import requests
from sqlalchemy.orm import Session
from starlette.responses import FileResponse

from database import SessionLocal, engine, init_db, Base
from models import Quiz, Question, Score
from pydantic import BaseModel
import json
from typing import List, Optional
from google.oauth2.service_account import Credentials
import gspread
from datetime import datetime
import random
import qrcode
from io import BytesIO
import time
from gspread.exceptions import APIError
import backoff
import logging
import pytz
import uvicorn  # Add uvicorn import for running the app


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("Starting main.py import")
logging.info(f"Credentials check: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')}")


# Google Sheets setup
try:
    logger.info("Loading credentials from environment variable")
    scope = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
    # Get the credentials JSON string from the environment variable
    creds_json_str = os.environ.get("REACT_APP_GOOGLE_CREDENTIALS")
    logger.info(f"Raw REACT_APP_GOOGLE_CREDENTIALS: {creds_json_str}")
    if not creds_json_str:
        raise ValueError("REACT_APP_GOOGLE_CREDENTIALS environment variable not set")
    try:
        creds = json.loads(creds_json_str)
        logger.info("Credentials JSON parsed")
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing credentials JSON: {str(e)}")
        raise

    # Authorize the Google client
    client = gspread.authorize(creds)
    logger.info("Google client authorized")
except Exception as e:
    logger.error(f"Failed to load Google credentials: {str(e)}")
    raise

# Open StudentData spreadsheet
try:
    logger.info("Opening StudentData spreadsheet")
    @backoff.on_exception(backoff.expo, APIError, max_tries=5, giveup=lambda e: e.response.status_code not in [429, 503])
    def open_student_data():
        return client.open_by_key("1Gic0RJBJNHReuj0n8jeQkDsaGV_c9X10i--_i2s2QMc")
    spreadsheet = open_student_data()
    logger.info("StudentData spreadsheet opened")
except Exception as e:
    logger.error(f"Failed to open StudentData spreadsheet: {str(e)}")
    raise

# Open QuizResults spreadsheet
try:
    logger.info("Opening QuizResults spreadsheet")
    @backoff.on_exception(backoff.expo, APIError, max_tries=5, giveup=lambda e: e.response.status_code not in [429, 503])
    def open_quiz_results():
        return client.open_by_key("10rPJkv4o9VSKlW5qObjav5FsDsvKLInmUBmofULCYcQ")
    quiz_spreadsheet = open_quiz_results()
    logger.info("QuizResults spreadsheet opened")
except Exception as e:
    logger.error(f"Failed to open QuizResults spreadsheet: {str(e)}")
    raise

logger.info("Initializing database")
try:
    init_db()
    logger.info("Database initialized")
except Exception as e:
    logger.error(f"Failed to initialize database: {str(e)}")
    raise

app = FastAPI()
logger.info("FastAPI app created")

# Add root route

@app.get("/test-log")  # Use this temporarily to test logging
async def test_log():
    logger.info("Test log endpoint triggered")
    return {"message": "Logged"}

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Quiz App API", "available_endpoints": [
        "/quizzes/",
        "/quiz/{quiz_id}",
        "/verify_student/",
        "/submit_quiz/{quiz_id}",
        "/add_quiz/",
        "/score/{user_id}/{quiz_id}",
        "/generate_qr/{quiz_id}/{course_number}"
    ]}

# Rest of your existing code (CORS, get_db, models, etc.) remains unchanged
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://quiz-frontend-frontend.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    logger.info(f"SessionLocal status: {SessionLocal}")
    if SessionLocal is None:
        logger.error("SessionLocal is None - this should not happen")
        raise Exception("SessionLocal not initialized")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class StudentVerification(BaseModel):
    student_number: str
    course_number: str

class ScoreCreate(BaseModel):
    user_id: str
    quiz_id: int
    score: int
    total_questions: int

class StudentData(BaseModel):
    firstName: str
    lastName: str
    studentNumber: str
    courseNumber: Optional[str] = None

class QuizSubmission(BaseModel):
    quiz_id: int
    answers: dict
    studentData: StudentData

class QuestionCreate(BaseModel):
    question_text: str
    options: Optional[List[str]] = None
    correct_answers: list[str]
    is_text_input: bool = False
    image_url: str = ""
    audio_url: str = ""
    video_url: str = ""

class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    questions: list[QuestionCreate]

class AnswerSubmission(BaseModel):
    student_number: str
    first_name_english: str
    last_name_english: str
    course_number: str
    answers: dict

class QuizUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    questions: Optional[list[QuestionCreate]] = None

# Log quiz submission to Google Sheets
def log_quiz_submission(student_number: str, course_number: str, first_name: str, last_name: str, quiz_id: int,
                        quiz_title: str, score: int, total: int):
    student_number = str(student_number).strip().replace(',', '').replace('\n', '')
    course_number = str(course_number).strip().replace(',', '').replace('\n', '')
    first_name = str(first_name).strip().replace(',', '').replace('\n', '')
    last_name = str(last_name).strip().replace(',', '').replace('\n', '')
    quiz_title = str(quiz_title).strip().replace(',', '').replace('\n', '')

    try:
        master_sheet = spreadsheet.worksheet("Quiz Responses")
        expected_header = ["Timestamp", "Student Number", "Course Number", "First Name", "Last Name",
                           "Quiz ID", "Quiz Title", "Score", "Total Questions"]
        current_header = master_sheet.row_values(1)
        if current_header != expected_header:
            logging.warning(f"Quiz Responses header mismatch: expected={expected_header}, found={current_header}")
    except gspread.WorksheetNotFound:
        master_sheet = spreadsheet.add_worksheet(title="Quiz Responses", rows=100, cols=10)
        master_sheet.append_row(expected_header)

    # Use JST timezone for timestamp
    jst_timezone = pytz.timezone('Asia/Tokyo')
    timestamp = datetime.now(jst_timezone).strftime("%Y-%m-%d %H:%M:%S")
    row = [timestamp, student_number, course_number, first_name, last_name,
           str(quiz_id), quiz_title, str(score), str(total)]
    logging.info(f"Appending to Quiz Responses: {row}")
    master_sheet.append_row(row)
    logging.info(f"Logged to Quiz Responses: {row}")

    course_sheet_name = course_number.lstrip('0')
    try:
        course_sheet = spreadsheet.worksheet(course_sheet_name)
        current_header = course_sheet.row_values(1)
        if current_header != expected_header:
            logging.warning(
                f"Course sheet {course_sheet_name} header mismatch: expected={expected_header}, found={current_header}")
    except gspread.WorksheetNotFound:
        course_sheet = spreadsheet.add_worksheet(title=course_sheet_name, rows=100, cols=10)
        course_sheet.append_row(expected_header)

    logging.info(f"Appending to course sheet {course_sheet_name}: {row}")
    course_sheet.append_row(row)
    logging.info(f"Logged to course sheet {course_sheet_name}: {row}")

def save_to_google_sheets(submission: AnswerSubmission, quiz_id: int, score: int, total: int):
    student_number = str(submission.student_number).strip().replace(',', '').replace('\n', '')
    first_name = str(submission.first_name_english).strip().replace(',', '').replace('\n', '')
    last_name = str(submission.last_name_english).strip().replace(',', '').replace('\n', '')
    course_number = str(submission.course_number).strip().replace(',', '').replace('\n', '')

    # Use JST timezone for timestamp
    jst_timezone = pytz.timezone('Asia/Tokyo')
    timestamp = datetime.now(jst_timezone).strftime("%Y-%m-%d %H:%M:%S")
    normalized_course = course_number.lstrip('0')
    answers_str = json.dumps(submission.answers)
    row = [timestamp, student_number, first_name, last_name, normalized_course,
           quiz_id, answers_str, score, total]

    expected_header = ["Timestamp", "StudentNumber", "FirstNameEnglish", "LastNameEnglish",
                       "CourseNumber", "QuizID", "Answers", "Score", "Total"]

    try:
        all_responses_sheet = quiz_spreadsheet.worksheet("AllQuizResponses")
        current_header = all_responses_sheet.row_values(1)
        if current_header != expected_header:
            logging.warning(f"AllQuizResponses header mismatch: expected={expected_header}, found={current_header}")
    except gspread.exceptions.WorksheetNotFound:
        all_responses_sheet = quiz_spreadsheet.add_worksheet(title="AllQuizResponses", rows=500, cols=9)
        all_responses_sheet.append_row(expected_header)

    logging.info(f"Appending to AllQuizResponses: {row}")
    all_responses_sheet.append_row(row)

    course_sheet_name = f"Course_{normalized_course}"
    try:
      course_sheet = quiz_spreadsheet.worksheet(course_sheet_name)
      current_header = course_sheet.row_values(1)
      if current_header != expected_header:
          logging.warning(
              f"Course_{course_sheet_name} header mismatch: expected={expected_header}, found={current_header}")
    except gspread.exceptions.WorksheetNotFound:
        course_sheet = quiz_spreadsheet.add_worksheet(title=course_sheet_name, rows=100, cols=9)
        course_sheet.append_row(expected_header)

    logging.info(f"Appending to Course_{course_sheet_name}: {row}")
    course_sheet.append_row(row)


# Replace one of your existing /test-log endpoints (you have two) with this:

@app.get("/test-log")
async def test_log(question_id: int = 53, db: Session = Depends(get_db)):
    try:
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            return {"error": f"Question {question_id} not found"}

        return {
            "message": "Debug info",
            "id": question.id,
            "question_text": question.question_text,
            "raw_correct_answers": question.correct_answers,
            "parsed_correct_answers": json.loads(question.correct_answers) if question.correct_answers else [],
            "options": json.loads(question.options) if question.options else [],
            "is_text_input": question.is_text_input
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/verify_student/")
async def verify_student(data: StudentVerification):
    sheet = spreadsheet.sheet1
    try:
        all_data = sheet.get_all_records()
        logging.info(f"Fetched {len(all_data)} records from Google Sheet")
        if not all_data:
            raise HTTPException(status_code=500, detail="No data found in Google Sheet")
        logging.info(f"Sheet headers: {list(all_data[0].keys())}")
        normalized_course = data.course_number.lstrip("0")
        for row in all_data:
            if (str(row["Student Number"]) == data.student_number and
                    str(row["Course Number"]) == normalized_course):
                logging.info(f"Student {data.student_number} verified for course {data.course_number}")
                return {"status": "valid", "message": "Student verified"}
        logging.warning(
            f"Student {data.student_number} not found for course {data.course_number} (normalized: {normalized_course})")
        raise HTTPException(status_code=403, detail="Invalid student number or course")
    except Exception as e:
        logging.error(f"Error verifying student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@app.get("/proxy_media/")
async def proxy_media(url: str):
    try:
        if "drive.google.com" in url and "uc?export=download" not in url:
            file_id = url.split("/d/")[1].split("/")[0] if "/d/" in url else url.split("id=")[1].split("&")[0]
            url = f"https://drive.google.com/uc?export=view&id={file_id}"
            logger.info(f"Proxying media from: {url}")
            response = requests.get(url, timeout=10, stream=True)
            response.raise_for_status()

            content_type = response.headers.get("Content-Type", "application/octet-stream")
            if "image" in content_type:
                media_type = content_type
            elif "audio" in content_type:
                media_type = "audio/mpeg"
            else:
                media_type = "application/octet-stream"

            logger.info(f"Media fetched: Content-Type={media_type}")
            return Response(
                content=response.content,
                media_type=media_type,
                headers={"Content-Disposition": "inline"}
            )
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch media: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch media: {str(e)}")

@app.get("/quizzes/")
async def read_quizzes(db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).all()
    return [{"id": q.id, "title": q.title, "description": q.description, "created_at": (q.created_at.strftime('%Y-%m-%d %H:%M:%S') if isinstance(q.created_at, datetime)
                else str(q.created_at).replace('T', ' ').replace('Z', '')
            )} for q in quizzes]

@app.get("/quiz/{quiz_id}")
async def get_quiz(quiz_id: int, student_number: str, course_number: str, db: Session = Depends(get_db)):
    sheet = spreadsheet.sheet1
    try:
        all_data = sheet.get_all_records()
        logging.info(f"Fetched {len(all_data)} records from Google Sheet for quiz load")
        normalized_course = course_number.lstrip("0")
        logging.info(f"Validating quiz load: student_number={student_number}, course_number={normalized_course}")
        student_valid = False
        for row in all_data:
            sheet_student = str(row.get("Student Number", "")).strip()
            sheet_course = str(row.get("Course Number", "")).strip()
            if (sheet_student == student_number and
                    sheet_course == normalized_course):
                student_valid = True
                logging.info(f"Match found: Sheet Student={sheet_student}, Course={sheet_course}")
                break
        if not student_valid:
            logging.warning(f"No match for student_number={student_number}, course_number={normalized_course}")
            raise HTTPException(status_code=403, detail="Invalid student number for this course")
    except Exception as e:
        logging.error(f"Error verifying student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to validate student: {str(e)}")

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    existing_score = db.query(Score).filter(
        Score.student_number == student_number,
        Score.quiz_id == quiz_id
    ).first()
    if existing_score:
        return {"message": "You have already taken this quiz.", "score": existing_score.score,
                "total": existing_score.total_questions}
    logger.info(f"Querying questions for quiz {quiz_id}")
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    logger.info(f"Raw questions from DB: {questions}")
    question_data = []

    for q in questions:
        options = json.loads(q.options) if q.options else []
        if not q.is_text_input:
            shuffled_options = [f"{chr(65 + i)}: {opt}" for i, opt in enumerate(random.sample(options, len(options)))]
        else:
            shuffled_options = options
        question_data.append({
            "id": q.id,
            "question_text": q.question_text,
            "options": shuffled_options,
            "is_text_input": q.is_text_input,
            "image_url": q.image_url,
            "audio_url": q.audio_url,
            "video_url": q.video_url
        })
    logger.info(f"Processed question data: {question_data}")
    return {
        "id": quiz.id,
        "title": quiz.title,
        "questions": question_data
    }

@app.get("/quiz_details/{quiz_id}")
def get_quiz_details(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "options": json.loads(q.options) if q.options else [],
                "correct_answers": json.loads(q.correct_answers) if q.correct_answers else [],
                "is_text_input": q.is_text_input,
                "image_url": q.image_url,
                "audio_url": q.audio_url,
                "video_url": q.video_url
            } for q in questions
        ]
    }

@app.put("/update_quiz/{quiz_id}")
async def update_quiz(quiz_id: int, quiz: QuizCreate, db: Session = Depends(get_db)):
    try:
        db_quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        logger.info(
            f"Updating quiz {quiz_id}: Found - {db_quiz.id if db_quiz else 'None'} - {db_quiz.title if db_quiz else 'Not found'}")
        if not db_quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        db_quiz.title = quiz.title
        db_quiz.description = quiz.description
        db.query(Question).filter(Question.quiz_id == quiz_id).delete()
        for q in quiz.questions:
            db_question = Question(
                quiz_id=quiz_id,
                question_text=q.question_text,
                options=json.dumps(q.options) if q.options else None,
                correct_answers=json.dumps(q.correct_answers),
                is_text_input=q.is_text_input,
                image_url=q.image_url,
                audio_url=q.audio_url,
                video_url=q.video_url
            )
            db.add(db_question)
        db.commit()
        logger.info(f"Quiz {quiz_id} updated successfully")
        return {"message": "Quiz updated successfully", "quiz_id": quiz_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update quiz: {str(e)}")

@app.delete("/delete_quiz/{quiz_id}")
async def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    try:
        db_quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        if not db_quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        db.query(Score).filter(Score.quiz_id == quiz_id).delete()
        db.query(Question).filter(Question.quiz_id == quiz_id).delete()
        db.delete(db_quiz)
        db.commit()
        logger.info(f"Quiz {quiz_id} deleted successfully")
        return {"message": "Quiz deleted successfully", "quiz_id": quiz_id}
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting quiz: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete quiz: {str(e)}")


@app.post("/submit_quiz/{quiz_id}")  # scoring endpoint
async def submit_quiz(quiz_id: int, submission: AnswerSubmission, db: Session = Depends(get_db)):
    sheet = spreadsheet.sheet1
    try:
        all_data = sheet.get_all_records()
        logging.info(f"Fetched {len(all_data)} records from Google Sheet for validation")
        normalized_course = submission.course_number.lstrip("0")
        logging.info(f"Validating: student_number={submission.student_number}, course_number={normalized_course}")
        student_valid = False
        for row in all_data:
            sheet_student = str(row.get("Student Number", "")).strip()
            sheet_course = str(row.get("Course Number", "")).strip()
            if (sheet_student == submission.student_number and
                    sheet_course == normalized_course):
                student_valid = True
                logging.info(f"Match found: Sheet Student={sheet_student}, Course={sheet_course}")
                break
        if not student_valid:
            logging.warning(
                f"No match for student_number={submission.student_number}, course_number={normalized_course}")
            raise HTTPException(status_code=403, detail="Invalid student number for this course")
    except Exception as e:
        logging.error(f"Error verifying student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to validate student: {str(e)}")

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    existing_score = db.query(Score).filter(
        Score.student_number == submission.student_number,
        Score.quiz_id == quiz_id
    ).first()
    if existing_score:
        return {"message": "You have already taken this quiz.", "score": existing_score.score,
                "total": existing_score.total_questions}

    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    total = len(questions)
    score = 0

    for q in questions:
        correct = json.loads(q.correct_answers) if q.correct_answers else []
        student_answer = submission.answers.get(str(q.id), [])

        # Enhanced logging
        logging.info(f"=== QUESTION {q.id} DEBUG ===")
        logging.info(f"Raw student_answer: {student_answer} (type: {type(student_answer)})")
        logging.info(f"Raw correct answers: {correct} (type: {type(correct)})")

        # Strip prefixes (e.g., "A:", "D:") from both student answers and correct answers
        def strip_prefix(answer):
            if isinstance(answer, str):
                for sep in [": ", ":"]:
                    if sep in answer:
                        return answer.split(sep, 1)[-1].strip()
            return answer.strip()

        # Process correct answers
        correct_cleaned = [strip_prefix(ans) for ans in correct]
        logging.info(f"Q{q.id}: Correct cleaned={correct_cleaned}")

        if q.is_text_input:
            if isinstance(student_answer, str):
                student_answer = student_answer
            elif isinstance(student_answer, list) and student_answer:
                student_answer = student_answer[0]
            else:
                student_answer = ""
            student_answer_cleaned = strip_prefix(student_answer)
            logging.info(f"Text answer cleaned: '{student_answer_cleaned}'")
            if student_answer_cleaned.lower() in [ans.lower() for ans in correct_cleaned]:
                score += 1
                logging.info(f"Q{q.id}: TEXT CORRECT - Score incremented to {score}")
            else:
                logging.info(f"Q{q.id}: TEXT INCORRECT")
        else:
            # Multiple choice processing - FIXED VERSION
            student_answer = student_answer if isinstance(student_answer, list) else []
            student_answer_cleaned = [strip_prefix(ans) for ans in student_answer]
            logging.info(f"MC answers cleaned: {student_answer_cleaned}")

            # Check if any student answer matches any correct answer
            match_found = any(student_ans in correct_cleaned for student_ans in student_answer_cleaned)

            if match_found:
                score += 1
                logging.info(f"Q{q.id}: MC CORRECT - Score incremented to {score}")
            else:
                logging.info(f"Q{q.id}: MC INCORRECT - Expected any of {correct_cleaned}, Got {student_answer_cleaned}")

        logging.info(f"=== END Q{q.id} DEBUG ===")

    try:
        db_score = Score(
            student_number=submission.student_number,
            quiz_id=quiz_id,
            score=score,
            total_questions=total,
            first_name=submission.first_name_english,
            last_name=submission.last_name_english,
            course_number=submission.course_number
        )
        db.add(db_score)
        db.commit()

        save_to_google_sheets(submission, quiz_id, score, total)
        log_quiz_submission(
            student_number=submission.student_number,
            course_number=submission.course_number,
            first_name=submission.first_name_english,
            last_name=submission.last_name_english,
            quiz_id=quiz_id,
            quiz_title=quiz.title,
            score=score,
            total=total
        )
        logger.info(f"Quiz {quiz_id} submitted by {submission.student_number}: {score}/{total}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving quiz submission: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save submission: {str(e)}")

    # return {"score": score, "total": total}
    return {  # use this only for debugging
        "score": score,
        "total": total,
        "debug": {
            "question_53_raw_correct": json.loads(db.query(Question).filter(Question.id == 53).first().correct_answers),
            "question_53_student_answer": submission.answers.get("53", []),
            "submission_answers": submission.answers
        }
    }


@app.post("/add_quiz/")
async def add_quiz(quiz: QuizCreate, db: Session = Depends(get_db)):
    try:
        # Validate input
        if not quiz.questions:
            raise HTTPException(status_code=400, detail="Quiz must have at least one question")
        for q in quiz.questions:
            if not q.correct_answers:
                raise HTTPException(status_code=400, detail="Each question must have at least one correct answer")
            if q.options and len(q.options) < 2:
                raise HTTPException(status_code=400, detail="Multiple-choice questions must have at least two options")

        # Create quiz but don't commit yet
        db_quiz = Quiz(title=quiz.title, description=quiz.description)
        db.add(db_quiz)
        db.flush()  # Flush to get the quiz ID, but don't commit

        # Add questions
        for q in quiz.questions:
            db_question = Question(
                quiz_id=db_quiz.id,
                question_text=q.question_text,
                options=json.dumps(q.options) if q.options else None,
                correct_answers=json.dumps(q.correct_answers),
                is_text_input=q.is_text_input,
                image_url=q.image_url,
                audio_url=q.audio_url,
                video_url=q.video_url
            )
            db.add(db_question)

        # Commit everything at once
        db.commit()
        db.refresh(db_quiz)
        logger.info(f"Quiz added successfully: {db_quiz.id}")
        return {"message": "Quiz added successfully", "quiz_id": db_quiz.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding quiz: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add quiz: {str(e)}")

@app.get("/score/{user_id}/{quiz_id}")
async def get_score(user_id: str, quiz_id: int, db: Session = Depends(get_db)):
    try:
        score = db.query(Score).filter_by(student_number=user_id, quiz_id=quiz_id).first()
        if not score:
            raise HTTPException(status_code=404, detail="Score not found")
        return {"score": score.score, "total": len(db.query(Question).filter(Question.quiz_id == quiz_id).all())}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.delete("/clear_scores/")
def clear_scores(db: Session = Depends(get_db)):
    db.query(Score).delete()
    db.commit()
    return {"message": "Scores cleared"}


@app.get("/generate_qr/{quiz_id}/{course_number}")
async def generate_qr(quiz_id: int, course_number: str, db: Session = Depends(get_db)):
    try:
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        course_number = course_number.strip().replace(',', '').replace('\n', '')
        if not course_number:
            raise HTTPException(status_code=400, detail="Invalid course number")
        base_url = "https://quiz-frontend-frontend.vercel.app"
        quiz_url = f"{base_url}/quiz?quizId={quiz_id}&courseNumber={course_number}"
        logger.info(f"Generating QR code for: {quiz_url}")
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(quiz_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="image/png",
            headers={"Content-Disposition": f"inline; filename=qr_quiz_{quiz_id}_{course_number}.png"}
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to generate QR code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate QR code: {str(e)}")


# Add this new endpoint to your main.py (anywhere after the app = FastAPI() line)

@app.post("/debug_scoring/{quiz_id}")
async def debug_scoring(quiz_id: int, submission: AnswerSubmission, db: Session = Depends(get_db)):
    """Debug endpoint to see exactly what's happening in scoring logic"""

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    debug_info = []
    score = 0

    for q in questions:
        correct = json.loads(q.correct_answers) if q.correct_answers else []
        student_answer = submission.answers.get(str(q.id), [])

        question_debug = {
            "question_id": q.id,
            "question_text": q.question_text,
            "is_text_input": q.is_text_input,
            "raw_student_answer": student_answer,
            "raw_student_type": str(type(student_answer)),
            "raw_correct_answers": correct,
            "raw_correct_type": str(type(correct))
        }

        # Strip prefixes function
        def strip_prefix(answer):
            if isinstance(answer, str):
                for sep in [": ", ":"]:
                    if sep in answer:
                        return answer.split(sep, 1)[-1].strip()
            return answer.strip()

        # Process correct answers
        correct_cleaned = [strip_prefix(ans) for ans in correct]
        question_debug["correct_cleaned"] = correct_cleaned

        if q.is_text_input:
            if isinstance(student_answer, str):
                student_answer_processed = student_answer
            elif isinstance(student_answer, list) and student_answer:
                student_answer_processed = student_answer[0]
            else:
                student_answer_processed = ""
            student_answer_cleaned = strip_prefix(student_answer_processed)
            question_debug["student_answer_cleaned"] = student_answer_cleaned
            question_debug["scoring_method"] = "text_input"

            # Check if correct
            is_correct = student_answer_cleaned.lower() in [ans.lower() for ans in correct_cleaned]
            question_debug["is_correct"] = is_correct
            question_debug["comparison_details"] = {
                "student_lower": student_answer_cleaned.lower(),
                "correct_lower": [ans.lower() for ans in correct_cleaned]
            }

            if is_correct:
                score += 1

        else:
            # Multiple choice
            student_answer = student_answer if isinstance(student_answer, list) else []
            student_answer_cleaned = [strip_prefix(ans) for ans in student_answer]
            question_debug["student_answer_cleaned"] = student_answer_cleaned
            question_debug["scoring_method"] = "multiple_choice"

            # Check each comparison
            comparisons = []
            match_found = False

            for student_ans in student_answer_cleaned:
                for correct_ans in correct_cleaned:
                    comparison = {
                        "student": student_ans,
                        "correct": correct_ans,
                        "equal": student_ans == correct_ans,
                        "student_repr": repr(student_ans),
                        "correct_repr": repr(correct_ans)
                    }
                    comparisons.append(comparison)
                    if student_ans == correct_ans:
                        match_found = True

            question_debug["comparisons"] = comparisons
            question_debug["is_correct"] = match_found

            if match_found:
                score += 1

        question_debug["points_awarded"] = 1 if question_debug["is_correct"] else 0
        debug_info.append(question_debug)

    return {
        "quiz_id": quiz_id,
        "quiz_title": quiz.title,
        "total_questions": len(questions),
        "final_score": score,
        "student_number": submission.student_number,
        "debug_details": debug_info
    }


# Add this simple endpoint to your main.py to check what's in the database

@app.get("/check_question/{question_id}")
async def check_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    return {
        "id": question.id,
        "question_text": question.question_text,
        "raw_correct_answers": question.correct_answers,
        "parsed_correct_answers": json.loads(question.correct_answers) if question.correct_answers else [],
        "options": json.loads(question.options) if question.options else [],
        "is_text_input": question.is_text_input
    }


# Also modify your submit_quiz endpoint to return debug info (replace the return statement at the end):
# Change this line at the end of submit_quiz:
# return {"score": score, "total": total}
#
# To this:
# return {
#     "score": score,
#     "total": total,
#     "debug_url": f"/debug_scoring/{quiz_id}",
#     "message": "Use the debug_url with the same submission data to see detailed scoring info"
# }

# Run the FastAPI app with uvicorn on 0.0.0.0:80
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=80)