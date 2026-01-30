
import sqlite3
import os

def migrate_db():
    db_path = 'instance/eduportal.db'
    if not os.path.exists(db_path):
        print("Database not found.")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    try:
        # Add query_type column
        c.execute("ALTER TABLE query_thread ADD COLUMN query_type VARCHAR(20) DEFAULT 'academic'")
        print("Added query_type column.")
    except Exception as e:
        print(f"Column query_type might already exist: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate_db()
