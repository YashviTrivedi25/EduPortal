from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
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
    User, Student, Faculty, Course, Subject, SubjectAssignment, Attendance,
    Marks, Notice, StudyMaterial, FeeStructure, FeePayment, Event, Club,
    Timetable, StudentQuery, QueryResponse, Scholarship, ScholarshipApplication,
    Timetable, StudentQuery, QueryResponse, Scholarship, ScholarshipApplication,
    Notification, Mentorship
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

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    
    user = User.query.filter_by(username=username, role=role).first()
    
    if user and check_password_hash(user.password_hash, password):
        session['user_id'] = user.id
        session['role'] = user.role
        
        # Get additional user data based on role
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
                    'roll_number': student.roll_number,
                    'enrollment_number': student.enrollment_number,
                    'current_semester': student.current_semester,
                    'branch': student.branch,
                    'batch': student.batch,
                    'cgpa': student.cgpa
                })
        elif user.role == 'faculty':
            faculty = Faculty.query.filter_by(user_id=user.id).first()
            if faculty:
                user_data.update({
                    'faculty_id': faculty.faculty_id,
                    'designation': faculty.designation,
                    'experience_years': faculty.experience_years,
                    'specialization': faculty.specialization
                })
        
        return jsonify({'success': True, 'user': user_data})
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials'})

@app.route('/api/events')
def get_events():
    events = Event.query.filter(Event.is_active == True).order_by(Event.start_date.desc()).all()
    
    events_data = []
    for event in events:
        events_data.append({
            'id': event.id,
            'title': event.title,
            'description': event.description,
            'event_type': event.event_type,
            'start_date': event.start_date.isoformat(),
            'end_date': event.end_date.isoformat(),
            'venue': event.venue,
            'organizer_name': event.organizer_name,
            'contact_person': event.contact_person,
            'contact_phone': event.contact_phone,
            'contact_email': event.contact_email,
            'registration_required': event.registration_required,
            'registration_deadline': event.registration_deadline.isoformat() if event.registration_deadline else None,
            'max_participants': event.max_participants
        })
    
    return jsonify(events_data)

@app.route('/api/student/fee-history/<int:student_id>')
def get_fee_history(student_id):
    payments = FeePayment.query.filter_by(student_id=student_id).order_by(FeePayment.payment_date.desc()).all()
    
    fee_history = []
    for payment in payments:
        fee_structure = payment.fee_structure
        fee_history.append({
            'id': payment.id,
            'semester': fee_structure.semester,
            'academic_year': fee_structure.academic_year,
            'amount_paid': payment.amount_paid,
            'payment_date': payment.payment_date.isoformat(),
            'payment_method': payment.payment_method,
            'transaction_id': payment.transaction_id,
            'status': payment.status,
            'tuition_fee': fee_structure.tuition_fee,
            'lab_fee': fee_structure.lab_fee,
            'library_fee': fee_structure.library_fee,
            'other_fees': fee_structure.other_fees,
            'total_fee': fee_structure.total_fee
        })
    
    return jsonify(fee_history)

@app.route('/api/student/queries', methods=['GET', 'POST'])
def handle_student_queries():
    if request.method == 'POST':
        data = request.get_json()
        
        query = StudentQuery(
            student_id=data.get('student_id'),
            faculty_id=data.get('faculty_id'),
            subject_id=data.get('subject_id'),
            query_title=data.get('query_title'),
            query_description=data.get('query_description'),
            attachment_url=data.get('attachment_url')
        )
        
        db.session.add(query)
        
        # Create notification for faculty
        faculty = Faculty.query.get(data.get('faculty_id'))
        if faculty:
            notification = Notification(
                user_id=faculty.user_id,
                title='New Student Query',
                message=f'New query: {data.get("query_title")}',
                notification_type='query'
            )
            db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Query submitted successfully'})
    
    else:
        student_id = request.args.get('student_id')
        queries = StudentQuery.query.filter_by(student_id=student_id).order_by(StudentQuery.created_at.desc()).all()
        
        queries_data = []
        for query in queries:
            queries_data.append({
                'id': query.id,
                'query_title': query.query_title,
                'query_description': query.query_description,
                'subject_name': query.subject.subject_name,
                'faculty_name': query.faculty.user.full_name,
                'status': query.status,
                'created_at': query.created_at.isoformat(),
                'answered_at': query.answered_at.isoformat() if query.answered_at else None,
                'responses': [
                    {
                        'response_text': resp.response_text,
                        'created_at': resp.created_at.isoformat()
                    } for resp in query.responses
                ]
            })
        
        return jsonify(queries_data)

@app.route('/api/student/id-card/<int:student_id>')
def get_student_id_card(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    id_card_data = {
        'full_name': student.user.full_name,
        'roll_number': student.roll_number,
        'enrollment_number': student.enrollment_number,
        'branch': student.branch,
        'semester': student.current_semester,
        'admission_year': student.admission_year,
        'photo_url': student.photo_url or 'https://via.placeholder.com/150x180',
        'blood_group': student.blood_group,
        'emergency_contact': student.emergency_contact,
        'address': student.address,
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
            'contact_email': club.contact_email
        })
    
    return jsonify(clubs_data)

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
                    'contact_email': club.contact_email
                },
                'match_score': match_score,
                'matching_interests': list(set(student_interests) & set(club_interests))
            })
    
    # Sort by match score
    recommendations.sort(key=lambda x: x['match_score'], reverse=True)
    
    return jsonify(recommendations)

