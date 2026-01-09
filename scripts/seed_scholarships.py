
import sys
import os
sys.path.append(os.getcwd())
from app import app, db, Scholarship
from datetime import datetime, date

def seed_scholarships():
    with app.app_context():
        # Clear existing scholarships
        try:
            initial_count = db.session.query(Scholarship).count()
            print(f"Initial count: {initial_count}")
            db.session.query(Scholarship).delete()
            db.session.commit()
            post_delete_count = db.session.query(Scholarship).count()
            print(f"Cleared existing scholarships. New count: {post_delete_count}")
        except Exception as e:
            print(f"Error clearing table: {e}")
            db.session.rollback()

        scholarships = [
            Scholarship(
                name="Reliance Foundation Undergraduate Scholarship",
                description="Supports meritorious students from all corners of India with a focus on merit-cum-means. Provides up to ₹2 Lakhs over the duration of the degree.",
                category="Merit-cum-Means",
                eligibility_criteria="Passed Std 12 with min 60%. Enrolled in 1st year regular full-time degree. Family income < ₹15 Lakhs.",
                min_cgpa=6.0,  # Equivalent to 60% approx
                max_family_income=1500000.0,
                eligible_categories="all",
                eligible_genders="all",
                amount=200000.0,
                deadline=date(2025, 10, 15),
                official_website="https://www.reliancefoundation.org/our-work/education/scholarships",
                is_active=True
            ),
            Scholarship(
                name="SBI Platinum Jubilee Asha Scholarship",
                description="An initiative by SBI Foundation to provide financial assistance to meritorious students from low-income families to ensure continuity of their education.",
                category="Need-Based",
                eligibility_criteria="Min 75% in previous class. Family income < ₹3 Lakhs. Open to all undergraduate courses.",
                min_cgpa=7.5,
                max_family_income=300000.0,
                eligible_categories="all",
                eligible_genders="all",
                amount=50000.0,
                deadline=date(2025, 11, 30),
                official_website="https://www.sbifoundation.in/asha-scholarship",
                is_active=True
            ),
            Scholarship(
                name="Bharti Airtel Scholarship Program",
                description="Focuses on supporting students in technology and engineering fields, especially girl students, to become future leaders.",
                category="Merit-Based",
                eligibility_criteria="Confirmed admission in 1st year UG in engineering/tech. Family income < ₹8.5 Lakhs. Preference for girl students.",
                min_cgpa=0.0, # Admission based
                max_family_income=850000.0,
                eligible_categories="all",
                eligible_genders="female,all", # Technically open but preference to female, marking all for wider reach but description clarifies
                amount=100000.0, # Varies, putting placeholder
                deadline=date(2025, 8, 31),
                official_website="https://bhartifoundation.org/education/scholarship-program/",
                is_active=True
            ),
            Scholarship(
                name="HDFC Bank Parivartan ECSS Programme",
                description="Aims to support meritorious and needy students belonging to underprivileged sections of society.",
                category="Merit-cum-Need",
                eligibility_criteria="Passed previous exam with min 55%. Family income < ₹2.5 Lakhs.",
                min_cgpa=5.5,
                max_family_income=250000.0,
                eligible_categories="all",
                eligible_genders="all",
                amount=75000.0,
                deadline=date(2025, 9, 30),
                official_website="https://www.hdfcbank.com/personal/borrow/popular-loans/educational-loan/educational-crisis-scholarship-support",
                is_active=True
            ),
            Scholarship(
                name="Post Matric Scholarships Scheme for Minorities",
                description="Government of India scheme to encourage minority communities to send their children to school/college.",
                category="Minority",
                eligibility_criteria="Min 50% marks in previous final exam. Annual family income < ₹2 Lakhs. Minority community (Muslim, Christian, Sikh, Buddhist, Jain, Parsi).",
                min_cgpa=5.0,
                max_family_income=200000.0,
                eligible_categories="minority",
                eligible_genders="all",
                amount=10000.0, # Varies
                deadline=date(2025, 11, 15),
                official_website="https://scholarships.gov.in/",
                is_active=True
            )
        ]

        try:
            db.session.add_all(scholarships)
            db.session.commit()
            print(f"Successfully added {len(scholarships)} new scholarships.")
        except Exception as e:
            print(f"Error adding scholarships: {e}")
            db.session.rollback()

if __name__ == "__main__":
    seed_scholarships()
