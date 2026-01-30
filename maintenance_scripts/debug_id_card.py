
from app import app, db
from models import User, Student

def test_id_card_logic():
    with app.app_context():
        # Get a random student
        student = Student.query.first()
        if not student:
            print("No students found.")
            return

        print(f"Testing with Student ID: {student.id}, User ID: {student.user_id}")
        
        # Test 1: Direct Student ID lookup
        print("\n--- Test 1: Lookup by Student ID ---")
        s1 = Student.query.get(student.id)
        print(f"Result: {s1.user.full_name if s1 else 'None'}")

        # Test 2: Fallback User ID lookup (simulating the bug fix)
        print("\n--- Test 2: Lookup by User ID (Simulated Fallback) ---")
        # In the app, if we pass user_id to the route...
        # It tries .get(user_id) first.
        # Check if there is a student with ID == user_id
        collision = Student.query.get(student.user_id)
        if collision:
            print(f"WARNING: ID Collision! Student with PK {student.user_id} exists. This will block fallback.")
            print(f"Colliding Student: {collision.user.full_name}")
        else:
            print("No collision. Fallback logic should execute.")
            s2 = Student.query.filter_by(user_id=student.user_id).first()
            print(f"Result from fallback: {s2.user.full_name if s2 else 'None'}")
            
if __name__ == "__main__":
    test_id_card_logic()
