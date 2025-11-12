from locust import HttpUser, task, between
import random

class QuizUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def submit_quiz(self):
        # Randomize the student number for each simulated user
        student_number = str(100000 + random.randint(0, 899999))
        payload = {
            "student_number": student_number,
            "course_number": "22211",
            "first_name_english": "Test",
            "last_name_english": "User",
            "answers": {
                "1": "Arlen",
                "2": "pizza",
                "3": "206",
                "4": "66"
            }
        }
        self.client.post("/submit_quiz/1?admin=true", json=payload)
        with self.client.post("/submit_quiz/1", json=payload, catch_response=True) as response:
            print(response.status_code, response.text)