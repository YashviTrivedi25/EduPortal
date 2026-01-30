from flask import Blueprint, render_template, jsonify, request
from app.models import Faculty, Timetable, QueryThread, Notification, QueryPost, QueryAttachment
from app.extensions import db
from datetime import datetime
from werkzeug.utils import secure_filename
import os
from flask import current_app

faculty_bp = Blueprint('faculty', __name__)

@faculty_bp.route('/faculty-dashboard')
def dashboard():
    return render_template('faculty-dashboard.html')

@faculty_bp.route('/api/faculty/timetable/<int:id_param>')
def get_faculty_timetable(id_param):
    faculty = Faculty.query.get(id_param)
    if not faculty:
        faculty = Faculty.query.filter_by(user_id=id_param).first()
        
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404

    current_academic_year = '2025-26'
    
    # Match by initials (assuming faculty_id stores initials like MGV)
    entries = Timetable.query.filter(
        Timetable.faculty_raw == faculty.faculty_id, 
        Timetable.academic_year == current_academic_year
    ).all()
    
    timetable = []
    day_map = {
        'MON': 'Monday', 'TUE': 'Tuesday', 'WED': 'Wednesday', 
        'THU': 'Thursday', 'FRI': 'Friday', 'SAT': 'Saturday', 'SUN': 'Sunday'
    }
    
    for entry in entries:
        raw_day = entry.day_of_week.upper()
        full_day = day_map.get(raw_day, entry.day_of_week.capitalize())
        
        timetable.append({
            'day': full_day,
            'time': entry.time_slot,
            'subject': entry.subject_raw,
            'division': entry.division if entry.division else 'All',
            'batch': entry.batch,
            'room': entry.room_number,
            'semester': entry.semester,
            'id': entry.id
        })
        
    return jsonify(timetable)

@faculty_bp.route('/api/faculty/by-subject')
def get_faculty_by_subject():
    subject = request.args.get('subject')
    if not subject:
        return jsonify([])
    
    faculty_list = Faculty.query.filter(Faculty.assigned_subjects.contains(subject)).all()
    
    result = []
    for f in faculty_list:
        result.append({
            'id': f.id,
            'name': f.user.full_name
        })
    return jsonify(result)

# --- Faculty Query System ---
@faculty_bp.route('/api/queries/faculty/<int:user_id>')
def get_faculty_queries(user_id):
    faculty = Faculty.query.filter_by(user_id=user_id).first()
    if not faculty:
        return jsonify([])
        
    threads = QueryThread.query.filter_by(faculty_id=faculty.id).order_by(
        (QueryThread.status == 'pending').desc(),
        QueryThread.updated_at.desc()
    ).all()
    
    result = []
    for t in threads:
        student = t.student
        result.append({
            'id': t.id,
            'title': t.title,
            'subject': t.subject_name,
            'status': t.status,
            'type': t.query_type,
            'student_name': student.user.full_name,
            'student_roll': student.roll_number,
            'updated_at': t.updated_at.strftime('%Y-%m-%d %H:%M'),
            'last_message': t.posts[-1].content[:50] + "..." if t.posts else ""
        })
    return jsonify(result)

# Query Thread Details (Shared logic, but exposed via this BP mostly for faculty context if needed, or stick to a shared 'queries_bp')
# We'll put common query routes in a shared place or just duplicate the endpoint for simplicity if there's no shared 'api' BP.
# Let's put common query operations in Student or create a 'common.py'. For now, placing specific ones here.

@faculty_bp.route('/api/queries/thread/<int:thread_id>')
def get_query_thread_details(thread_id):
    thread = QueryThread.query.get(thread_id)
    if not thread:
        return jsonify({'error': 'Thread not found'}), 404
        
    posts_data = []
    for p in thread.posts:
        atts = []
        for a in p.attachments:
            atts.append({
                'file_url': a.file_url,
                'file_name': a.file_name,
                'file_type': a.file_type
            })
            
        posts_data.append({
            'id': p.id,
            'author_name': p.author.full_name,
            'role': p.role,
            'content': p.content,
            'created_at': p.created_at.strftime('%Y-%m-%d %H:%M'),
            'attachments': atts
        })
        
    std = thread.student
    student_details = {
        'full_name': std.user.full_name,
        'enrollment': std.enrollment_number,
        'roll_number': std.roll_number,
        'branch': std.branch,
        'semester': std.current_semester
    }
        
    return jsonify({
        'id': thread.id,
        'title': thread.title,
        'subject': thread.subject_name,
        'status': thread.status,
        'type': getattr(thread, 'query_type', 'academic'),
        'faculty_id': thread.faculty_id,
        'faculty_name': thread.faculty.user.full_name if thread.faculty else "Unassigned",
        'posts': posts_data,
        'student_details': student_details
    })

@faculty_bp.route('/api/queries/<int:thread_id>/reply', methods=['POST'])
def reply_to_query(thread_id):
    if request.is_json:
        data = request.json
        user_id = data.get('user_id')
        role = data.get('role')
        content = data.get('content')
        status = data.get('status')
    else:
        data = request.form
        user_id = data.get('user_id')
        role = data.get('role')
        content = data.get('content')
        status = data.get('status')
    
    thread = QueryThread.query.get(thread_id)
    if not thread:
        return jsonify({'error': 'Thread not found'}), 404
        
    post = QueryPost(
        thread_id=thread.id,
        author_user_id=user_id,
        role=role,
        content=content
    )
    db.session.add(post)
    db.session.flush()
    
    file = request.files.get('file') if not request.is_json else None
    if file:
        filename = secure_filename(file.filename)
        upload_dir = os.path.join(current_app.root_path, 'static/uploads/queries')
        os.makedirs(upload_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        save_name = f"{timestamp}_{filename}"
        file.save(os.path.join(upload_dir, save_name))
        
        attachment = QueryAttachment(
            post_id=post.id,
            file_url=f"/static/uploads/queries/{save_name}",
            file_type=filename.split('.')[-1],
            file_name=filename
        )
        db.session.add(attachment)
    
    thread.updated_at = datetime.utcnow()
    if role == 'faculty':
        thread.status = status if status else 'answered'
        notif = Notification(
            user_id=thread.student.user_id,
            title="Query Update",
            message=f"Faculty replied to: {thread.title}",
            notification_type="query"
        )
        db.session.add(notif)
        
    elif role == 'student' and thread.status == 'answered':
         thread.status = 'clarification'
    
    db.session.commit()
    return jsonify({'success': True})

@faculty_bp.route('/api/queries/<int:thread_id>/resolve', methods=['POST'])
def resolve_query(thread_id):
    thread = QueryThread.query.get(thread_id)
    if not thread:
        return jsonify({'error': 'Thread not found'}), 404
    thread.status = 'resolved'
    thread.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True})
