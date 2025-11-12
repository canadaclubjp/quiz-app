# Use an official Python runtime as a parent image
FROM python:3.10

# Set the working directory
WORKDIR /app

# Install sqlite3
#RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*


COPY main.py .
COPY database.py .
COPY models.py .
COPY requirements.txt .
COPY quiz.db /data/quiz.db

RUN pip install --no-cache-dir -r requirements.txt


# Make port 80 available
EXPOSE 80

# Run the app using start.sh
#CMD ["app/start.sh"]

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]