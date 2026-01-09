
import sys
import os
from werkzeug.security import generate_password_hash

# Add parent directory to path
sys.path.append(os.getcwd())

from app import app, db, User

def reset_password():
    with app.app_context():
        username = '24002170110137'
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User {username} NOT FOUND in database.")
            return
            
        new_password = 'Student@123'
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        print(f"SUCCESS: Password for {username} has been reset to '{new_password}'")

if __name__ == '__main__':
    reset_password()
