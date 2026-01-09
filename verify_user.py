
import sys
import os
from werkzeug.security import check_password_hash

# Add parent directory to path
sys.path.append(os.getcwd())

from app import app, User

def verify_user():
    with app.app_context():
        username = '24002171210167'
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User {username} NOT FOUND in database.")
            return
            
        print(f"User found: {user.username}")
        print(f"Email: {user.email}")
        print(f"Role: {user.role}")
        print(f"Full Name: {user.full_name}")
        
        # Check passwords
        passwords_to_try = ['Student@123', 'student123', 'admin123', '123456']
        found = False
        for pwd in passwords_to_try:
            if check_password_hash(user.password_hash, pwd):
                print(f"SUCCESS: Password is '{pwd}'")
                found = True
                break
        
        if not found:
            print("FAILURE: Password does not match any known defaults.")

if __name__ == '__main__':
    verify_user()
