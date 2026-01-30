import csv
import os
from app import app, db
from models import Timetable

def import_timetable():
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    files = ['timetable_div_a.csv', 'timetable_div_b.csv', 'timetable_div_c.csv']
    
    with app.app_context():
        # Drop table to enforce schema changes (removing columns)
        print("Dropping existing Timetable table...")
        try:
            Timetable.__table__.drop(db.engine)
            print("Table dropped.")
        except Exception as e:
            print(f"Table likely didn't exist or error: {e}")

        print("Creating table with new schema...")
        db.create_all()

        # Clear existing data to avoid duplicates (though dropping did this)
        print("Clearing existing Timetable data...")
        try:
            db.session.query(Timetable).delete()
            db.session.commit()
            print("Existing data cleared.")
        except Exception as e:
            db.session.rollback()
            print(f"Error clearing data: {e}")
            return

        total_records = 0
        
        for filename in files:
            file_path = os.path.join(data_dir, filename)
            if not os.path.exists(file_path):
                print(f"Warning: File {filename} not found, skipping.")
                continue

            division = filename.replace('timetable_div_', '').replace('.csv', '').upper()
            print(f"Processing {filename} (Division {division})...")
            
            try:
                with open(file_path, mode='r', encoding='utf-8-sig') as csvfile:
                    reader = csv.DictReader(csvfile)
                    
                    # Verify headers
                    expected_headers = ['Day', 'Start_Time', 'End_Time', 'Batch_ID', 'Subject', 'Faculty', 'Room_No']
                    headers = reader.fieldnames
                    
                    # Simple validation
                    if not all(h in headers for h in expected_headers if h != 'Table_Source'):
                        print(f"  Warning: Missing expected headers in {filename}. Found: {headers}")
                        # Proceeding anyway usually handles extra/missing cols gracefully if accessing by key
                    
                    records = []
                    for row in reader:
                        # Skip empty rows
                        if not row['Subject'] or not row['Day']:
                            continue
                            
                        # Construct Time Slot
                        start = row.get('Start_Time', '').strip()
                        end = row.get('End_Time', '').strip()
                        time_slot = f"{start} - {end}" if start and end else row.get('Start_Time', 'Unknown')

                        # Create object
                        entry = Timetable(
                            division=division,
                            batch=row.get('Batch_ID', 'ALL'),
                            day_of_week=row.get('Day', '').upper(),
                            time_slot=time_slot,
                            subject_raw=row.get('Subject', '').strip(),   # The 5th/6th col requested
                            faculty_raw=row.get('Faculty', '').strip(),   # The 6th/7th col requested
                            room_number=row.get('Room_No', '').strip(),
                            semester=4,
                            academic_year='2025-26'
                        )
                        records.append(entry)
                    
                    if records:
                        db.session.bulk_save_objects(records)
                        total_records += len(records)
                        print(f"  Added {len(records)} records from {filename}.")
                    
            except Exception as e:
                print(f"  Error processing {filename}: {e}")

        try:
            db.session.commit()
            print(f"SUCCESS: Imported {total_records} timetable entries total.")
        except Exception as e:
            db.session.rollback()
            print(f"Error saving to database: {e}")

if __name__ == "__main__":
    import_timetable()
