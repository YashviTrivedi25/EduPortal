from app import app, db
from models import ExamSchedule, Exam

with app.app_context():
    print("Creating database tables...")
    try:
        db.create_all()
        print("Tables created successfully.")
        
        # Verify
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print("Existing tables:", tables)
        
        if 'exam_schedule' in tables and 'exam' in tables:
            print("SUCCESS: Exam tables found.")
        else:
            print("FAILURE: Exam tables NOT found.")
            
    except Exception as e:
        print(f"Error: {e}")
