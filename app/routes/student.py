from flask import Blueprint, render_template, jsonify, request, session
from app.models import Student, Timetable, Club, ClubRequest, Notification, Scholarship, QueryThread, User, Faculty, QueryPost, QueryAttachment
from app.extensions import db
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from flask import current_app

student_bp = Blueprint('student', __name__)

@student_bp.route('/student-dashboard')
def dashboard():
    return render_template('student-dashboard.html')

@student_bp.route('/api/student/id-card/<int:student_id>')
def get_student_id_card(student_id):
    student = Student.query.get(student_id)
    if not student:
        student = Student.query.filter_by(user_id=student_id).first()
        
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    id_card_data = {
        'full_name': student.user.full_name,
        'roll_number': student.roll_number,
        'enrollment_number': student.enrollment_number,
        'branch': student.branch,
        'semester': student.current_semester,
        'admission_year': student.admission_year,
        'photo_url': 'https://via.placeholder.com/150x180',
        'valid_until': f"{student.admission_year + 4}-12-31"
    }
    return jsonify(id_card_data)

@student_bp.route('/api/student/timetable/<int:id_param>')
def get_student_timetable(id_param):
    student = Student.query.get(id_param)
    if not student:
        student = Student.query.filter_by(user_id=id_param).first()
        
    if not student or not student.batch:
        return jsonify([])
    
    current_academic_year = '2025-26'
    schedule = Timetable.query.filter(
        Timetable.batch == student.batch,
        Timetable.academic_year == current_academic_year
    ).order_by(Timetable.id).all()
    
    day_map = {
        'MON': 'Monday', 'TUE': 'Tuesday', 'WED': 'Wednesday', 
        'THU': 'Thursday', 'FRI': 'Friday', 'SAT': 'Saturday', 'SUN': 'Sunday'
    }

    result = []
    for entry in schedule:
        raw_day = entry.day_of_week.upper()
        full_day = day_map.get(raw_day, entry.day_of_week.capitalize())
        
        result.append({
            'day': full_day,
            'time': entry.time_slot,
            'subject': entry.subject_raw,
            'faculty': entry.faculty_raw,
            'room': entry.room_number,
            'type': "Lecture"
        })
    return jsonify(result)

@student_bp.route('/api/student/club/register', methods=['POST'])
def register_club():
    data = request.json
    student_id = data.get('student_id')
    club_id = data.get('club_id')
    
    if not student_id or not club_id:
        return jsonify({'error': 'Missing student_id or club_id'}), 400
        
    existing_request = ClubRequest.query.filter_by(student_id=student_id, club_id=club_id).first()
    if existing_request:
        return jsonify({'error': 'Request already exists', 'status': existing_request.status}), 400
        
    club = Club.query.get(club_id)
    student = Student.query.get(student_id)
    
    if not club or not student:
        return jsonify({'error': 'Club or Student not found'}), 404
        
    new_request = ClubRequest(
        student_id=student_id,
        club_id=club_id,
        status='pending'
    )
    db.session.add(new_request)
    
    coordinator_user_id = club.coordinator.user_id if club.coordinator else None
    if coordinator_user_id:
        notification = Notification(
            user_id=coordinator_user_id,
            title=f"New Club Registration: {club.name}",
            message=f"Student {student.user.full_name} ({student.roll_number}) has requested to join {club.name}.",
            notification_type='club_request'
        )
        db.session.add(notification)
    
    db.session.commit()
    return jsonify({'success': True, 'message': 'Registration requested successfully'})

@student_bp.route('/api/student/club-recommendations', methods=['POST'])
def recommend_clubs():
    try:
        data = request.get_json()
        user_interests = data.get('interests', [])
        
        if not user_interests:
            return jsonify([])

        all_clubs = Club.query.all()
        recommendations = []
        
        for club in all_clubs:
            if not club.interests:
                continue
            club_tags = [tag.strip().lower() for tag in club.interests.split(',')]
            match_count = 0
            matching_tags = []
            
            for interest in user_interests:
                interest_lower = interest.lower()
                for tag in club_tags:
                    if interest_lower == tag or interest_lower in tag or tag in interest_lower:
                        if tag not in matching_tags:
                            match_count += 1
                            matching_tags.append(tag)
            
            if match_count > 0:
                recommendations.append({
                    'club': {
                        'id': club.id,
                        'name': club.name,
                        'description': club.description,
                        'category': club.category,
                        'faculty_coordinator': 'Faculty Coordinator',
                        'contact_email': club.contact_email
                    },
                    'match_score': match_count,
                    'matching_interests': matching_tags
                })
        
        recommendations.sort(key=lambda x: x['match_score'], reverse=True)
        return jsonify(recommendations)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@student_bp.route('/api/student/memberships/<int:student_id>')
