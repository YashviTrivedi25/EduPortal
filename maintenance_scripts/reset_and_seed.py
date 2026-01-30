import sys
import os

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import app, db
from models import Timetable
from scripts.seed_timetable import seed_timetable

def reset_and_seed():
    with app.app_context():
        print("Dropping Timetable table...")
        Timetable.__table__.drop(db.engine, checkfirst=True)
        print("Creating all tables (will create Timetable with new schema)...")
        db.create_all()
        print("Schema updated.")
        
        print("Running Seeder...")
        seed_timetable()
        print("Done.")

if __name__ == "__main__":
    reset_and_seed()
