from app import app, db
from models import Student, User
import sqlite3
import os

def migrate_student_db():
    db_path = os.path.join(app.root_path, 'instance', 'eduportal.db')
    if not os.path.exists(db_path):
        # Try root dir if instance not found (default sqlalchemy path often relative)
        db_path = 'eduportal.db' 
        
    print(f"Connecting to database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Fetch existing data
    print("Fetching existing Student data...")
    try:
        # Get all columns from current schema
        cursor.execute("PRAGMA table_info(student)")
        columns = [info[1] for info in cursor.fetchall()]
        print(f"Current columns: {columns}")
        
        cursor.execute("SELECT * FROM student")
        rows = cursor.fetchall()
        print(f"Found {len(rows)} student records.")
        
        # Map data dicts {id: {col: val}}
        student_data = []
        for row in rows:
            record = dict(zip(columns, row))
            student_data.append(record)
            
    except Exception as e:
        print(f"Error reading existing data: {e}")
        return

    conn.close()

    # 2. Drop and Recreate Table via SQLAlchemy
    # This uses the NEW model definition which lacks the deleted columns
    with app.app_context():
        print("Dropping Student table...")
        try:
            Student.__table__.drop(db.engine)
            print("Table dropped.")
        except Exception as e:
            print(f"Drop failed: {e}")

        print("Recreating Student table with new schema...")
        db.create_all()
        
        # 3. Re-insert Data
        # We only take fields that exist in the new model
        print("Migrating data...")
        count = 0
        for data in student_data:
            try:
                # Extract only field that match the new model
                # Note: We can't set 'id' directly easily if it's autoincrement, but we SHOULD preserve it
                # to keep foreign keys (Attendance, Marks) valid.
                
                # Check which fields exist in new model
                # We can construct the object. SQLAlchemy allows setting 'id'.
                
                new_student = Student(
                    id=data.get('id'),
                    user_id=data.get('user_id'),
                    roll_number=data.get('roll_number'),
                    enrollment_number=data.get('enrollment_number'),
                    current_semester=data.get('current_semester', 2),
                    branch=data.get('branch'),
                    division=data.get('division'),
                    batch=data.get('batch'),
                    mentor=data.get('mentor'),
                    function=data.get('function', 1),
                    admission_year=data.get('admission_year')
                    # Removed: cgpa, photo_url, annual_income, etc.
                )
                
                db.session.add(new_student)
                count += 1
            except Exception as e:
                print(f"Skipping row {data.get('id')} due to error: {e}")
        
        try:
            db.session.commit()
            print(f"SUCCESS: Migrated {count} student records.")
        except Exception as e:
            db.session.rollback()
            print(f"Transaction failed: {e}")

if __name__ == "__main__":
    migrate_student_db()
