
import sys
import os
sys.path.append(os.getcwd())
from app import app, db, Scholarship

def verify_scholarships():
    with app.app_context():
        scholarships = Scholarship.query.all()
        print(f"Found {len(scholarships)} scholarships.")
        for s in scholarships:
            print(f"- {s.name}")
            print(f"  Link: {s.official_website}")
            print(f"  Criteria: {s.eligibility_criteria.encode('ascii', 'ignore').decode('ascii')}")
            print("-" * 20)

if __name__ == "__main__":
    verify_scholarships()
