# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Install sqlite3
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# Copy all project files (including main.py, quiz.db, start.sh, etc.)
COPY . .

RUN pip install --no-cache-dir -r requirements.txt


# Ensure start.sh is executable
RUN chmod +x /app/start.sh

# Make port 80 available
EXPOSE 80

# Debug: List files before running start.sh
RUN ls -l /app

# Run the app using start.sh
CMD ["app/start.sh"]