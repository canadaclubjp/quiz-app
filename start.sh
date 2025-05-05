#!/bin/bash
# Ensure the app directory has the necessary files
if [ ! -f /app/main.py ]; then
    cp /tmp/app/main.py /app/main.py
    cp /tmp/app/quiz.db /app/quiz.db
    cp /tmp/app/requirements.txt /app/requirements.txt
    # Add other files as needed (e.g., cp /tmp/app/database.py /app/database.py)
    chmod 664 /app/*
fi
# Install dependencies
pip install -r /app/requirements.txt
# Start the app
uvicorn main:app --host 0.0.0.0 --port 80