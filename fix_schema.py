from app import app, db
from sqlalchemy import text

def fix_schema():
    print("Checking database schema...")
    with app.app_context():
        with db.engine.connect() as conn:
            # Helper to add column
            def add_column(table, column, dtype):
                try:
                    conn.execute(text(f"SELECT {column} FROM {table} LIMIT 1"))
                    print(f"Column '{column}' exists in '{table}'.")
                except:
                    print(f"Column '{column}' missing in '{table}'. Adding...")
                    try:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {dtype}"))
                        conn.commit()
                        print(f"Added '{column}' to '{table}'.")
                    except Exception as e:
                        print(f"Error adding '{column}': {e}")

            # Student Table potential missing columns
            add_column('student', 'division', 'VARCHAR(5)')
            add_column('student', 'batch', 'VARCHAR(10)')
            add_column('student', 'mentor', 'VARCHAR(100)')
            add_column('student', 'function', 'INTEGER DEFAULT 1')
            
            # Just in case check others
            add_column('student', 'admission_year', 'INTEGER DEFAULT 2023')
            add_column('student', 'cgpa', 'FLOAT DEFAULT 0.0')

            print("Schema check complete.")

if __name__ == '__main__':
    fix_schema()
