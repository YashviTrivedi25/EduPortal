from app import app, db
from admin import admin_exam_bp, init_exam_db

# Register the blueprint
app.register_blueprint(admin_exam_bp)

# Create the new tables defined in admin.py
print("Creating exam tables...")
init_exam_db(app)
print("Exam tables created.")

if __name__ == "__main__":
    print("Starting Test Server on port 5002...")
    app.run(debug=True, port=5002)