def get_student_memberships(student_id):
    memberships = ClubRequest.query.filter_by(student_id=student_id, status='approved').all()
    result = []
    for m in memberships:
        club = Club.query.get(m.club_id)
        if club:
            result.append({
                'id': club.id,
                'name': club.name,
                'category': club.category,
                'description': club.description,
                'role': 'Member',
                'joined_at': m.updated_at.strftime('%B %Y') if m.updated_at else 'N/A'
            })
    return jsonify(result)

@student_bp.route('/api/scholarships/eligible', methods=['POST'])
def get_eligible_scholarships():
    data = request.get_json()
    student_cgpa = data.get('cgpa', 0.0)
    family_income = data.get('family_income')
    category = data.get('category')
    gender = data.get('gender')
    
    scholarships = Scholarship.query.filter(Scholarship.is_active == True).all()
    eligible_scholarships = []
    
    for scholarship in scholarships:
        eligible = True
        
        if scholarship.min_cgpa > 0 and student_cgpa > 0 and student_cgpa < scholarship.min_cgpa:
            eligible = False
        
        if family_income is not None:
            try:
                income_val = float(family_income)
                if scholarship.max_family_income > 0 and income_val > scholarship.max_family_income:
                    eligible = False
            except ValueError:
                pass

        if category:
            eligible_cats = [c.strip().lower() for c in scholarship.eligible_categories.split(',')]
            if 'all' not in eligible_cats and category.lower() not in eligible_cats:
                eligible = False
        
        if gender:
            eligible_gens = [g.strip().lower() for g in scholarship.eligible_genders.split(',')]
            if 'all' not in eligible_gens and gender.lower() not in eligible_gens:
                eligible = False
        
        if eligible:
            eligible_scholarships.append({
                'id': scholarship.id,
                'name': scholarship.name,
                'description': scholarship.description,
                'category': scholarship.category,
                'amount': scholarship.amount,
                'deadline': scholarship.deadline.isoformat(),
                'official_website': scholarship.official_website,
                'eligible': True,
                'eligibility_criteria': scholarship.eligibility_criteria
            })
    
    return jsonify(eligible_scholarships)

# --- Student Queries ---
@student_bp.route('/api/queries/create', methods=['POST'])
def create_query():
    data = request.json
    try:
        student_id = data.get('student_id')
        title = data.get('title')
        content = data.get('content')
        query_type = data.get('query_type', 'academic') 
        subject_name = data.get('subject_name')
        faculty_id = data.get('faculty_id') 

        student = Student.query.get(student_id)
        if not student:
             student = Student.query.filter_by(user_id=student_id).first()
             if not student:
                 return jsonify({'error': 'Student not found'}), 404

        if query_type == 'mentorship':
            subject_name = 'Mentorship'
            mentor_name = student.mentor
            if not mentor_name:
                return jsonify({'error': 'No mentor assigned to your profile.'}), 400
            
            mentor_user = User.query.filter(User.full_name.ilike(f"%{mentor_name}%"), User.role=='faculty').first()
            if mentor_user and mentor_user.faculty:
                faculty_id = mentor_user.faculty.id
            else:
                 fallback_faculty = Faculty.query.first()
                 if fallback_faculty:
                     faculty_id = fallback_faculty.id

        else: # Academic
            if not subject_name:
                return jsonify({'error': 'Subject is required for academic queries'}), 400
            
            if not faculty_id:
                 potential_faculty = Faculty.query.filter(Faculty.assigned_subjects.contains(subject_name)).first()
                 if potential_faculty:
                     faculty_id = potential_faculty.id
        
        thread = QueryThread(
            student_id=student.id,
            faculty_id=faculty_id,
            subject_name=subject_name,
            title=title,
            status='pending',
            query_type=query_type
        )
        db.session.add(thread)
        db.session.flush()

        post = QueryPost(
            thread_id=thread.id,
            author_user_id=student.user_id,
            role='student',
            content=content
        )
        db.session.add(post)
        
        if faculty_id:
            faculty = Faculty.query.get(faculty_id)
            if faculty:
                notif = Notification(
                    user_id=faculty.user_id,
                    title=f"New {query_type.capitalize()} Query",
                    message=f"New query from {student.user.full_name}: {title}",
                    notification_type="query"
                )
                db.session.add(notif)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Query submitted', 'thread_id': thread.id})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@student_bp.route('/api/queries/student/<int:student_id>')
def get_student_queries(student_id):
    threads = QueryThread.query.filter_by(student_id=student_id).order_by(QueryThread.updated_at.desc()).all()
    result = []
    for t in threads:
        result.append({
            'id': t.id,
            'title': t.title,
            'subject': t.subject_name,
            'status': t.status,
            'type': t.query_type,
            'faculty_name': t.faculty.user.full_name if t.faculty else "Unassigned",
            'updated_at': t.updated_at.strftime('%Y-%m-%d %H:%M'),
            'last_message': t.posts[-1].content[:50] + "..." if t.posts else ""
        })
    return jsonify(result)
