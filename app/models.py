from app.extensions import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # student, faculty, admin
    full_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    roll_number = db.Column(db.String(20), unique=True, nullable=False)
    enrollment_number = db.Column(db.String(20), unique=True, nullable=False)
    current_semester = db.Column(db.Integer, nullable=False, default=2)
    branch = db.Column(db.String(50), nullable=False)
    division = db.Column(db.String(5))
    batch = db.Column(db.String(10))
    mentor = db.Column(db.String(100))
    function = db.Column(db.Integer, default=1)  # 1=Active, 0=Inactive
    admission_year = db.Column(db.Integer, nullable=False)
    function = db.Column(db.Integer, default=1)  # 1=Active, 0=Inactive
    admission_year = db.Column(db.Integer, nullable=False)
    # Removed: cgpa, photo_url, annual_income, category, gender, blood_group, emergency_contact, address
    
    user = db.relationship('User', backref=db.backref('student', uselist=False))

class Faculty(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    faculty_id = db.Column(db.String(20), unique=True, nullable=False)
    # Kept only requested columns
    assigned_semesters = db.Column(db.String(100)) # e.g., "4"
    assigned_subjects = db.Column(db.String(200)) # e.g., "FCSP-1, PS"
    
    user = db.relationship('User', backref=db.backref('faculty', uselist=False))

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    course_code = db.Column(db.String(10), unique=True, nullable=False)
    course_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50), nullable=False)
    duration_years = db.Column(db.Integer, nullable=False)
    total_semesters = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Subject model removed


# SubjectAssignment model removed


class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    # subject_id removed as Subject table is deleted
    subject_name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(10), nullable=False)  # present, absent
    marked_by = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    
    student = db.relationship('Student', backref='attendances')
    faculty = db.relationship('Faculty', backref='marked_attendances')

# Marks model removed


# Notice model removed


# StudyMaterial model removed


# FeeStructure and FeePayment models removed


# Event model removed


class Club(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # technical, cultural, sports, social
    interests = db.Column(db.Text)  # comma-separated interests
    faculty_coordinator = db.Column(db.Integer, db.ForeignKey('faculty.id'))
    student_coordinator = db.Column(db.String(100))
    meeting_schedule = db.Column(db.String(200))
    contact_email = db.Column(db.String(100))
    instagram_link = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    
    coordinator = db.relationship('Faculty', backref='coordinated_clubs')

class ClubRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    club_id = db.Column(db.Integer, db.ForeignKey('club.id'), nullable=False)
    status = db.Column(db.String(20), default='pending') # pending, approved, rejected
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    student = db.relationship('Student', backref='club_requests')
    club = db.relationship('Club', backref='requests')

class Timetable(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Flexible columns for PDF ingestion
    division = db.Column(db.String(5))   # A, B, C
    batch = db.Column(db.String(10))     # A1, B1, etc.
    day_of_week = db.Column(db.String(15))
    time_slot = db.Column(db.String(50))
    
    # Raw extracted strings
    subject_raw = db.Column(db.String(100))
    faculty_raw = db.Column(db.String(100))
    room_number = db.Column(db.String(50))
    
    # Optional links to core tables (can be populated later if needed)
    semester = db.Column(db.Integer, default=4, nullable=False)
    academic_year = db.Column(db.String(10), nullable=True)

# StudentQuery and QueryResponse models removed


class Scholarship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # merit, need, minority, sports
    eligibility_criteria = db.Column(db.Text, nullable=False)
    min_cgpa = db.Column(db.Float, default=0.0)
    max_family_income = db.Column(db.Float, default=0.0)
    eligible_categories = db.Column(db.String(200))  # general,obc,sc,st,ews
    eligible_genders = db.Column(db.String(50))  # male,female,other,all
    amount = db.Column(db.Float, nullable=False)
    deadline = db.Column(db.Date, nullable=False)
    official_website = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_by_role = db.Column(db.String(20), nullable=False) # faculty, admin
    visible_to = db.Column(db.String(20), nullable=False) # student, faculty, both
    
    # Targeting (Nullable = All)
    target_branch = db.Column(db.String(50)) # branch name or id
    target_semester = db.Column(db.Integer)
    target_class_id = db.Column(db.String(20)) # e.g., 'CS-A'
    
    urgency = db.Column(db.String(20), default='low') # urgent, moderate, low
    is_active = db.Column(db.Boolean, default=True)
    publish_at = db.Column(db.DateTime, default=datetime.utcnow)
    expire_at = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    author = db.relationship('User')

# ScholarshipApplication model removed


class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)  # notice, query, fee, scholarship, attendance
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='notifications')

# Mentorship model removed


# LectureSwapRequest model removed (Replaced by QueryThread system)

class QueryThread(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=True) # Nullable if unassigned initially
    subject_name = db.Column(db.String(100), nullable=True) # Nullable for mentorship
    title = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(20), default='pending') # pending, answered, resolved, clarification
    priority = db.Column(db.String(20), default='normal')
    query_type = db.Column(db.String(20), default='academic') # 'academic' or 'mentorship'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = db.relationship('Student', backref='query_threads')
    faculty = db.relationship('Faculty', backref='assigned_queries')

class QueryPost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    thread_id = db.Column(db.Integer, db.ForeignKey('query_thread.id'), nullable=False)
    author_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) # User ID of sender
    role = db.Column(db.String(20), nullable=False) # student, faculty
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    thread = db.relationship('QueryThread', backref=db.backref('posts', order_by=created_at))
    author = db.relationship('User')

class QueryAttachment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('query_post.id'), nullable=False)
    file_url = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50))
    file_name = db.Column(db.String(200)) # Original name
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    post = db.relationship('QueryPost', backref='attachments')


class ExamSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) # e.g. "Winter Semester 2025"
    academic_year = db.Column(db.String(20), nullable=False)
    semester_type = db.Column(db.String(20)) # odd/even or specific semester number
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Exam(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    exam_schedule_id = db.Column(db.Integer, db.ForeignKey('exam_schedule.id'), nullable=False)
    subject_name = db.Column(db.String(100), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.id')) # Invigilator
    exam_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    room_number = db.Column(db.String(20))
    
    exam_schedule = db.relationship('ExamSchedule', backref='exams')
    faculty = db.relationship('Faculty', backref='invigilated_exams')

class ExamTimetable(db.Model):
    __tablename__ = 'exam_timetable'
    id = db.Column(db.Integer, primary_key=True)
    exam_schedule_id = db.Column(db.Integer, db.ForeignKey('exam_schedule.id'), nullable=False)
    subject_id = db.Column(db.Integer, nullable=True) # Could be linked to a Subject table if exists, else raw
    # Fallback to name if ID not used
    subject_name = db.Column(db.String(100), nullable=True)
    
    exam_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.String(10), nullable=False) # e.g. "10:00"
    end_time = db.Column(db.String(10), nullable=False)   # e.g. "13:00"
    room_number = db.Column(db.String(50), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.id')) # Invigilator
    
    # Relationships
    exam_schedule = db.relationship('ExamSchedule', backref=db.backref('timetable_entries', lazy=True))
    faculty = db.relationship('Faculty', backref='exam_duties')
