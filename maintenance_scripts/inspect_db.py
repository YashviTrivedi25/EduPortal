from app import app, db
from models import Student, User
from timetable_model import ClassSchedule

with app.app_context():
    print("--- Students ---")
    students = Student.query.all()
    for s in students:
        print(f"ID: {s.id}, User: {s.user.full_name}, Batch: '{s.batch}'")

    print("\n--- Class Schedule Samples ---")
    schedules = ClassSchedule.query.limit(10).all()
    for sch in schedules:
        print(f"Day: '{sch.day_of_week}', Time: '{sch.time_slot}', Batch: '{sch.batch}', Subject: '{sch.subject}'")
    
    print("\n--- Total Schedules ---")
    print(ClassSchedule.query.count())
