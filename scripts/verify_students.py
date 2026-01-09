
import sys
import os
sys.path.append(os.getcwd())

from app import app, db, User, Student

def verify_students():
    with app.app_context():
        student_count = Student.query.count()
        user_count = User.query.filter_by(role='student').count()
        
        print(f"Total Students in DB: {student_count}")
        print(f"Total Student Users in DB: {user_count}")
        
        # List first 10 students
        print("\n--- First 10 Students ---")
        students = Student.query.limit(10).all()
        for s in students:
            print(f"ID: {s.id}, Enr: '{s.enrollment_number}', Name: {s.user.full_name}, Roll: {s.roll_number}")


if __name__ == "__main__":
    verify_students()
