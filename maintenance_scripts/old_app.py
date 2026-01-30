from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import os
from extensions import db

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///eduportal.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Database Models moved to models.py
from models import (
    User, Student, Faculty, Course, Club, ClubRequest,
    Timetable, Scholarship, Notification, Notice,
    ExamSchedule, Exam, QueryThread, QueryPost, QueryAttachment
)
from timetable_model import ClassSchedule

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/student-dashboard')
def student_dashboard():
    return render_template('student-dashboard.html')

@app.route('/faculty-dashboard')
def faculty_dashboard():
    return render_template('faculty-dashboard.html')

@app.route('/admin-dashboard')
def admin_dashboard():
    return render_template('admin-dashboard.html')

@app.route('/api/get_current_user/<int:user_id>')
def get_current_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    user_data = {
        'id': user.id,
        'username': user.username,
        'full_name': user.full_name,
        'role': user.role,
        'department': user.department
    }
    
    if user.role == 'student':
        student = Student.query.filter_by(user_id=user.id).first()
        if student:
            user_data.update({
                'student_id': student.id,
                'roll_number': student.roll_number,
                'enrollment_number': student.enrollment_number,
                'current_semester': student.current_semester,
                'branch': student.branch
            })
            
    return jsonify(user_data)

from flask import g
from itsdangerous import URLSafeTimedSerializer

# Add to global config or near top
s = URLSafeTimedSerializer(app.config['SECRET_KEY'])

def get_current_user_id():
    return g.get('user_id') or session.get('user_id')

@app.before_request
def load_user_from_token():
    token = request.headers.get('X-Auth-Token')
    if token:
        try:
            data = s.loads(token, max_age=86400) # Valid for 1 day
            g.user_id = data['user_id']
            g.role = data['role']
        except:
            # Invalid token, ignore (will rely on session or fail)
            pass

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    
    user = User.query.filter_by(username=username, role=role).first()
    
    if user and check_password_hash(user.password_hash, password):
        # Cookie Session (Legacy/Fallback)
        session['user_id'] = user.id
        session['role'] = user.role
        
        # Token Session (Multi-Tab Isolation)
        token = s.dumps({'user_id': user.id, 'role': user.role})
        
        # Get additional user data based on role
        user_data = {
            'id': user.id,
            'username': user.username,
            'full_name': user.full_name,
            'role': user.role,
            'department': user.department,
            'token': token # valid for session storage
        }
        
        if user.role == 'student':
            student = Student.query.filter_by(user_id=user.id).first()
            if student:
                user_data.update({
                    'student_id': student.id,
                    'roll_number': student.roll_number,
                    'enrollment_number': student.enrollment_number,
                    'current_semester': student.current_semester,
                    'branch': student.branch,
                    'batch': student.batch,
                    'mentor': student.mentor
                })
                
        elif user.role == 'faculty':
            faculty = Faculty.query.filter_by(user_id=user.id).first()
            if faculty:
                user_data.update({
                    'faculty_id': faculty.faculty_id,
                    'faculty_table_id': faculty.id,
                    'assigned_subjects': faculty.assigned_subjects
                })
        
        return jsonify({'success': True, 'user': user_data})
    
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401


# Events route removed


# Fee History route removed


# Student Queries route removed


@app.route('/api/student/id-card/<int:student_id>')
def get_student_id_card(student_id):
    student = Student.query.get(student_id)
    if not student:
        # Fallback: Try finding by user_id
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
        'photo_url': 'https://via.placeholder.com/150x180', # Default
        'blood_group': 'N/A',
        'emergency_contact': 'N/A',
        'address': 'N/A',
        'gender': 'N/A',
        'valid_until': f"{student.admission_year + 4}-12-31"
    }
    
    return jsonify(id_card_data)

@app.route('/api/clubs')
def get_clubs():
    clubs = Club.query.filter(Club.is_active == True).all()
    
    clubs_data = []
    for club in clubs:
        clubs_data.append({
            'id': club.id,
            'name': club.name,
            'description': club.description,
            'category': club.category,
            'interests': club.interests.split(',') if club.interests else [],
            'faculty_coordinator': club.coordinator.user.full_name if club.coordinator else None,
            'student_coordinator': club.student_coordinator,
            'meeting_schedule': club.meeting_schedule,
            'student_coordinator': club.student_coordinator,
            'meeting_schedule': club.meeting_schedule,
            'contact_email': club.contact_email,
            'instagram_link': club.instagram_link
        })
    
    return jsonify(clubs_data)

@app.route('/api/student/club/register', methods=['POST'])
def register_club():
    data = request.json
    student_id = data.get('student_id')
    club_id = data.get('club_id')
    
    if not student_id or not club_id:
        return jsonify({'error': 'Missing student_id or club_id'}), 400
        
    # Check if already registered
    existing_request = ClubRequest.query.filter_by(student_id=student_id, club_id=club_id).first()
    if existing_request:
        return jsonify({'error': 'Request already exists', 'status': existing_request.status}), 400
        
    club = Club.query.get(club_id)
    student = Student.query.get(student_id)
    
    if not club or not student:
        return jsonify({'error': 'Club or Student not found'}), 404
        
    # Create Request
    new_request = ClubRequest(
        student_id=student_id,
        club_id=club_id,
        status='pending'
    )
    db.session.add(new_request)
    
    # Notify Faculty Coordinator (or Default ClubHead if none)
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

@app.route('/api/student/club-recommendations', methods=['POST'])
def get_club_recommendations():
    data = request.get_json()
    student_interests = data.get('interests', [])
    
    # Get all clubs and calculate match score
    clubs = Club.query.filter(Club.is_active == True).all()
    recommendations = []
    
    for club in clubs:
        club_interests = club.interests.split(',') if club.interests else []
        match_score = len(set(student_interests) & set(club_interests))
        
        if match_score > 0:
            recommendations.append({
                'club': {
                    'id': club.id,
                    'name': club.name,
                    'description': club.description,
                    'category': club.category,
                    'faculty_coordinator': club.coordinator.user.full_name if club.coordinator else None,
                    'contact_email': club.contact_email,
                    'instagram_link': club.instagram_link
                },
                'match_score': match_score,
                'matching_interests': list(set(student_interests) & set(club_interests))
            })
    
    # Sort by match score
    recommendations.sort(key=lambda x: x['match_score'], reverse=True)
    
    return jsonify(recommendations)

