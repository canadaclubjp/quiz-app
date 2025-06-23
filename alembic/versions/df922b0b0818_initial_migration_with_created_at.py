"""Initial migration with created_at

Revision ID: df922b0b0818
Revises: 
Create Date: 2025-04-08 21:05:34.614128

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'df922b0b0818'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'quizzes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('quiz_id', sa.Integer(), nullable=False),
        sa.Column('question_text', sa.String(), nullable=True),
        sa.Column('options', sa.String(), nullable=True),
        sa.Column('correct_answers', sa.String(), nullable=True),
        sa.Column('is_text_input', sa.Boolean(), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('audio_url', sa.String(), nullable=True),
        sa.Column('video_url', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'scores',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_number', sa.String(), nullable=True),
        sa.Column('quiz_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('total_questions', sa.Integer(), nullable=True),
        sa.Column('first_name', sa.String(), nullable=True),
        sa.Column('last_name', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id']),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('scores')
    op.drop_table('questions')
    op.drop_table('quizzes')
