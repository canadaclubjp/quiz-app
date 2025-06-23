import gspread
from oauth2client.service_account import ServiceAccountCredentials
import os

scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
script_dir = os.path.dirname(os.path.abspath(__file__))
creds_path = os.path.join(script_dir, "credentials.json")
creds = ServiceAccountCredentials.from_json_keyfile_name(creds_path, scope)
client = gspread.authorize(creds)
sheet = client.open_by_key("1Gic0RJBJNHReuj0n8jeQkDsaGV_c9X10i--_i2s2QMc").sheet1

data = sheet.get_all_records()
print(f"Fetched {len(data)} records from 'Form Responses 1'")
if not data:
    print("No data found in the sheet!")
else:
    print("Student Number | Course Number | Raw Type")
    print("---------------------------------------")
    for row in data:
        student_num = row.get("Student Number", "N/A")
        course_num = row.get("Course Number", "N/A")
        student_type = type(student_num).__name__
        print(f"{student_num} | {course_num} | {student_type}")
    # Check with str() to handle type differences
    matches = [row for row in data if str(row["Student Number"]) == "1234567890"]
    if matches:
        for match in matches:
            print(f"Found match: Course Number = {match['Course Number']}")
    else:
        print("No match found for Student Number: 1234567890")