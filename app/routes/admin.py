from flask import Blueprint, render_template, jsonify, request, session
from app.models import User, Faculty, Student, Course, Notice, ExamSchedule, Exam, ExamTimetable
from app.extensions import db
from werkzeug.security import generate_password_hash
from datetime import datetime
from sqlalchemy import case, or_
import io
import csv
from flask import make_response

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin-dashboard')
def dashboard():
    return render_template('admin-dashboard.html')

@admin_bp.route('/api/admin/stats')
def get_admin_stats():
    total_students = Student.query.count()
    total_faculty = Faculty.query.count()
    total_courses = Course.query.count()
    return jsonify({
        'total_students': total_students,
        'total_faculty': total_faculty,
        'total_courses': total_courses,
        'total_fee_collection': 0 # Mock
    })

# --- Faculty Management ---
@admin_bp.route('/api/admin/faculty', methods=['GET'])
def get_all_faculty():
    faculty_list = Faculty.query.join(User).filter(User.is_active == True).all()
    result = []
    for f in faculty_list:
        result.append({
            'id': f.id,
            'faculty_id': f.faculty_id,
            'full_name': f.user.full_name,
            'email': f.user.email,
            'department': f.user.department,
            'designation': f.designation,
            'assigned_subjects': f.assigned_subjects,
        })
    return jsonify(result)

@admin_bp.route('/api/admin/faculty', methods=['POST'])
def add_faculty():
    data = request.get_json()
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
        
    username = data['email'].split('@')[0]
    if User.query.filter_by(username=username).first():
        import random
        username = f"{username}{random.randint(100, 999)}"
        
    try:
        user = User(
            username=username,
            email=data['email'],
            password_hash=generate_password_hash('faculty123'),
            role='faculty',
            full_name=data['full_name'],
            department=data['department']
        )
        db.session.add(user)
        db.session.flush()
        
        import random
        faculty_id = f"FAC{datetime.now().year}{random.randint(1000, 9999)}"
        
        faculty = Faculty(
            user_id=user.id,
            faculty_id=faculty_id,
            designation=data['designation'],
            experience_years=data.get('experience_years', 0),
            specialization=data.get('specialization', ''),
            assigned_semesters=data.get('assigned_semesters', ''),
            assigned_subjects=data.get('assigned_subjects', '')
        )
        db.session.add(faculty)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Faculty added successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/faculty/<int:id>', methods=['GET'])
def get_faculty_details(id):
    faculty = Faculty.query.get_or_404(id)
    return jsonify({
        'id': faculty.id,
        'full_name': faculty.user.full_name,
        'email': faculty.user.email,
        'department': faculty.user.department,
        'designation': faculty.designation,
        'experience_years': faculty.experience_years,
        'specialization': faculty.specialization,
        'assigned_subjects': faculty.assigned_subjects,
    })

@admin_bp.route('/api/admin/faculty/<int:id>', methods=['PUT'])
def update_faculty(id):
    faculty = Faculty.query.get_or_404(id)
    data = request.get_json()
    
    if 'full_name' in data: faculty.user.full_name = data['full_name']
    if 'designation' in data: faculty.designation = data['designation']
    if 'assigned_subjects' in data: faculty.assigned_subjects = data['assigned_subjects']
    
    db.session.commit()
    return jsonify({'success': True})

# --- Notices ---
@admin_bp.route('/api/notices', methods=['GET'])
def get_notices():
    role = request.args.get('role', 'student')
    query = Notice.query.filter(Notice.is_active == True)
    
    if role == 'student':
        query = query.filter(or_(Notice.visible_to == 'student', Notice.visible_to == 'both'))
    elif role == 'faculty':
        query = query.filter(or_(Notice.visible_to == 'faculty', Notice.visible_to == 'both'))
        
    urgency_order = case((Notice.urgency == 'urgent', 1), (Notice.urgency == 'moderate', 2), else_=3)
    notices = query.order_by(urgency_order, Notice.created_at.desc()).all()
    
    result = []
    for n in notices:
        result.append({
            'id': n.id,
            'title': n.title,
            'content': n.content,
            'notice_type': n.urgency,
            'created_at': n.created_at.isoformat(),
            'author': n.author.full_name if n.author else 'System',
        })
    return jsonify(result)

@admin_bp.route('/api/notices/publish', methods=['POST'])
def publish_notice():
    if 'user_id' not in session: return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    
    notice = Notice(
        title=data['title'],
        content=data['content'],
        created_by_user_id=session['user_id'],
        created_by_role=session['role'],
        visible_to=data['visible_to'],
        urgency=data.get('urgency', 'low')
    )
    db.session.add(notice)
    db.session.commit()
    return jsonify({'success': True})

# --- Exam Management (Integrated from admin.py) ---

@admin_bp.route('/ui', methods=['GET'])
def exam_dashboard_ui():
    return render_template('exam-management.html')

@admin_bp.route('/api/admin/exams/schedule', methods=['POST'])
def create_exam_schedule():
    data = request.get_json()
    schedule = ExamSchedule(
        name=data['name'],
        academic_year=data['academic_year'],
        semester_type=data['semester_type'],
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
        end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    )
    db.session.add(schedule)
    db.session.commit()
    return jsonify({'success': True, 'id': schedule.id})

@admin_bp.route('/api/admin/exams/timetable', methods=['POST'])
def manage_timetable():
    data = request.get_json()
    entries = data if isinstance(data, list) else [data]
    results = []
    for entry in entries:
        existing = ExamTimetable.query.get(entry.get('id')) if entry.get('id') else None
        if existing:
            # Update logic simplified for brevity
            pass
        else:
            new_entry = ExamTimetable(
                exam_schedule_id=entry['exam_schedule_id'],
                subject_id=entry['subject_id'],
                exam_date=datetime.strptime(entry['exam_date'], '%Y-%m-%d').date(),
                start_time=entry['start_time'],
                end_time=entry['end_time'],
                room_number=entry['room_number'],
                faculty_id=entry.get('faculty_id')
            )
            db.session.add(new_entry)
            results.append({'status': 'created'})
    
    db.session.commit()
    return jsonify({'success': True, 'results': results})

# --- Common / Clubs ---
@admin_bp.route('/api/clubs')
def get_clubs():
    # Publicly accessible, but maintained here or in common
    from app.models import Club
    clubs = Club.query.filter(Club.is_active == True).all()
    # ... logic ...
    return jsonify([{'id': c.id, 'name': c.name} for c in clubs])

@admin_bp.route('/api/common/subjects')
def get_common_subjects():
    from app.models import Timetable
    subjects = db.session.query(Timetable.subject_raw).distinct().all()
    subject_list = [s[0] for s in subjects if s[0]]
    return jsonify(sorted(subject_list))
