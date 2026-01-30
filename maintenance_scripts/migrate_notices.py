from app import app, db
import sqlite3
import os

def migrate_notices():
    with app.app_context():
        # Using raw SQL for SQLite migration
        db_path = os.path.join(app.root_path, 'instance', 'eduportal.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create notice table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS notice (
            id INTEGER PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            content TEXT NOT NULL,
            created_by_user_id INTEGER NOT NULL,
            created_by_role VARCHAR(20) NOT NULL,
            visible_to VARCHAR(20) NOT NULL,
            target_branch VARCHAR(50),
            target_semester INTEGER,
            target_class_id VARCHAR(20),
            urgency VARCHAR(20) DEFAULT 'low',
            is_active BOOLEAN DEFAULT 1,
            publish_at DATETIME,
            expire_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by_user_id) REFERENCES user (id)
        );
        """
        
        print("Starting notice table migration...")
        try:
            cursor.execute(create_table_sql)
            print("Successfully created 'notice' table.")
        except sqlite3.Error as e:
            print(f"Error creating table: {e}")
                    
        conn.commit()
        conn.close()
        print("Migration completed.")

if __name__ == "__main__":
    migrate_notices()