@app.route('/api/student/timetable/<int:id_param>')
def get_student_timetable(id_param):
    # Try finding by Student ID (primary key) first (likely what frontend sends)
    student = Student.query.get(id_param)
    if not student:
        # Fallback: Try finding by User ID
        student = Student.query.filter_by(user_id=id_param).first()
        
    if not student or not student.batch:
        return jsonify([])
    
    current_academic_year = '2025-26'
    
    # Query the Relational Timetable Model directly (Subject table removed)
    schedule = Timetable.query.filter(
        Timetable.batch == student.batch,
        Timetable.academic_year == current_academic_year
    ).order_by(Timetable.id).all()
    
    # Map short days to full days
    day_map = {
        'MON': 'Monday', 'TUE': 'Tuesday', 'WED': 'Wednesday', 
        'THU': 'Thursday', 'FRI': 'Friday', 'SAT': 'Saturday',
        'SUN': 'Sunday'
    }

    result = []
    for entry in schedule:
        # Normalize day name
        raw_day = entry.day_of_week.upper() # e.g. MON
        full_day = day_map.get(raw_day, entry.day_of_week.capitalize())
        
        result.append({
            'day': full_day,
            'time': entry.time_slot,
            'subject': entry.subject_raw, # Used raw column
            'faculty': entry.faculty_raw, # Used raw column (or join Faculty if needed, but raw is safer if links broken)
            'room': entry.room_number,
            'type': "Lecture"
        })
    return jsonify(result)



@app.route('/api/scholarships/eligible', methods=['POST'])
def get_eligible_scholarships():
    data = request.get_json()
    student_cgpa = data.get('cgpa', 0.0)
    
    # Get inputs with fallback
    # The frontend sends these if the user fills them.
    family_income = data.get('family_income')
    category = data.get('category')
    gender = data.get('gender')
    
    # Filter scholarships based on strict eligibility
    scholarships = Scholarship.query.filter(Scholarship.is_active == True).all()
    eligible_scholarships = []
    
    for scholarship in scholarships:
        eligible = True
        reasons = []
        
        # 1. Check CGPA requirement (if student has one)
        if scholarship.min_cgpa > 0 and student_cgpa > 0 and student_cgpa < scholarship.min_cgpa:
            eligible = False
            reasons.append(f"Minimum CGPA required: {scholarship.min_cgpa}")
        
        # 2. Check income requirement (Strict)
        # If user provided income, check against max limit.
        if family_income is not None:
            try:
                income_val = float(family_income)
                if scholarship.max_family_income > 0 and income_val > scholarship.max_family_income:
                    eligible = False
                    reasons.append(f"Income exceeds limit of ₹{scholarship.max_family_income:,.0f}")
            except ValueError:
                pass # Invalid income input, ignore or handle? For now ignore.

        # 3. Check category eligibility (Strict)
        # If user provided category, it MUST be in the eligible list.
        if category:
            eligible_cats = [c.strip().lower() for c in scholarship.eligible_categories.split(',')]
            if 'all' not in eligible_cats and category.lower() not in eligible_cats:
                eligible = False
                reasons.append(f"Only for categories: {scholarship.eligible_categories}")
        
        # 4. Check gender eligibility (Strict)
        # If user provided gender, it MUST match.
        if gender:
            eligible_gens = [g.strip().lower() for g in scholarship.eligible_genders.split(',')]
            # 'all' means any gender is fine.
            if 'all' not in eligible_gens and gender.lower() not in eligible_gens:
                eligible = False
                reasons.append(f"Only for gender: {scholarship.eligible_genders}")
        
        # Only add if eligible (User asked to "match the details... and then show them the scholarship")
        # So we primarily want to show ELIGIBLE ones.
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

# Attendance route removed (Subject table deleted)


# Marks route removed


# --- Notice System API ---

@app.route('/api/notices/publish', methods=['POST'])
def publish_notice():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.get_json()
    user_id = session['user_id']
    role = session['role']
    
    if role not in ['faculty', 'admin']:
        return jsonify({'error': 'Permission denied'}), 403
        
    try:
        new_notice = Notice(
            title=data['title'],
            content=data['content'],
            created_by_user_id=user_id,
            created_by_role=role,
            visible_to=data['visible_to'], # student, faculty, both
            target_branch=data.get('target_branch'),
            target_semester=data.get('target_semester'),
            target_class_id=data.get('target_class_id'),
            urgency=data.get('urgency', 'low'),
            expire_at=datetime.strptime(data['expiry_date'], '%Y-%m-%d') if data.get('expiry_date') else None
        )
        
        db.session.add(new_notice)
        
        # Determine target audience for notification
        # For simplicity, we create a generic notification if it is an important notice
        if new_notice.urgency == 'urgent':
            # In a real system, we'd do a bulk insert here filtering targets.
            # But the requirement is "Generate notification records".
            # Let's add a system-wide notification for broad notices or specific for targeted.
            pass 

        db.session.commit()
        return jsonify({'success': True, 'message': 'Notice published successfully'})
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notices', methods=['GET'])
def get_notices():
    role = request.args.get('role', 'student') # defaulting to student view logic
    
    # Optional: If logged in, use session data for stricter filtering
    user_id = session.get('user_id')
    student_branch = None
    student_semester = None
    
    if role == 'student' and user_id:
        student = Student.query.filter_by(user_id=user_id).first()
        if student:
            student_branch = student.branch
            student_semester = student.current_semester
    
    query = Notice.query.filter(Notice.is_active == True)
    
    # Visibility Logic
    if role == 'student':
        query = query.filter(
            db.or_(
                Notice.visible_to == 'student',
                Notice.visible_to == 'both'
            )
        )
        # Targeting Logic (Show if Target is NULL OR Matches User)
        if student_branch:
            query = query.filter(
                db.or_(
                    Notice.target_branch == None,
                    Notice.target_branch == '',
                    Notice.target_branch == student_branch
                )
            )
            
        if student_semester:
            query = query.filter(
                db.or_(
                    Notice.target_semester == None,
                    Notice.target_semester == 0,
                    Notice.target_semester == student_semester
                )
            )
            
    elif role == 'faculty':
        query = query.filter(
            db.or_(
                Notice.visible_to == 'faculty',
                Notice.visible_to == 'both'
            )
        )
        
    # Admin sees all (no filter applied if role == admin)
    
    # Sort by Urgency and Date
    # Custom sort for urgency: Urgent > Moderate > Low
    from sqlalchemy import case
    urgency_order = case(
        (Notice.urgency == 'urgent', 1),
        (Notice.urgency == 'moderate', 2),
        else_=3
    )
    
    notices = query.order_by(urgency_order, Notice.created_at.desc()).all()
    
    result = []
    for n in notices:
        result.append({
            'id': n.id,
            'title': n.title,
            'content': n.content,
            'notice_type': n.urgency, # mapping urgency to frontend type
            'created_at': n.created_at.isoformat(),
            'author': n.author.full_name if n.author else 'System',
            'visible_to': n.visible_to
        })
        
    return jsonify(result)


@app.route('/api/student/memberships/<int:student_id>')
def get_student_memberships(student_id):
    # Fetch approved club requests
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