@app.route('/api/student/timetable/<int:user_id>')
def get_student_timetable(user_id):
    student = Student.query.filter_by(user_id=user_id).first()
    if not student or not student.batch:
        return jsonify([])
    
    schedule = ClassSchedule.query.filter(ClassSchedule.batch.ilike(student.batch.strip())).order_by(ClassSchedule.day_order, ClassSchedule.id).all()
    result = []
    for entry in schedule:
        result.append({
            'day': entry.day_of_week,
            'time': entry.time_slot,
            'subject': entry.subject,
            'faculty': entry.faculty,
            'room': entry.room,
            'type': entry.entry_type
        })
    return jsonify(result)

@app.route('/api/faculty/timetable/<int:user_id>')
def get_faculty_timetable(user_id):
    faculty = Faculty.query.filter_by(user_id=user_id).first()
    if not faculty:
        return jsonify([])
    
    # Extract initials from "Prof. XYZ" or just use full name if not found
    name = faculty.user.full_name
    initials = name.replace('Prof.', '').replace('Dr.', '').strip()
    
    # Search for initials in the faculty column (case-insensitive)
    schedule = ClassSchedule.query.filter(ClassSchedule.faculty.ilike(f"%{initials}%")).order_by(ClassSchedule.day_order, ClassSchedule.id).all()
    
    result = []
    for entry in schedule:
        result.append({
            'day': entry.day_of_week,
            'time': entry.time_slot,
            'subject': entry.subject,
            'faculty': entry.faculty,
            'room': entry.room,
            'batch': entry.batch,
            'type': entry.entry_type
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

@app.route('/api/student/attendance/<int:student_id>')
def get_student_attendance(student_id):
    # Calculate attendance for each subject
    subjects = Subject.query.join(Course).filter(Course.department == 'Computer Science').all()
    attendance_data = []
    
    for subject in subjects:
        total_classes = Attendance.query.filter_by(
            student_id=student_id, 
            subject_id=subject.id
        ).count()
        
        present_classes = Attendance.query.filter_by(
            student_id=student_id, 
            subject_id=subject.id, 
            status='present'
        ).count()
        
        attendance_percentage = (present_classes / total_classes * 100) if total_classes > 0 else 0
        
        attendance_data.append({
            'subject_name': subject.subject_name,
            'attendance_percentage': round(attendance_percentage, 2),
            'present_classes': present_classes,
            'total_classes': total_classes
        })
    
    return jsonify(attendance_data)

@app.route('/api/student/marks/<int:student_id>')
def get_student_marks(student_id):
    marks = db.session.query(Marks, Subject).join(Subject).filter(
        Marks.student_id == student_id
    ).all()
    
    marks_data = []
    for mark, subject in marks:
        marks_data.append({
            'subject_name': subject.subject_name,
            'exam_type': mark.exam_type,
            'marks_obtained': mark.marks_obtained,
            'max_marks': mark.max_marks,
            'percentage': round((mark.marks_obtained / mark.max_marks) * 100, 2),
            'exam_date': mark.exam_date.isoformat() if mark.exam_date else None,
            'semester': mark.semester
        })
    
    return jsonify(marks_data)

@app.route('/api/notices')
def get_notices():
    role = request.args.get('role', 'all')
    department = request.args.get('department')
    
    query = Notice.query.filter(Notice.is_active == True)
    
    if role != 'all':
        query = query.filter(
            (Notice.target_audience == 'all') | 
            (Notice.target_audience == role)
        )
    
    if department:
        query = query.filter(
            (Notice.target_audience != 'department') |
            (Notice.department == department)
        )
    
    notices = query.order_by(Notice.created_at.desc()).all()
    
    notices_data = []
    for notice in notices:
        notices_data.append({
            'id': notice.id,
            'title': notice.title,
            'content': notice.content,
            'notice_type': notice.notice_type,
            'created_at': notice.created_at.isoformat(),
            'expires_at': notice.expires_at.isoformat() if notice.expires_at else None
        })
    
    return jsonify(notices_data)

@app.route('/api/faculty/classes/<int:faculty_id>')
def get_faculty_classes(faculty_id):
    assignments = db.session.query(SubjectAssignment, Subject, Course).join(
        Subject
    ).join(Course).filter(
        SubjectAssignment.faculty_id == faculty_id
    ).all()
    
    classes_data = []
    for assignment, subject, course in assignments:
        # Get student count for this subject
        student_count = db.session.query(Student).join(Course).filter(
            Course.id == course.id
        ).count()
        
        classes_data.append({
            'subject_name': subject.subject_name,
            'subject_code': subject.subject_code,
            'course_name': course.course_name,
            'semester': assignment.semester,
            'student_count': student_count,
            'credits': subject.credits
        })
    
    return jsonify(classes_data)

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

if __name__ == '__main__':
    # Initialize main DB
    with app.app_context():
        db.create_all()
        # Check if we need to seed initial data
        if not User.query.first():
            init_db()  # Your existing seed function (assumed to be defined or imported)
    
    # Register Admin Blueprint
    # Import here to avoid circular dependencies
    try:
        from admin import admin_exam_bp, init_exam_db
        app.register_blueprint(admin_exam_bp)
        print("Registered Admin Examination Blueprint")
        
        # Initialize Exam DB tables
        init_exam_db(app)
    except Exception as e:
        print(f"Error registering Admin Blueprint: {e}")

    app.run(debug=True, port=5001)