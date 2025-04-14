from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

#  Database URL
SQLALCHEMY_DATABASE_URL = "sqlite:////Users/arlen/PycharmProjects/university tests/quiz-frontend/quiz.db"
logger.info("Creating engine")
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
logger.info("Creating SessionLocal")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
logger.info(f"SessionLocal initialized: {SessionLocal}")
Base = declarative_base()


def init_db():
    logger.info("init_db called - already initialized at module level")
