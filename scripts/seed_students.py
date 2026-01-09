
import sys
import os
import csv
import io
from werkzeug.security import generate_password_hash

# Add parent directory to path to import app and models
sys.path.append(os.getcwd())

from app import app, db, User, Student
from scripts.seed_data_part1 import data_part_1
from scripts.seed_data_part2 import data_part_2
from scripts.seed_data_part3 import data_part_3
from scripts.seed_data_part4 import data_part_4
from scripts.seed_data_part5 import data_part_5
from scripts.seed_data_part6 import data_part_6

def seed_students():
    print("Starting student seeding...")
    
    # Combine all data parts
    # Note: Part 1 has the header, others follow directly
    # Ensure newlines between parts if missing
    all_data = data_part_1.strip() + "\n" + data_part_2.strip() + "\n" + \
               data_part_3.strip() + "\n" + data_part_4.strip() + "\n" + \
               data_part_5.strip() + "\n" + data_part_6.strip()
    
    # Parse CSV
    f = io.StringIO(all_data)
    reader = csv.DictReader(f)
    
    with app.app_context():
        # Optional: Clear existing students/users?
        # For now, let's keep it safe and just add/update or maybe just add if not exists.
        # User said "Make this csv as the database", implying replacement.
        # But deleting all users might delete admin/faculty too.
        # Let's delete all students.
        
        print("Dropping Student table to apply schema changes...")
        try:
            Student.__table__.drop(db.engine)
        except Exception as e:
            print(f"Error dropping table (might not exist): {e}")
            
        print("Creating tables...")
        db.create_all()
        
        print("Clearing existing students...")
        try:
            # Table is fresh now, but User table needs clearing of student roles
            db.session.query(User).filter_by(role='student').delete()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error clearing data: {e}")
            return

        print("Inserting new students...")
        count = 0
        default_password_hash = generate_password_hash("Student@123")
        
        for row in reader:
            try:
                # Extract fields
                rank = row.get('RANK')
                # Skip header repeated lines if any (shouldn't be with DictReader and clean concat)
                if rank == 'RANK': 
                    continue
                
                enrollment_no = row.get('ENROLLMENT NO.')
                if not enrollment_no or enrollment_no.lower() == 'enrollment no.':
                    continue
                
                # Cleanup enrollment number (sometimes they have spaces or weird chars?)
                enrollment_no = enrollment_no.strip()
                
                student_name = row.get('STUDENT NAME', '').strip()
                if not student_name or student_name == '#VALUE!':
                    # Attempt to recover name if it's #VALUE! ? No, usually #VALUE! is in Rank.
                    # If name is empty, skip
                    pass
                
                # Handling #VALUE! or invalid rows
                # If enrollment number is valid numeric-ish string, proceed
                if not enrollment_no.isdigit():
                    # Some might be alphanumeric but usually pure digits
                    # If it looks like "Fees pending" in enrollment col? No, that was in Marks col usually.
                    # Let's trust the enrollment column mostly, but check length
                    if len(enrollment_no) < 5:
                        continue

                branch = row.get('BRANCH', '').strip()
                batch_div = row.get('BATCH/DIV', '').strip()
                roll_no = row.get('ROLL NO.', '').strip()
                mentor = row.get('MENTOR', '').strip()
                
                # Parse Division and Batch
                # Assumption: BATCH/DIV is like "A1" -> Div "A", Batch "A1" or "1"
                division = batch_div[0] if batch_div else None
                batch = batch_div
                
                # Generate Email
                # Remove spaces, to lowercase, add @gmail.com
                # Also handle dots or special chars if any
                clean_name = "".join(c for c in student_name if c.isalnum())
                email = f"{clean_name.lower()}@gmail.com"
                
                if not email or "@" not in email:
                    email = f"student{enrollment_no}@gmail.com"

                # Check for duplicate email in this batch?
                # User table constraint will catch it.
                # For simplicity, we assume names are unique enough or we don't care about email collision until db throws error.
                # Actually, duplicate names in CSV => duplicate emails.
                # Let's append enrollment last 4 digits to email to ensure uniqueness
                email = f"{clean_name.lower()}{enrollment_no[-4:]}@gmail.com"
                
                # Determine Admission Year
                # Enrollment 2400... -> 2024
                # Enrollment 2500... -> 2025
                admission_year = 2024 # Default
                if len(enrollment_no) >= 2:
                    prefix = enrollment_no[:2]
                    if prefix.isdigit():
                        admission_year = 2000 + int(prefix)

                # Create User
                user = User(
                    username=enrollment_no, # Unique ID
                    email=email,
                    password_hash=default_password_hash,
                    role='student',
                    full_name=student_name
                )
                db.session.add(user)
                db.session.flush() # Get user.id
                
                # Generate Unique Roll Number
                # Append last 4 digits of enrollment number to ensure uniqueness
                # roll_no from CSV is likely class roll no, not globally unique
                if roll_no:
                    unique_roll = f"{roll_no}-{enrollment_no[-4:]}"
                    # Truncate to 20 if needed (very unlikely)
                    unique_roll = unique_roll[:20]
                else:
                    unique_roll = f"R{enrollment_no[-10:]}" # Fallback
                
                # Create Student
                student = Student(
                    user_id=user.id,
                    roll_number=unique_roll,
                    enrollment_number=enrollment_no,
                    current_semester=2, # Default as requested
                    branch=branch,
                    division=division,
                    batch=batch,
                    mentor=mentor,
                    function=1, # is_active = 1
                    admission_year=admission_year, 
                    gender='Unknown', # Placeholder
                    category='General' # Placeholder
                )
                db.session.add(student)
                db.session.commit() # Commit each row to prevent batch rollback on error
                
                count += 1
                if count % 100 == 0:
                    print(f"Processed {count} students...")
                    
            except Exception as e:
                # print(f"Error processing row {row}: {e}")
                # Use a shorter error message to avoid cluttering logs
                # print(f"Skipping row due to error: {e}")
                db.session.rollback() 
                continue

        print(f"Successfully seeded {count} students.")

if __name__ == '__main__':
    seed_students()
