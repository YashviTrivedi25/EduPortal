
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.getcwd())

from app import app, db, Timetable, LectureSwapRequest, Course, Subject, Faculty

def upgrade_schema():
    with app.app_context():
        # Because we are in dev and Sqllite doesn't support easy ALTER TABLE for everything,
        # and we want to ensure clean state for timetable dev.
        # We will try to create the new table.
        # For Timetable, we added columns. 
        # Strategy: 
        # 1. Drop Timetable and LectureSwapRequest tables.
        # 2. Re-create them.
        
        print("Dropping Timetable and LectureSwapRequest tables...")
        try:
            LectureSwapRequest.__table__.drop(db.engine)
        except:
            pass
            
        try:
            Timetable.__table__.drop(db.engine)
        except:
            pass
            
        print("Creating new tables...")
        db.create_all()
        print("Schema update complete.")
        
        # Now let's seed a little bit of sample timetable data for testing
        seed_timetable()

def seed_timetable():
    # Sample logic similar to init_db but with new fields
    # Assuming Fac/Subj exist from previous seeds.
    print("Seeding sample timetable...")
    
    # Get a course and semester
    course = Course.query.filter_by(course_name='Computer Science Engineering').first()
    if not course:
        print("CSE Course not found, skipping seed.")
        return

    # Sample Faculty
    faculty = Faculty.query.first()
    
    # Sample Subject
    subject = Subject.query.first()
    
    if not faculty or not subject:
        print("Missing faculty or subject.")
        return
        
    # Add a sample entry for Div A, Batch A1
    entry = Timetable(
        course_id=course.id,
        semester=2, # As per students seeded
        day_of_week='monday',
        time_slot='09:00-10:00',
        subject_id=subject.id,
        faculty_id=faculty.id,
        room_number='302',
        academic_year='2025-26',
        division='A',
        batch='A1'
    )
    db.session.add(entry)
    
    # Add a sample entry for Div A (whole class)
    entry2 = Timetable(
        course_id=course.id,
        semester=2,
        day_of_week='monday',
        time_slot='10:00-11:00',
        subject_id=subject.id,
        faculty_id=faculty.id,
        room_number='302',
        academic_year='2025-26',
        division='A',
        batch=None # Whole class
    )
    db.session.add(entry2)
    
    db.session.commit()
    print("Sample timetable seeded.")

if __name__ == '__main__':
    upgrade_schema()