@app.route('/api/faculty/timetable/<int:id_param>')
def get_faculty_timetable(id_param):
    # Try finding by Faculty ID (primary key) first
    faculty = Faculty.query.get(id_param)
    if not faculty:
        # Fallback: Try finding by User ID
        faculty = Faculty.query.filter_by(user_id=id_param).first()
        
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404

    # Fetch timetable for this faculty
    # Fetch timetable for this faculty (using raw name match or explicit ID if kept? 
    # We removed faculty_id column from Timetable in prev step? No, we kept it? 
    # Let's check models.py... "faculty_id = db.Column... nullable=True" WAS REMOVED.
    # So we must match by faculty_raw
    
    # We need the faculty's initials/name to match faculty_raw
    # Faculty table has faculty_id (e.g. MGV). Timetable has faculty_raw (e.g. MGV).
    
    current_academic_year = '2025-26'
    
    # Match by initials (faculty_id column in Faculty table stores initials like MGV)
    entries = Timetable.query.filter(
        Timetable.faculty_raw == faculty.faculty_id, 
        Timetable.academic_year == current_academic_year
    ).all()
    
    # Organize by day and time
    timetable = []
    
    # Map short days to full days
    day_map = {
        'MON': 'Monday', 'TUE': 'Tuesday', 'WED': 'Wednesday', 
        'THU': 'Thursday', 'FRI': 'Friday', 'SAT': 'Saturday',
        'SUN': 'Sunday'
    }
    
    for entry in entries:
        raw_day = entry.day_of_week.upper()
        full_day = day_map.get(raw_day, entry.day_of_week.capitalize())
        
        timetable.append({
            'day': full_day,
            'time': entry.time_slot,
            'subject': entry.subject_raw,
            'subject_code': '', # Not available
            'course': 'N/A', # Not available
            'division': entry.division if entry.division else 'All',
            'batch': entry.batch,
            'room': entry.room_number,
            'semester': entry.semester,
            'id': entry.id,
            'original_id': entry.id
        })
        
    return jsonify(timetable)

# Lecture Swap route removed








@app.route('/api/student/club-recommendations', methods=['POST'])
def recommend_clubs():
    try:
        data = request.get_json()
        print(f"DEBUG: Received recommendation request: {data}")
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
                # Check for direct match or substring match
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
                        'faculty_coordinator': 'Faculty Coordinator', # Simplified
                        'contact_email': club.contact_email
                    },
                    'match_score': match_count,
                    'matching_interests': matching_tags
                })
        
        # Sort by match score descending
        recommendations.sort(key=lambda x: x['match_score'], reverse=True)
        print(f"DEBUG: Found {len(recommendations)} recommendations")
        return jsonify(recommendations)
    except Exception as e:
        print(f"ERROR in recommend_clubs: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/stats')
def get_admin_stats():
    total_students = Student.query.count()
    total_faculty = Faculty.query.count()
    total_courses = Course.query.count()
    
    # Calculate total fee collection (mock data)
    total_fee_collection = db.session.query(db.func.sum(FeePayment.amount_paid)).scalar() or 0
    
    return jsonify({
        'total_students': total_students,
        'total_faculty': total_faculty,
        'total_courses': total_courses,
        'total_fee_collection': total_fee_collection
    })

@app.route('/api/admin/faculty', methods=['GET'])
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
            'experience_years': f.experience_years,
            'specialization': f.specialization,
            'assigned_classes': f.assigned_classes,
            'assigned_semesters': f.assigned_semesters,
            'assigned_subjects': f.assigned_subjects,
            'photo_url': 'https://via.placeholder.com/150' # Placeholder for now
        })
    return jsonify(result)

@app.route('/api/admin/faculty', methods=['POST'])
def add_faculty():
    data = request.get_json()
    
    # Validation
    required_fields = ['full_name', 'email', 'department', 'designation']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
            
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
        
    username = data['email'].split('@')[0]
    if User.query.filter_by(username=username).first():
        # Append random number if username exists
        import random
        username = f"{username}{random.randint(100, 999)}"
        
    try:
        # Create User
        user = User(
            username=username,
            email=data['email'],
            password_hash=generate_password_hash('faculty123'), # Default password
            role='faculty',
            full_name=data['full_name'],
            department=data['department']
        )
        db.session.add(user)
        db.session.flush() # Flush to get user.id
        
        # Generate Faculty ID (Simple logic: FAC + Year + Random)
        import random
        faculty_id = f"FAC{datetime.now().year}{random.randint(1000, 9999)}"
        
        # Create Faculty
        faculty = Faculty(
            user_id=user.id,
            faculty_id=faculty_id,
            designation=data['designation'],
            experience_years=data.get('experience_years', 0),
            specialization=data.get('specialization', ''),
            assigned_classes=data.get('assigned_classes', ''),
            assigned_semesters=data.get('assigned_semesters', ''),
            assigned_subjects=data.get('assigned_subjects', '')
        )
        db.session.add(faculty)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Faculty added successfully', 'id': faculty.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/faculty/<int:id>', methods=['GET'])
def get_faculty_details(id):
    # 'id' here is the Faculty.id, but let's support searching by that.
    faculty = Faculty.query.get_or_404(id)
    return jsonify({
        'id': faculty.id,
        'faculty_id': faculty.faculty_id,
        'full_name': faculty.user.full_name,
        'email': faculty.user.email,
        'department': faculty.user.department,
        'designation': faculty.designation,
        'experience_years': faculty.experience_years,
        'specialization': faculty.specialization,
        'assigned_classes': faculty.assigned_classes,
        'assigned_semesters': faculty.assigned_semesters,
        'assigned_subjects': faculty.assigned_subjects,
        'user_id': faculty.user_id
    })

