import sys
import os
import argparse
from datetime import datetime, date

# Add parent directory to path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db, Scholarship, Student, User

def show_stats():
    """Shows current counts of data in the database."""
    print("Loading application context...")
    with app.app_context():
        print("\n=== EduPortal Database Statistics ===")
        try:
            print(f"Users: {User.query.count()}")
            print(f"Students: {Student.query.count()}")
            
            scholarships = Scholarship.query.all()
            print(f"Scholarships: {len(scholarships)}")
            for s in scholarships:
                print(f"  - {s.name} (Cat: {s.category}, Amount: {s.amount})")
        except Exception as e:
            print(f"Error connecting to database: {e}")
            print("Make sure you are running this from the correct environment.")
        
        print("=====================================\n")

def seed_scholarships():
    """Seeds the database with initial scholarship data."""
    print("Seeding scholarships...")
    with app.app_context():
        # Clear existing
        try:
            num_deleted = db.session.query(Scholarship).delete()
            print(f"Cleared {num_deleted} existing scholarships.")
        except Exception as e:
            print(f"Error clearing table: {e}")
            return

        # Data derived from previous update_scholarships.py
        real_scholarships = [
            Scholarship(
                name="AICTE Pragati Scholarship for Girls",
                description="Scholarship Scheme for Girl Students (Technical Degree) by AICTE. Aimed at empowering girls with technical education.",
                category="merit",
                eligibility_criteria="Girl student admitted to 1st year of Degree level course. Family income < ₹8 Lakh/annum. Maximum 2 girls per family.",
                min_cgpa=0.0,
                max_family_income=800000,
                eligible_categories="all",
                eligible_genders="female",
                amount=50000,
                deadline=date(2025, 10, 31),
                official_website="https://www.aicte-india.org/schemes/students-development-schemes"
            ),
            Scholarship(
                name="AICTE Saksham Scholarship",
                description="For specially-abled students with disability of not less than 40%, pursuing technical education.",
                category="need",
                eligibility_criteria="Specially-abled student admitted to 1st year Degree. Family income < ₹8 Lakh/annum.",
                min_cgpa=0.0,
                max_family_income=800000,
                eligible_categories="all",
                eligible_genders="all",
                amount=50000,
                deadline=date(2025, 10, 31),
                official_website="https://www.aicte-india.org/schemes/students-development-schemes"
            ),
            Scholarship(
                name="HDFC Bank Parivartan's ECSS Programme",
                description="Educational Crisis Scholarship Support (ECSS) for students facing financial or personal crisis.",
                category="need",
                eligibility_criteria="Family income < ₹2.5 Lakh/annum. Students in UG/PG courses.",
                min_cgpa=5.5,
                max_family_income=250000,
                eligible_categories="all",
                eligible_genders="all",
                amount=75000,
                deadline=date(2025, 9, 30),
                official_website="https://www.hdfcbank.com/personal/need-help/educational-crisis-scholarship-support"
            ),
            Scholarship(
                name="FUE-Reliance Foundation Undergraduate Scholarship",
                description="A merit-cum-means scholarship for meritorious students from all corners of India.",
                category="merit",
                eligibility_criteria="Enrolled in 1st year UG. Family income < ₹15 Lakhs (preference < 2.5L). Aptitude test required.",
                min_cgpa=7.0,
                max_family_income=1500000,
                eligible_categories="all",
                eligible_genders="all",
                amount=200000,
                deadline=date(2025, 10, 15),
                official_website="https://www.reliancefoundation.org"
            ),
            Scholarship(
                name="Infosys Foundation STEM Stars",
                description="For girl students pursuing undergraduate STEM degrees.",
                category="merit",
                eligibility_criteria="Female students in 1st year Engineering/Medical/etc. Family income < ₹8 Lakh. Min 70% in 12th.",
                min_cgpa=0.0, 
                max_family_income=800000,
                eligible_categories="all",
                eligible_genders="female",
                amount=100000,
                deadline=date(2025, 11, 30),
                official_website="https://www.infosys.com/infosys-foundation.html"
            ),
            Scholarship(
                name="ONGC Scholarship for SC/ST Students",
                description="Exclusive scholarship for meritorious SC/ST students in Engineering, Geology, Geophysics, MBA.",
                category="minority",
                eligibility_criteria="SC/ST candidate. Family income < ₹4.5 Lakh. 1st year Engineering.",
                min_cgpa=6.0,
                max_family_income=450000,
                eligible_categories="sc,st",
                eligible_genders="all",
                amount=48000,
                deadline=date(2025, 10, 31),
                official_website="https://ongcindia.com"
            ),
            Scholarship(
                name="Post Matric Scholarship for OBC Students",
                description="Government of India scheme to provide financial assistance to OBC students.",
                category="minority",
                eligibility_criteria="OBC category. Family income < ₹2.5 Lakh.",
                min_cgpa=0.0,
                max_family_income=250000,
                eligible_categories="obc",
                eligible_genders="all",
                amount=15000,
                deadline=date(2025, 11, 15),
                official_website="https://scholarships.gov.in"
            )
        ]

        for s in real_scholarships:
            db.session.add(s)
        
        db.session.commit()
        print(f"Successfully added {len(real_scholarships)} scholarships.")

def main():
    parser = argparse.ArgumentParser(description="Manage EduPortal Data")
    parser.add_argument('--stats', action='store_true', help='Show database statistics')
    parser.add_argument('--seed', action='store_true', help='Reset and seed scholarship data')
    
    args = parser.parse_args()
    
    if args.stats:
        show_stats()
    elif args.seed:
        seed_scholarships()
    else:
        # Default behavior if no args: show help
        parser.print_help()

if __name__ == "__main__":
    main()
