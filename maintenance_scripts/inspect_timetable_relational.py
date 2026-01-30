from app import app, db
from models import Timetable

with app.app_context():
    count = Timetable.query.count()
    print(f"Total Relational Timetable Entries: {count}")
    
    if count > 0:
        entry = Timetable.query.first()
        print(f"Sample: {entry.day_of_week}, {entry.time_slot}, Batch: {entry.batch}, Subject: {entry.subject.subject_name if entry.subject else 'None'}")