@app.route('/api/admin/faculty/<int:id>', methods=['PUT'])
def update_faculty(id):
    faculty = Faculty.query.get_or_404(id)
    data = request.get_json()
    
    # Update User model fields
    if 'full_name' in data:
        faculty.user.full_name = data['full_name']
    if 'email' in data:
        # Check uniqueness if email is changed
        if data['email'] != faculty.user.email:
            if User.query.filter_by(email=data['email']).first():
                 return jsonify({'error': 'Email already exists'}), 400
            faculty.user.email = data['email']
    if 'department' in data:
        faculty.user.department = data['department']
        
    # Update Faculty model fields
    if 'designation' in data:
        faculty.designation = data['designation']
    if 'experience_years' in data:
        faculty.experience_years = data['experience_years']
    if 'specialization' in data:
        faculty.specialization = data['specialization']
    
    # Update new fields
    if 'assigned_classes' in data:
        faculty.assigned_classes = data['assigned_classes']
    if 'assigned_semesters' in data:
        faculty.assigned_semesters = data['assigned_semesters']
    if 'assigned_subjects' in data:
        faculty.assigned_subjects = data['assigned_subjects']
        
    try:
        db.session.commit()
        return jsonify({'success': True, 'message': 'Faculty updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/faculty/<int:id>', methods=['DELETE'])
def delete_faculty(id):
    faculty = Faculty.query.get_or_404(id)
    user = faculty.user
    
    try:
        # SOFT DELETE: Set is_active to False
        user.is_active = False
        db.session.commit()
        return jsonify({'success': True, 'message': 'Faculty deleted successfully (Soft Delete)'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/change-password', methods=['POST'])
def change_password():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    user = User.query.get(session['user_id'])
    
    if not user or not check_password_hash(user.password_hash, old_password):
        return jsonify({'success': False, 'message': 'Incorrect old password'})
    
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Password changed successfully'})

@app.route('/api/faculty/reset-student-password', methods=['POST'])
def reset_student_password():
    if 'user_id' not in session or session.get('role') != 'faculty':
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    student_id = data.get('student_id')
    new_password = data.get('new_password')
    
    faculty_user = User.query.get(session['user_id'])
    faculty = Faculty.query.filter_by(user_id=faculty_user.id).first()
    
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'success': False, 'message': 'Student not found'})
        
    # Verify mentorship
    if student.mentor != faculty.faculty_id:
        return jsonify({'success': False, 'message': 'You are not authorized to reset this student password'})
        
    student.user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Student password reset successfully'})

@app.route('/api/faculty/my-mentees')
def get_my_mentees():
    if 'user_id' not in session or session.get('role') != 'faculty':
        return jsonify({'error': 'Unauthorized'}), 401
        
    faculty_user = User.query.get(session['user_id'])
    faculty = Faculty.query.filter_by(user_id=faculty_user.id).first()
    
    if not faculty:
         return jsonify({'error': 'Faculty profile not found'}), 404
         
    # Find students where mentor matches faculty_id
    # Note: Student.mentor stores the code (e.g. "MGV"), Faculty.faculty_id stores the same code.
    mentees = Student.query.filter_by(mentor=faculty.faculty_id).all()
    
    mentees_data = []
    for student in mentees:
        mentees_data.append({
            'id': student.id,
            'name': student.user.full_name,
            'roll_number': student.roll_number,
            'branch': student.branch,
            'cgpa': student.cgpa,
            'enrollment_number': student.enrollment_number # Useful if needed
        })
        
    return jsonify(mentees_data)

# Initialize database
def init_db():
    with app.app_context():
        db.create_all()
        
        try:
            with db.engine.connect() as conn:
                def add_column_if_not_exists(table, column, definition):
                    try:
                        conn.execute(db.text(f"SELECT {column} FROM {table} LIMIT 1"))
                    except:
                        try:
                            print(f"Migrating: Adding {column} to {table} table")
                            conn.execute(db.text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
                            conn.commit()
                        except Exception as e:
                            print(f"Failed to add {column}: {e}")

                # Migration for Faculty table
                add_column_if_not_exists('faculty', 'assigned_classes', 'VARCHAR(200)')
                add_column_if_not_exists('faculty', 'assigned_semesters', 'VARCHAR(100)')
                add_column_if_not_exists('faculty', 'assigned_subjects', 'VARCHAR(200)')
                
                # Migration for Student table
                add_column_if_not_exists('student', 'photo_url', 'VARCHAR(500)')
                add_column_if_not_exists('student', 'annual_income', 'FLOAT DEFAULT 0.0')
                add_column_if_not_exists('student', 'category', 'VARCHAR(20)')
                add_column_if_not_exists('student', 'gender', 'VARCHAR(10)')
                add_column_if_not_exists('student', 'blood_group', 'VARCHAR(5)')
                add_column_if_not_exists('student', 'emergency_contact', 'VARCHAR(15)')
                add_column_if_not_exists('student', 'address', 'TEXT')

                # Migration for Scholarship table
                add_column_if_not_exists('scholarship', 'min_cgpa', 'FLOAT DEFAULT 0.0')
                add_column_if_not_exists('scholarship', 'max_family_income', 'FLOAT DEFAULT 0.0')
                add_column_if_not_exists('scholarship', 'eligible_categories', 'VARCHAR(200)')
                add_column_if_not_exists('scholarship', 'eligible_categories', 'VARCHAR(200)')
                add_column_if_not_exists('scholarship', 'eligible_genders', 'VARCHAR(50)')

                # Migration for Timetable
                add_column_if_not_exists('timetable', 'division', 'VARCHAR(5)')

        except Exception as e:
             print(f"Migration error: {e}")
        
        # Create sample data if tables are empty
        if User.query.count() == 0:
            # Create admin user
            admin = User(
                username='admin',
                email='admin@college.edu',
                password_hash=generate_password_hash('admin123'),
                role='admin',
                full_name='System Administrator',
                department='Administration'
            )
            db.session.add(admin)
            
            # Create sample faculty
            faculty_user = User(
                username='prof.smith',
                email='prof.smith@college.edu',
                password_hash=generate_password_hash('faculty123'),
                role='faculty',
                full_name='Prof. John Smith',
                department='Computer Science'
            )
            db.session.add(faculty_user)
            
            # Create sample student
            student_user = User(
                username='2023001',
                email='john.doe@student.college.edu',
                password_hash=generate_password_hash('student123'),
                role='student',
                full_name='John Doe',
                department='Computer Science'
            )
            db.session.add(student_user)
            
            db.session.commit()
            
            # Create faculty record
            faculty_record = Faculty(
                user_id=faculty_user.id,
                faculty_id='FAC001',
                designation='Assistant Professor',
                experience_years=5,
                specialization='Data Structures and Algorithms',
                assigned_classes='CSE-A',
                assigned_semesters='3rd',
                assigned_subjects='Data Structures'
            )
            db.session.add(faculty_record)
            
            # Create student record with enhanced data
            student_record = Student(
                user_id=student_user.id,
                roll_number='2023001',
                enrollment_number='EN2023001',
                current_semester=5,
                branch='Computer Science Engineering',
                admission_year=2023,
                cgpa=8.5,
                photo_url='https://via.placeholder.com/150x180',
                annual_income=300000,
                category='general',
                gender='male',
                blood_group='B+',
                emergency_contact='9876543210',
                address='123 Main Street, City, State - 123456'
            )
            db.session.add(student_record)
            
            # Create sample course
            cse_course = Course(
                course_code='CSE',
                course_name='Computer Science Engineering',
                department='Computer Science',
                duration_years=4,
                total_semesters=8
            )
            db.session.add(cse_course)
            
            db.session.commit()
            
            # Create sample subjects
            subjects = [
                Subject(course_id=cse_course.id, subject_code='CS501', subject_name='Data Structures', semester=5, credits=4),
                Subject(course_id=cse_course.id, subject_code='CS502', subject_name='Algorithms', semester=5, credits=4),
                Subject(course_id=cse_course.id, subject_code='CS503', subject_name='Database Systems', semester=5, credits=3),
                Subject(course_id=cse_course.id, subject_code='CS504', subject_name='Computer Networks', semester=6, credits=4),
                Subject(course_id=cse_course.id, subject_code='CS505', subject_name='Operating Systems', semester=6, credits=4),
            ]
            
            for subject in subjects:
                db.session.add(subject)
            
            db.session.commit()
            
            # Create sample events
            events = [
                Event(
                    title='TechFest 2026',
                    description='Annual technical festival featuring coding competitions, robotics, and innovation showcases.',
                    event_type='technical',
                    start_date=datetime(2026, 2, 15, 9, 0),
                    end_date=datetime(2026, 2, 17, 18, 0),
                    venue='Main Auditorium',
                    organizer_name='Technical Society',
                    contact_person='Dr. Rajesh Kumar',
                    contact_phone='9876543210',
                    contact_email='techfest@college.edu',
                    registration_required=True,
                    registration_deadline=datetime(2026, 2, 10, 23, 59),
                    max_participants=500,
                    created_by=admin.id
                ),
                Event(
                    title='Cultural Night 2026',
                    description='Showcase of music, dance, and theatrical performances by students.',
                    event_type='cultural',
                    start_date=datetime(2026, 3, 5, 18, 0),
                    end_date=datetime(2026, 3, 5, 22, 0),
                    venue='Open Air Theatre',
                    organizer_name='Cultural Committee',
                    contact_person='Prof. Priya Sharma',
                    contact_phone='9876543211',
                    contact_email='cultural@college.edu',
                    registration_required=False,
                    created_by=admin.id
                ),
                Event(
                    title='AI/ML Workshop',
                    description='Hands-on workshop on Artificial Intelligence and Machine Learning fundamentals.',
                    event_type='workshop',
                    start_date=datetime(2026, 1, 20, 10, 0),
                    end_date=datetime(2026, 1, 22, 16, 0),
                    venue='Computer Lab 1',
                    organizer_name='CSE Department',
                    contact_person='Dr. Amit Singh',
                    contact_phone='9876543212',
                    contact_email='aiml@college.edu',
                    registration_required=True,
                    registration_deadline=datetime(2026, 1, 15, 23, 59),
                    max_participants=50,
                    created_by=admin.id
                )
            ]
            
            for event in events:
                db.session.add(event)
            
            # Create sample clubs
            clubs = [
                Club(
                    name='Coding Club',
                    description='Learn programming, participate in coding competitions, and build amazing projects.',
                    category='technical',
                    interests='programming,algorithms,competitive coding,web development,mobile apps',
                    faculty_coordinator=faculty_record.id,
                    student_coordinator='Rahul Sharma (2022001)',
                    meeting_schedule='Every Friday 4:00 PM',
                    contact_email='coding@college.edu'
                ),
                Club(
                    name='Robotics Club',
                    description='Design, build, and program robots for various competitions and projects.',
                    category='technical',
                    interests='robotics,electronics,automation,arduino,raspberry pi',
                    faculty_coordinator=faculty_record.id,
                    student_coordinator='Priya Patel (2022002)',
                    meeting_schedule='Every Wednesday 3:00 PM',
                    contact_email='robotics@college.edu'
                ),
                Club(
                    name='Music Club',
                    description='Express yourself through music - vocals, instruments, and composition.',
                    category='cultural',
                    interests='music,singing,guitar,piano,composition',
                    student_coordinator='Arjun Mehta (2021003)',
                    meeting_schedule='Every Tuesday & Thursday 5:00 PM',
                    contact_email='music@college.edu'
                ),
                Club(
                    name='Photography Club',
                    description='Capture moments, learn photography techniques, and showcase your creativity.',
                    category='cultural',
                    interests='photography,editing,nature,portraits,events',
                    student_coordinator='Sneha Gupta (2021004)',
                    meeting_schedule='Every Saturday 2:00 PM',
                    contact_email='photography@college.edu'
                ),
                Club(
                    name='Sports Club',
                    description='Stay fit, play various sports, and represent college in tournaments.',
                    category='sports',
                    interests='cricket,football,basketball,badminton,athletics',
                    student_coordinator='Vikram Singh (2020005)',
                    meeting_schedule='Daily 6:00 AM & 4:00 PM',
                    contact_email='sports@college.edu'
                )
            ]
            
            for club in clubs:
                db.session.add(club)
            
            # Create sample timetable
            timetable_data = [
                ('monday', '09:00-10:00', 'CS501', 'Room 101'),
                ('monday', '10:00-11:00', 'CS502', 'Room 101'),
                ('monday', '11:30-12:30', 'CS503', 'Room 102'),
                ('tuesday', '09:00-10:00', 'CS502', 'Room 101'),
                ('tuesday', '10:00-11:00', 'CS501', 'Room 101'),
                ('tuesday', '11:30-12:30', 'CS503', 'Room 102'),
                ('wednesday', '09:00-10:00', 'CS501', 'Room 101'),
                ('wednesday', '10:00-11:00', 'CS503', 'Room 102'),
                ('thursday', '09:00-10:00', 'CS502', 'Room 101'),
                ('thursday', '10:00-11:00', 'CS501', 'Room 101'),
                ('friday', '09:00-10:00', 'CS503', 'Room 102'),
                ('friday', '10:00-11:00', 'CS502', 'Room 101')
            ]
            
            for day, time_slot, subject_code, room in timetable_data:
                subject = Subject.query.filter_by(subject_code=subject_code).first()
                if subject:
                    timetable_entry = Timetable(
                        course_id=cse_course.id,
                        semester=5,
                        day_of_week=day,
                        time_slot=time_slot,
                        subject_id=subject.id,
                        faculty_id=faculty_record.id,
                        room_number=room,
                        academic_year='2025-26'
                    )
                    db.session.add(timetable_entry)
            
            # Create enhanced scholarships
            real_scholarships = [
                Scholarship(
                    name='AICTE Pragati Scholarship for Girls',
                    description='Empowering girl students in technical education. Aims to provide assistance for advancement of girls pursuing technical education.',
                    category='merit',
                    eligibility_criteria='Female students, Family income <= 8 LPA, Admitted to 1st year of Degree/Diploma level course.',
                    min_cgpa=0.0,
                    max_family_income=800000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='female',
                    amount=50000,
                    deadline=datetime(2026, 10, 31).date(),
                    official_website='https://www.aicte-india.org/schemes/students-development-schemes/Pragati'
                ),
                Scholarship(
                    name='AICTE Saksham Scholarship',
                    description='Support for specially-abled children to pursue technical education. For students with disability of not less than 40%.',
                    category='minority',
                    eligibility_criteria='Differently-abled students (>40%), Family income <= 8 LPA.',
                    min_cgpa=0.0,
                    max_family_income=800000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='all',
                    amount=50000,
                    deadline=datetime(2026, 10, 31).date(),
                    official_website='https://www.aicte-india.org/schemes/students-development-schemes/Saksham'
                ),
                Scholarship(
                    name='PM-USP Central Sector Scheme',
                    description='Central Sector Scheme of Scholarship for College and University Students. For meritorious students from low-income families.',
                    category='merit',
                    eligibility_criteria='Top 20th percentile in Class 12, Family income < 4.5 LPA, Pursuing regular course.',
                    min_cgpa=0.0,
                    max_family_income=450000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='all',
                    amount=20000,
                    deadline=datetime(2026, 12, 31).date(),
                    official_website='https://scholarships.gov.in/public/schemeGuidelines/CSSS_Guidelines.pdf'
                ),
                Scholarship(
                    name='Bharti Airtel Scholarship',
                    description='To support deserving students from diverse socio-economic backgrounds, with a focus on girl students, in becoming future technology leaders.',
                    category='need',
                    eligibility_criteria='Top 50 NIRF Engineering Institute, Family income <= 8 LPA.',
                    min_cgpa=0.0,
                    max_family_income=800000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='all',
                    amount=100000,
                    deadline=datetime(2026, 8, 31).date(),
                    official_website='https://bhartifoundation.org/programs/higher-education/bharti-airtel-scholarship-program/'
                ),
                Scholarship(
                    name='Reliance Foundation Scholarship',
                    description='Identifying and nurturing India’s brightest students with leadership potential from all socio-economic backgrounds.',
                    category='merit',
                    eligibility_criteria='Passed 12th with >60%, Family income < 15 LPA, Enrolled in 1st year full-time degree.',
                    min_cgpa=0.0,
                    max_family_income=1500000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='all',
                    amount=200000,
                    deadline=datetime(2026, 10, 15).date(),
                    official_website='https://scholarships.reliancefoundation.org/'
                ),
                Scholarship(
                    name='SBI Asha Scholarship',
                    description='Scholarship Program by SBI Foundation for meritorious students from low-income families.',
                    category='need',
                    eligibility_criteria='75% marks in previous academic year, Family income < 3 LPA.',
                    min_cgpa=7.5,
                    max_family_income=300000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='all',
                    amount=50000,
                    deadline=datetime(2026, 11, 30).date(),
                    official_website='https://www.sbifoundation.in/asha-scholarship'
                ),
                Scholarship(
                    name='Post Matric Scholarship for SC',
                    description='Financial assistance to SC students studying at post-matriculation or post-secondary stage.',
                    category='minority',
                    eligibility_criteria='SC Students, Family income <= 2.5 LPA.',
                    min_cgpa=0.0,
                    max_family_income=250000,
                    eligible_categories='sc',
                    eligible_genders='all',
                    amount=15000,
                    deadline=datetime(2026, 11, 30).date(),
                    official_website='https://socialjustice.gov.in/schemes/post-matric-scholarship-for-sc-students'
                ),
                Scholarship(
                    name='Post Matric Scholarship for OBC',
                    description='Financial assistance to OBC students studying at post-matriculation or post-secondary stage.',
                    category='minority',
                    eligibility_criteria='OBC Students, Family income <= 2.5 LPA.',
                    min_cgpa=0.0,
                    max_family_income=250000,
                    eligible_categories='obc',
                    eligible_genders='all',
                    amount=10000,
                    deadline=datetime(2026, 11, 30).date(),
                    official_website='https://socialjustice.gov.in/schemes/post-matric-scholarship-for-obc-students'
                )
            ]
            
            for s in real_scholarships:
                existing = Scholarship.query.filter_by(name=s.name).first()
                if existing:
                    # Update existing record
                    existing.official_website = s.official_website
                    existing.description = s.description
                    existing.eligibility_criteria = s.eligibility_criteria
                    existing.amount = s.amount
                    existing.deadline = s.deadline
                    existing.max_family_income = s.max_family_income
                    existing.min_cgpa = s.min_cgpa
                    existing.eligible_categories = s.eligible_categories
                    existing.eligible_genders = s.eligible_genders
                else:
                    # Add new record
                    db.session.add(s)
            
            # Create comprehensive fee structures
            fee_structures = [
                FeeStructure(course_id=cse_course.id, semester=1, tuition_fee=45000, lab_fee=3000, library_fee=2000, other_fees=1000, total_fee=51000, academic_year='2025-26'),
                FeeStructure(course_id=cse_course.id, semester=2, tuition_fee=45000, lab_fee=3000, library_fee=2000, other_fees=1000, total_fee=51000, academic_year='2025-26'),
                FeeStructure(course_id=cse_course.id, semester=3, tuition_fee=48000, lab_fee=4000, library_fee=2000, other_fees=1000, total_fee=55000, academic_year='2025-26'),
                FeeStructure(course_id=cse_course.id, semester=4, tuition_fee=48000, lab_fee=4000, library_fee=2000, other_fees=1000, total_fee=55000, academic_year='2025-26'),
                FeeStructure(course_id=cse_course.id, semester=5, tuition_fee=50000, lab_fee=5000, library_fee=2000, other_fees=1000, total_fee=58000, academic_year='2025-26'),
            ]
            
            for fee_structure in fee_structures:
                db.session.add(fee_structure)
            
            # Create sample fee payment
            fee_payment = FeePayment(
                student_id=student_record.id,
                fee_structure_id=5,  # 5th semester fee structure
                amount_paid=58000,
                payment_method='Online',
                transaction_id='TXN123456789',
                status='completed'
            )
            db.session.add(fee_payment)
            
            # Create sample notices
            notices = [
                Notice(
                    title='Mid-Semester Examination Schedule Released',
                    content='The mid-semester examination schedule for all departments has been published. Students are advised to check their respective timetables and prepare accordingly.',
                    notice_type='exam',
                    target_audience='students',
                    created_by=admin.id,
                    expires_at=datetime.utcnow() + timedelta(days=30)
                ),
                Notice(
                    title='Republic Day Holiday',
                    content='The college will remain closed on January 26th, 2026 on account of Republic Day. Regular classes will resume from January 27th.',
                    notice_type='holiday',
                    target_audience='all',
                    created_by=admin.id,
                    expires_at=datetime.utcnow() + timedelta(days=15)
                ),
                Notice(
                    title='Technical Symposium 2026',
                    content='Annual technical symposium will be held from February 15-17, 2026. Students are encouraged to participate in various technical events.',
                    notice_type='event',
                    target_audience='students',
                    created_by=admin.id,
                    expires_at=datetime.utcnow() + timedelta(days=45)
                )
            ]
            
            for notice in notices:
                db.session.add(notice)
            
            db.session.commit()
            
            print("Comprehensive sample data created successfully!")

        # Ensure authentic scholarships exist (even if DB was already initialized)
        if Scholarship.query.filter_by(name='AICTE Pragati Scholarship for Girls').count() == 0:
            print("Adding authentic scholarships...")
            # Optional: Clear old dummy scholarships if they exist and no applications linked
            # try:
            #     if ScholarshipApplication.query.count() == 0:
            #         Scholarship.query.delete()
            #         db.session.commit()
            # except:
            #     pass

            real_scholarships = [
                Scholarship(
                    name='AICTE Pragati Scholarship for Girls',
                    description='Empowering girl students in technical education. Aims to provide assistance for advancement of girls pursuing technical education.',
                    category='merit',
                    eligibility_criteria='Female students, Family income <= 8 LPA, Admitted to 1st year of Degree/Diploma level course.',
                    min_cgpa=0.0,
                    max_family_income=800000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='female',
                    amount=50000,
                    deadline=datetime(2026, 10, 31).date(),
                    official_website='https://www.aicte-india.org/schemes/students-development-schemes/Pragati'
                ),
                Scholarship(
                    name='AICTE Saksham Scholarship',
                    description='Support for specially-abled children to pursue technical education. For students with disability of not less than 40%.',
                    category='minority',
                    eligibility_criteria='Differently-abled students (>40%), Family income <= 8 LPA.',
                    min_cgpa=0.0,
                    max_family_income=800000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='all',
                    amount=50000,
                    deadline=datetime(2026, 10, 31).date(),
                    official_website='https://www.aicte-india.org/schemes/students-development-schemes/Saksham'
                ),
                Scholarship(
                    name='PM-USP Central Sector Scheme',
                    description='Central Sector Scheme of Scholarship for College and University Students. For meritorious students from low-income families.',
                    category='merit',
                    eligibility_criteria='Top 20th percentile in Class 12, Family income < 4.5 LPA, Pursuing regular course.',
                    min_cgpa=0.0,
                    max_family_income=450000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='all',
                    amount=20000,
                    deadline=datetime(2026, 12, 31).date(),
                    official_website='https://scholarships.gov.in/public/schemeGuidelines/CSSS_Guidelines.pdf'
                ),
                Scholarship(
                    name='Bharti Airtel Scholarship',
                    description='To support deserving students from diverse socio-economic backgrounds, with a focus on girl students, in becoming future technology leaders.',
                    category='need',
                    eligibility_criteria='Top 50 NIRF Engineering Institute, Family income <= 8 LPA.',
                    min_cgpa=0.0,
                    max_family_income=800000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='all',
                    amount=100000,
                    deadline=datetime(2026, 8, 31).date(),
                    official_website='https://bhartifoundation.org/programs/higher-education/bharti-airtel-scholarship-program/'
                ),
                Scholarship(
                    name='Reliance Foundation Scholarship',
                    description='Identifying and nurturing India’s brightest students with leadership potential from all socio-economic backgrounds.',
                    category='merit',
                    eligibility_criteria='Passed 12th with >60%, Family income < 15 LPA, Enrolled in 1st year full-time degree.',
                    min_cgpa=0.0,
                    max_family_income=1500000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='all',
                    amount=200000,
                    deadline=datetime(2026, 10, 15).date(),
                    official_website='https://scholarships.reliancefoundation.org/Undergraduate_Scholarship.aspx'
                ),
                Scholarship(
                    name='SBI Asha Scholarship',
                    description='Scholarship Program by SBI Foundation for meritorious students from low-income families.',
                    category='need',
                    eligibility_criteria='75% marks in previous academic year, Family income < 3 LPA.',
                    min_cgpa=7.5,
                    max_family_income=300000,
                    eligible_categories='general,obc,sc,st,ews',
                    eligible_genders='all',
                    amount=50000,
                    deadline=datetime(2026, 11, 30).date(),
                    official_website='https://www.sbifoundation.in/asha-scholarship'
                ),
                Scholarship(
                    name='Post Matric Scholarship for SC',
                    description='Financial assistance to SC students studying at post-matriculation or post-secondary stage.',
                    category='minority',
                    eligibility_criteria='SC Students, Family income <= 2.5 LPA.',
                    min_cgpa=0.0,
                    max_family_income=250000,
                    eligible_categories='sc',
                    eligible_genders='all',
                    amount=15000,
                    deadline=datetime(2026, 11, 30).date(),
                    official_website='https://socialjustice.gov.in/schemes/post-matric-scholarship-for-sc-students'
                ),

                Scholarship(
                    name='Post Matric Scholarship for OBC',
                    description='Financial assistance to OBC students studying at post-matriculation or post-secondary stage.',
                    category='minority',
                    eligibility_criteria='OBC Students, Family income <= 2.5 LPA.',
                    min_cgpa=0.0,
                    max_family_income=250000,
                    eligible_categories='obc',
                    eligible_genders='all',
                    amount=10000,
                    deadline=datetime(2026, 11, 30).date(),
                    official_website='https://socialjustice.gov.in/schemes/post-matric-scholarship-for-obc-students'
                )
            ]
            
            for s in real_scholarships:
                db.session.add(s)
            db.session.commit()
            print("Authentic scholarships added.")

# --- Examination Management APIs ---

@app.route('/api/admin/exams/schedule', methods=['POST'])
def create_exam_schedule():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    try:
        new_schedule = ExamSchedule(
            name=data['name'],
            academic_year=data['academic_year'],
            semester_type=data.get('semester_type'),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        )
        db.session.add(new_schedule)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Exam schedule created', 'id': new_schedule.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/exams/timetable', methods=['POST'])
def add_exam_timetable_entry():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    try:
        new_exam = Exam(
            exam_schedule_id=data['exam_schedule_id'],
            subject_id=data['subject_id'],
            # faculty_id=data.get('faculty_id'), # Optional
            exam_date=datetime.strptime(data['exam_date'], '%Y-%m-%d').date(),
            start_time=datetime.strptime(data['start_time'], '%H:%M').time(),
            end_time=datetime.strptime(data['end_time'], '%H:%M').time(),
            room_number=data.get('room_number')
        )
        db.session.add(new_exam)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Timetable entry added'})
    except Exception as e:
        db.session.rollback()
        print(f"Error adding exam: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/exams/timetable/<int:schedule_id>')
def get_exam_timetable(schedule_id):
    exams = Exam.query.filter_by(exam_schedule_id=schedule_id).all()
    result = []
    for exam in exams:
        result.append({
            'id': exam.id,
            'subject_name': exam.subject.subject_name,
            'subject_code': exam.subject.subject_code,
            'exam_date': exam.exam_date.strftime('%Y-%m-%d'),
            'start_time': exam.start_time.strftime('%H:%M'),
            'end_time': exam.end_time.strftime('%H:%M'),
            'room_number': exam.room_number,
            'faculty_name': exam.faculty.user.full_name if exam.faculty else 'TBA'
        })
    return jsonify(result)

@app.route('/api/admin/exams/publish/<int:schedule_id>', methods=['POST'])
def publish_exam_schedule(schedule_id):
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    schedule = ExamSchedule.query.get(schedule_id)
    if not schedule:
        return jsonify({'error': 'Schedule not found'}), 404
        
    schedule.is_published = True
    
    # Notify all students
    students = Student.query.filter_by(function=1).all()
    for student in students:
        notif = Notification(
            user_id=student.user_id,
            title='Exam Schedule Released',
            message=f'The schedule for {schedule.name} has been published.',
            notification_type='exam'
        )
        db.session.add(notif)
        
    db.session.commit()
    return jsonify({'success': True, 'message': 'Schedule published and students notified'})

@app.route('/api/admin/exams/subjects')
def get_all_subjects_for_exams():
    subjects = Subject.query.all()
    return jsonify([{
        'id': s.id, 
        'code': s.subject_code, 
        'name': s.subject_name
    } for s in subjects])

@app.route('/api/student/exams')
def get_student_exams():
    if 'user_id' not in session or session.get('role') != 'student':
        return jsonify({'error': 'Unauthorized'}), 403
        
    user = User.query.get(session['user_id'])
    student = user.student

    # Find the latest published active schedule
    # For simplicity, getting the most recent published one
    schedule = ExamSchedule.query.filter_by(is_published=True).order_by(ExamSchedule.created_at.desc()).first()
    
    if not schedule:
        return jsonify([])

    # In a real app, filter by student's semester/branch
    # For now, return all exams in this schedule that match student's subjects (if enrolled)
    # Or just return all exams for the demo if subject enrollment isn't strict
    
    exams = Exam.query.filter_by(exam_schedule_id=schedule.id).order_by(Exam.exam_date).all()
    
    exam_data = []
    for exam in exams:
        # Determine Status
        now = datetime.now()
        exam_dt = datetime.combine(exam.exam_date, exam.start_time)
        end_dt = datetime.combine(exam.exam_date, exam.end_time)
        
        status = 'Upcoming'
        status_class = 'upcoming'
        
        if now > end_dt:
            status = 'Completed'
            status_class = 'completed'
        elif now >= exam_dt and now <= end_dt:
            status = 'Ongoing'
            status_class = 'ongoing'
            
        exam_data.append({
            'subject_name': exam.subject.subject_name,
            'subject_code': exam.subject.subject_code,
            'date': exam.exam_date.strftime('%d %b %Y'),
            'day': exam.exam_date.strftime('%A'),
            'time': f"{exam.start_time.strftime('%I:%M %p')} - {exam.end_time.strftime('%I:%M %p')}",
            'room': exam.room_number,
            'status': status,
            'status_class': status_class
        })
        
    return jsonify(exam_data)

if __name__ == '__main__':
    # Initialize main DB
    with app.app_context():
        db.create_all()
        # Check if we need to seed initial data
        if not User.query.first():
            init_db()  # Your existing seed function (assumed to be defined or imported)
    
    # Register Admin Blueprint
    # Import here to avoid circular dependencies
    # try:
    #     from admin import admin_exam_bp, init_exam_db
    #     app.register_blueprint(admin_exam_bp)
    #     print("Registered Admin Examination Blueprint")
    #     
    #     # Initialize Exam DB tables
    #     # init_exam_db(app)
    # except Exception as e:
    #     print(f"Error registering Admin Blueprint: {e}")



# --- Enhanced Query Resolution System Routes ---

@app.route('/api/faculty/by-subject')
def get_faculty_by_subject():
    subject = request.args.get('subject')
    if not subject:
        return jsonify([])
    
    # Filter faculty whose assigned_subjects string contains the subject
    # This is a naive substring match; consistent with typical requirements here
    faculty_list = Faculty.query.filter(Faculty.assigned_subjects.contains(subject)).all()
    
    result = []
    for f in faculty_list:
        result.append({
            'id': f.id,
            'name': f.user.full_name
        })
    return jsonify(result)

@app.route('/api/queries/create', methods=['POST'])
def create_query():
    data = request.json
    try:
        student_id = data.get('student_id')
        title = data.get('title')
        content = data.get('content')
        query_type = data.get('query_type', 'academic') # 'academic' or 'mentorship'
        
        # Details dependent on type
        subject_name = data.get('subject_name')
        faculty_id = data.get('faculty_id') 

        student = Student.query.get(student_id)
        if not student:
             # Fallback: Check if the ID provided is actually the User ID
             student = Student.query.filter_by(user_id=student_id).first()
             
             if not student:
                 return jsonify({'error': 'Student not found'}), 404

        # Logic Branch
        if query_type == 'mentorship':
            subject_name = 'Mentorship' # Placeholder
            # Auto-assign to mentor
            mentor_name = student.mentor
            if not mentor_name:
                return jsonify({'error': 'No mentor assigned to your profile.'}), 400
                
            # Find Faculty User by Name (Case Insensitive Partial Match)
            # We assume Mentor Name matches a User.full_name who is a Faculty
            mentor_user = User.query.filter(User.full_name.ilike(f"%{mentor_name}%"), User.role=='faculty').first()
            if mentor_user and mentor_user.faculty:
                faculty_id = mentor_user.faculty.id
            else:
                 # Fallback: Check if there is ANY faculty (Demo purposes: assign to first faculty)
                 # In production, this should flag an admin
                 fallback_faculty = Faculty.query.first()
                 if fallback_faculty:
                     faculty_id = fallback_faculty.id
                 # Fallback: leave unassigned if mentor not found in system
                 pass

        else:
            # Academic
            if not subject_name:
                return jsonify({'error': 'Subject is required for academic queries'}), 400
            
            # Auto-assign logic if no faculty selected
            if not faculty_id:
                 potential_faculty = Faculty.query.filter(Faculty.assigned_subjects.contains(subject_name)).first()
                 if potential_faculty:
                     faculty_id = potential_faculty.id
        
        # Create Thread
        thread = QueryThread(
            student_id=student.id, # Ensure we use the correct Student ID (PK)
            faculty_id=faculty_id,
            subject_name=subject_name,
            title=title,
            status='pending',
            query_type=query_type
        )
        db.session.add(thread)
        db.session.flush()

        # Create First Post
        post = QueryPost(
            thread_id=thread.id,
            author_user_id=student.user_id,
            role='student',
            content=content
        )
        db.session.add(post)
        
        # Notification
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
        print(f"Error creating query: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/queries/student/<int:student_id>')
def get_student_queries(student_id):
    threads = QueryThread.query.filter_by(student_id=student_id).order_by(QueryThread.updated_at.desc()).all()
    
    result = []
    for t in threads:
        result.append({
            'id': t.id,
            'title': t.title,
            'subject': t.subject_name,
            'status': t.status,
            'type': t.query_type, # Return type
            'faculty_name': t.faculty.user.full_name if t.faculty else "Unassigned",
            'updated_at': t.updated_at.strftime('%Y-%m-%d %H:%M'),
            'last_message': t.posts[-1].content[:50] + "..." if t.posts else ""
        })
    return jsonify(result)

@app.route('/api/queries/faculty/<int:user_id>')
def get_faculty_queries(user_id):
    # Lookup Faculty by User ID
    faculty = Faculty.query.filter_by(user_id=user_id).first()
    if not faculty:
        return jsonify([])
        
    # Fetch threads assigned to this faculty
    threads = QueryThread.query.filter_by(faculty_id=faculty.id).order_by(
        # Prioritize Pending
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

@app.route('/api/queries/thread/<int:thread_id>')
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
        
    # Enhanced Context for Faculty
    student_details = None
    # We always send it, Frontend decides to show it based on current user role (which frontend knows)
    # Or strict: Only if current user is faculty. 
    # For simplicity/speed in this context, we send it.
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

@app.route('/api/queries/<int:thread_id>/reply', methods=['POST'])
def reply_to_query(thread_id):
    # Handle both JSON and Form Data
    if request.is_json:
        data = request.json
        user_id = data.get('user_id')
        role = data.get('role')
        content = data.get('content')
        status = data.get('status')
    else:
        # Form Data for File Upload
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
    db.session.flush() # Get post ID
    
    # Handle File Upload
    file = request.files.get('file') if not request.is_json else None
    if file:
        filename = secure_filename(file.filename)
        # Ensure directory exists
        upload_dir = os.path.join(app.root_path, 'static/uploads/queries')
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

@app.route('/api/queries/<int:thread_id>/resolve', methods=['POST'])
def resolve_query(thread_id):
    thread = QueryThread.query.get(thread_id)
    if not thread:
        return jsonify({'error': 'Thread not found'}), 404
    thread.status = 'resolved'
    thread.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/common/subjects')
def get_common_subjects():
    try:
        subjects = db.session.query(Timetable.subject_raw).distinct().all()
        subject_list = [s[0] for s in subjects if s[0]]
        return jsonify(sorted(subject_list))
    except:
        return jsonify([])


if __name__ == '__main__':
    app.run(debug=True, port=5001)
