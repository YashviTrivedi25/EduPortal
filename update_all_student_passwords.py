
import sys
import os
from werkzeug.security import generate_password_hash

# Add parent directory to path
sys.path.append(os.getcwd())

from app import app, db, User

def reset_all_student_passwords():
    with app.app_context():
        students = User.query.filter_by(role='student').all()
        
        if not students:
            print("No students found in database.")
            return
            
        print(f"Found {len(students)} students. Updating passwords...")
        
        new_password_hash = generate_password_hash('Student@123')
        
        count = 0
        for user in students:
            user.password_hash = new_password_hash
            count += 1
            if count % 50 == 0:
                print(f"Updated {count} students...")
        
        db.session.commit()
        print(f"SUCCESS: Updated passwords for all {count} students to 'Student@123'")

if __name__ == '__main__':
    reset_all_student_passwords()
