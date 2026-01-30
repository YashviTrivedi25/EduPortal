from app import app, db
from models import Student, Timetable

def debug_student_timetable(enrollment):
    with app.app_context():
        print(f"--- Debugging Timetable for Enrollment: {enrollment} ---")
        
        # 1. Find Student
        student = Student.query.filter_by(enrollment_number=enrollment).first()
        if not student:
            print(f"ERROR: Student with enrollment {enrollment} NOT FOUND.")
            return
            
        print(f"Student Found: ID={student.id}, Name={student.user.full_name}")
        print(f"Batch: '{student.batch}'")
        print(f"Semester: {student.current_semester}")
        
        if not student.batch:
            print("ERROR: Student has NO BATCH assigned. Timetable cannot be loaded.")
            return

        # 2. Check Timetable Entries
        entries = Timetable.query.filter_by(batch=student.batch).all()
        print(f"\nTimetable Entries for Batch '{student.batch}': {len(entries)}")
        
        if len(entries) == 0:
            print("WARNING: No timetable entries found for this batch.")
            # Check distinct batches in Timetable to see what IS available
            batches = db.session.query(Timetable.batch).distinct().all()
            print(f"Available Batches in Timetable: {[b[0] for b in batches]}")
        else:
            for i, entry in enumerate(entries[:5]):
                print(f"  {i+1}. Day={entry.day_of_week}, Time={entry.time_slot}, Subject={entry.subject_raw}")
            if len(entries) > 5:
                print(f"  ... and {len(entries)-5} more.")

if __name__ == "__main__":
    debug_student_timetable('24002170110137')
