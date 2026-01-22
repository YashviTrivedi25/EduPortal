from flask import Blueprint, request, jsonify, make_response, send_file, render_template
from app import db, User, Student, Faculty, Course, Subject, Marks, Notification, Notice
import csv
import io
from datetime import datetime

# Define Blueprint
admin_exam_bp = Blueprint('admin_exam', __name__, url_prefix='/api/admin/exams')

# -------------------------------------------------------------------------
# NEW DATABASE MODELS
# -------------------------------------------------------------------------
# Since we cannot modify app.py, we define models here.
# NOTE: To create these tables, we need to import this module and run db.create_all() 
# in a context where app is active.

class ExamSchedule(db.Model):
    __tablename__ = 'exam_schedule'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False) # e.g., "Winter Semester Exams 2025"
    academic_year = db.Column(db.String(20), nullable=False)
    semester_type = db.Column(db.String(20), nullable=False) # 'odd' or 'even' or specific semester number
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ExamTimetable(db.Model):
    __tablename__ = 'exam_timetable'
    id = db.Column(db.Integer, primary_key=True)
    exam_schedule_id = db.Column(db.Integer, db.ForeignKey('exam_schedule.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    exam_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.String(10), nullable=False) # e.g. "10:00"
    end_time = db.Column(db.String(10), nullable=False)   # e.g. "13:00"
    room_number = db.Column(db.String(50), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.id')) # Invigilator
    
    # Relationships
    exam_schedule = db.relationship('ExamSchedule', backref=db.backref('timetable_entries', lazy=True))
    subject = db.relationship('Subject', backref='exam_entries')
    faculty = db.relationship('Faculty', backref='exam_duties')

# -------------------------------------------------------------------------
# HELPER FUNCTIONS
# -------------------------------------------------------------------------
def init_exam_db(app):
    """Helper to create tables defined in this module."""
    with app.app_context():
        db.create_all()
        print("Exam DB tables created.")

# -------------------------------------------------------------------------
# API ROUTES
# -------------------------------------------------------------------------

# UI Route (Served from admin.py)
@admin_exam_bp.route('/ui', methods=['GET'])
def exam_dashboard_ui():
    return render_template('exam-management.html')

# Fetch All Subjects (for dropdown)
@admin_exam_bp.route('/subjects', methods=['GET'])
def get_all_subjects():
    subjects = Subject.query.all()
    return jsonify([{
        'id': s.id,
        'code': s.subject_code,
        'name': s.subject_name
    } for s in subjects])

# 1. Create Exam Schedule
@admin_exam_bp.route('/schedule', methods=['POST'])
def create_exam_schedule():
    data = request.get_json()
    try:
        new_schedule = ExamSchedule(
            name=data['name'],
            academic_year=data['academic_year'],
            semester_type=data['semester_type'],
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        )
        
        if new_schedule.start_date > new_schedule.end_date:
            return jsonify({'error': 'Start date cannot be after end date'}), 400
        db.session.add(new_schedule)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Exam Schedule Created', 'id': new_schedule.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# 2. Add/Edit Timetable Entry (includes Room, Faculty Assignment)
@admin_exam_bp.route('/timetable', methods=['POST'])
def manage_timetable():
    data = request.get_json()
    # Support bulk or single entry
    entries = data if isinstance(data, list) else [data]
    
    results = []
    try:
        for entry in entries:
            # Check if entry exists for this subject in this schedule to update it
            existing = None
            if 'id' in entry:
                existing = ExamTimetable.query.get(entry['id'])
            
            if existing:
                # Update
                if 'exam_date' in entry: existing.exam_date = datetime.strptime(entry['exam_date'], '%Y-%m-%d').date()
                if 'start_time' in entry: existing.start_time = entry['start_time']
                if 'end_time' in entry: existing.end_time = entry['end_time']
                if 'room_number' in entry: existing.room_number = entry['room_number']
                if 'faculty_id' in entry: existing.faculty_id = entry['faculty_id']
                results.append({'id': existing.id, 'status': 'updated'})
            else:
                # Create
                new_entry = ExamTimetable(
                    exam_schedule_id=entry['exam_schedule_id'],
                    subject_id=entry['subject_id'],
                    exam_date=datetime.strptime(entry['exam_date'], '%Y-%m-%d').date(),
                    start_time=entry['start_time'],
                    end_time=entry['end_time'],
                    room_number=entry['room_number'],
                    faculty_id=entry.get('faculty_id')
                )
                
                # Validate date validation
                schedule = ExamSchedule.query.get(new_entry.exam_schedule_id)
                if not (schedule.start_date <= new_entry.exam_date <= schedule.end_date):
                     return jsonify({'error': f'Exam date {new_entry.exam_date} is outside schedule range ({schedule.start_date} to {schedule.end_date})'}), 400
                     
                db.session.add(new_entry)
                db.session.flush() # to get id
                results.append({'id': new_entry.id, 'status': 'created'})
        
        db.session.commit()
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Fetch Timetable
@admin_exam_bp.route('/timetable/<int:schedule_id>', methods=['GET'])
def get_timetable(schedule_id):
    entries = ExamTimetable.query.filter_by(exam_schedule_id=schedule_id).all()
    data = []
    for entry in entries:
        data.append({
            'id': entry.id,
            'subject_name': entry.subject.subject_name,
            'subject_code': entry.subject.subject_code,
            'exam_date': entry.exam_date.isoformat(),
            'start_time': entry.start_time,
            'end_time': entry.end_time,
            'room_number': entry.room_number,
            'faculty_name': entry.faculty.user.full_name if entry.faculty else "Unassigned"
        })
    return jsonify(data)


# 3. Publish & Share (Notify Students & Faculty)
@admin_exam_bp.route('/publish/<int:schedule_id>', methods=['POST'])
def publish_schedule(schedule_id):
    schedule = ExamSchedule.query.get_or_404(schedule_id)
    
    try:
        schedule.is_published = True
        
        # 1. Notify Assigned Faculty
        timetable_entries = ExamTimetable.query.filter_by(exam_schedule_id=schedule.id).all()
        faculty_ids = set([t.faculty_id for t in timetable_entries if t.faculty_id])
        
        for fid in faculty_ids:
            faculty = Faculty.query.get(fid)
            if faculty:
                notif = Notification(
                    user_id=faculty.user_id,
                    title=f"Exam Duty Assigned: {schedule.name}",
                    message=f"You have been assigned exam duties for {schedule.name}. Please check your dashboard.",
                    notification_type="exam_duty"
                )
                db.session.add(notif)
        
        # 2. Notify Students (Naive approach: Notify ALL students or filter by sem)
        # Assuming schedule.semester_type might map to student.current_semester if integer
        # But for now, general notification
        
        # Optimization: Create ONE generic notice instead of N notifications for students, 
        # unless 'Notification' table is strictly per-user. 
        # The schema has 'user_id', so it is per user. 
        # Creating thousands of rows might be slow. 
        # Alternative: Create a global Notice (which we have in app.py).
        
        notice = db.Model.metadata.tables['notice'] # accessing Notice table dynamically or import class
        # We imported Notice class
        
        new_notice = Notice(
            title=f"Exam Schedule Published: {schedule.name}",
            content=f"The exam schedule for {schedule.name} has been released. Please check the exam section.",
            notice_type="exam",
            target_audience="all", # or filter
            created_by=1, # Admin
            created_at=datetime.utcnow()
        )
        db.session.add(new_notice)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Schedule Published and Notifications Sent'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# 4. Re-candidate List (Students who failed or absent)
@admin_exam_bp.route('/re-candidates', methods=['GET'])
def get_re_candidates():
    # Criteria: Marks < 40% of Max Marks OR Absent (not in Marks table? or flag?)
    # Assuming 'Marks' table entry exists for appeared.
    # If not exists, maybe they didn't enroll?
    # Let's focus on: Entry exists AND (marks < passing OR specific fail flag)
    
    try:
        passing_percentage = 40.0
        
        # Query marks where obtained < 40% of max
        # We need to compute percentage in SQL or fetch and filter.
        # SQLAlchemy hybrid property or expression.
        
        # Simply:
        failed_marks = Marks.query.filter(
            (Marks.marks_obtained / Marks.max_marks * 100) < passing_percentage
        ).all()
        
        result = []
        for mark in failed_marks:
            student = mark.student
            subject = mark.subject
            
            result.append({
                'student_name': student.user.full_name,
                'roll_number': student.roll_number,
                'subject_name': subject.subject_name,
                'subject_code': subject.subject_code,
                'marks_obtained': mark.marks_obtained,
                'max_marks': mark.max_marks,
                'percentage': round((mark.marks_obtained/mark.max_marks)*100, 2),
                'status': 'Failed'
            })
            
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 5. Export Result to Excel (CSV)
@admin_exam_bp.route('/results/export', methods=['GET'])
def export_results():
    try:
        # Get optional filters
        semester = request.args.get('semester')
        department = request.args.get('department')
        
        query = db.session.query(Marks, Student, Subject).join(Student).join(Subject)
        
        if semester:
            query = query.filter(Marks.semester == semester)
        # If department is in Student branch or User department
        # Student.branch is department name usually
        if department:
            query = query.filter(Student.branch == department)
            
        records = query.all()
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['Roll Number', 'Student Name', 'Branch', 'Semester', 'Subject Code', 'Subject Name', 'Marks Obtained', 'Max Marks', 'Percentage', 'Exam Type'])
        
        for mark, student, subject in records:
            percentage = (mark.marks_obtained / mark.max_marks) * 100 if mark.max_marks > 0 else 0
            writer.writerow([
                student.roll_number,
                student.user.full_name,
                student.branch,
                mark.semester,
                subject.subject_code,
                subject.subject_name,
                mark.marks_obtained,
                mark.max_marks,
                f"{percentage:.2f}%",
                mark.exam_type
            ])
            
        # Prepare response
        output.seek(0)
        
        return make_response(output.getvalue(), 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=exam_results.csv'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    from app import app
    # Register the blueprint
    app.register_blueprint(admin_exam_bp)
    
    # Initialize DB (create new tables)
    init_exam_db(app)
    
    print("Running Application with Examination Management Module enabled...")
    app.run(debug=True, port=5001)
