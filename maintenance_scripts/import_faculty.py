from app import app, db
from models import User, Faculty, Timetable
from werkzeug.security import generate_password_hash

def import_faculty():
    with app.app_context():
        print("Starting Faculty Import...")

        # 1. Cleanup - Drop table to handle schema change (columns removed)
        try:
            print("Dropping Faculty table for schema update...")
            # Drop the table
            Faculty.__table__.drop(db.engine)
            print("Faculty table dropped.")
        except Exception as e:
            print(f"Table drop skipped (might not exist): {e}")

        # Re-create tables
        db.create_all()

        try:
            print("Cleaning up old Faculty users...")
            # Delete all Faculty users (orphaned users after table drop)
            deleted_users = User.query.filter_by(role='faculty').delete()
            db.session.commit()
            print(f"Cleanup Complete: Deleted {deleted_users} users.")
        except Exception as e:
            db.session.rollback()
            print(f"Error during cleanup: {e}")

        # 2. Extract Data from Timetable
        entries = Timetable.query.all()
        faculty_map = {}
        
        for entry in entries:
            f_init = entry.faculty_raw
            if not f_init: continue
            
            # Normalize to uppercase
            f_init = f_init.strip().upper()
            s_raw = entry.subject_raw
            
            # Map PYTHON-1 to FCSP-1
            if s_raw and s_raw.strip().upper() == 'PYTHON-1':
                s_raw = 'FCSP-1'
            
            if f_init not in faculty_map:
                faculty_map[f_init] = set()
            
            if s_raw:
                faculty_map[f_init].add(s_raw)

        print(f"Found {len(faculty_map)} unique faculty members in Timetable.")

        # 3. Create New Records
        count = 0
        default_password = generate_password_hash('Faculty@123')
        
        for initials, subjects in faculty_map.items():
            username = initials
            email = f"{initials.lower()}@college.edu"
            
            # Create User
            u = User(
                username=username,
                email=email,
                password_hash=default_password,
                role='faculty',
                full_name=f"Prof. {initials}",
                department="General"
            )
            db.session.add(u)
            db.session.commit() # Commit to get ID
            
            # Create Faculty Profile
            subj_str = ", ".join(sorted(subjects))
            
            f = Faculty(
                user_id=u.id,
                faculty_id=initials,
                assigned_subjects=subj_str,
                assigned_semesters="4"
            )
            db.session.add(f)
            db.session.commit()
            count += 1
            
        print(f"SUCCESS: Created {count} faculty accounts.")
            
        try:
            db.session.commit()
            print(f"SUCCESS: Created {len(faculty_map)} faculty accounts.")
            
            # Verify
            f_check = Faculty.query.first()
            if f_check:
                print(f"Sample: {f_check.user.full_name} | Subjects: {f_check.assigned_subjects} | Pass: Faculty@123")
                
        except Exception as e:
            db.session.rollback()
            print(f"Error saving faculty: {e}")

if __name__ == "__main__":
    import_faculty()
