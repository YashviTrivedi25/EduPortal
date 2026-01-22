from extensions import db
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
    cgpa = db.Column(db.Float, default=0.0)
    photo_url = db.Column(db.String(500))
    annual_income = db.Column(db.Float, default=0.0)
    category = db.Column(db.String(20))  # general, obc, sc, st, ews
    gender = db.Column(db.String(10))
    blood_group = db.Column(db.String(5))
    emergency_contact = db.Column(db.String(15))
    address = db.Column(db.Text)
    
    user = db.relationship('User', backref=db.backref('student', uselist=False))

class Faculty(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    faculty_id = db.Column(db.String(20), unique=True, nullable=False)
    designation = db.Column(db.String(50), nullable=False)
    experience_years = db.Column(db.Integer, default=0)
    specialization = db.Column(db.String(100))
    # New fields for enhanced details
    assigned_classes = db.Column(db.String(200)) # e.g., "CSE-A, CSE-B"
    assigned_semesters = db.Column(db.String(100)) # e.g., "1st, 3rd"
    assigned_subjects = db.Column(db.String(200)) # e.g., "Data Stuctures, Algorithms"
    
    user = db.relationship('User', backref=db.backref('faculty', uselist=False))

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    course_code = db.Column(db.String(10), unique=True, nullable=False)
    course_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50), nullable=False)
    duration_years = db.Column(db.Integer, nullable=False)
    total_semesters = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_code = db.Column(db.String(10), unique=True, nullable=False)
    subject_name = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    credits = db.Column(db.Integer, default=3)
    
    course = db.relationship('Course', backref='subjects')

class SubjectAssignment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    academic_year = db.Column(db.String(10), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    
    faculty = db.relationship('Faculty', backref='assignments')
    subject = db.relationship('Subject', backref='assignments')

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(10), nullable=False)  # present, absent
    marked_by = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    
    student = db.relationship('Student', backref='attendances')
    subject = db.relationship('Subject', backref='attendances')
    faculty = db.relationship('Faculty', backref='marked_attendances')

class Marks(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    exam_type = db.Column(db.String(20), nullable=False)  # internal, external, assignment
    marks_obtained = db.Column(db.Float, nullable=False)
    max_marks = db.Column(db.Float, nullable=False)
    exam_date = db.Column(db.Date)
    semester = db.Column(db.Integer, nullable=False)
    
    student = db.relationship('Student', backref='marks')
    subject = db.relationship('Subject', backref='marks')

class Notice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    notice_type = db.Column(db.String(20), nullable=False)  # general, exam, holiday, event, urgent
    target_audience = db.Column(db.String(20), nullable=False)  # all, students, faculty, department
    department = db.Column(db.String(50))  # if target is department
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    
    creator = db.relationship('User', backref='notices')

class StudyMaterial(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(10), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    subject = db.relationship('Subject', backref='materials')
    faculty = db.relationship('Faculty', backref='materials')

class FeeStructure(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    tuition_fee = db.Column(db.Float, nullable=False)
    lab_fee = db.Column(db.Float, default=0.0)
    library_fee = db.Column(db.Float, default=0.0)
    other_fees = db.Column(db.Float, default=0.0)
    total_fee = db.Column(db.Float, nullable=False)
    academic_year = db.Column(db.String(10), nullable=False)
    
    course = db.relationship('Course', backref='fee_structures')

class FeePayment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    fee_structure_id = db.Column(db.Integer, db.ForeignKey('fee_structure.id'), nullable=False)
    amount_paid = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    payment_method = db.Column(db.String(20), nullable=False)
    transaction_id = db.Column(db.String(100), unique=True)
    status = db.Column(db.String(20), default='completed')
    
    student = db.relationship('Student', backref='fee_payments')
    fee_structure = db.relationship('FeeStructure', backref='payments')

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    event_type = db.Column(db.String(50), nullable=False)  # technical, cultural, sports, workshop
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    venue = db.Column(db.String(200))
    organizer_name = db.Column(db.String(100))
    contact_person = db.Column(db.String(100))
    contact_phone = db.Column(db.String(15))
    contact_email = db.Column(db.String(100))
    registration_required = db.Column(db.Boolean, default=False)
    registration_deadline = db.Column(db.DateTime)
    max_participants = db.Column(db.Integer)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    creator = db.relationship('User', backref='created_events')

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
    is_active = db.Column(db.Boolean, default=True)
    
    coordinator = db.relationship('Faculty', backref='coordinated_clubs')

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
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=True)
    semester = db.Column(db.Integer, nullable=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=True)
    academic_year = db.Column(db.String(10), nullable=True)
    
    course = db.relationship('Course', backref='timetables')
    subject = db.relationship('Subject', backref='timetable_entries')
    faculty = db.relationship('Faculty', backref='timetable_entries')

class StudentQuery(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    query_title = db.Column(db.String(200), nullable=False)
    query_description = db.Column(db.Text, nullable=False)
    attachment_url = db.Column(db.String(500))  # for photo upload
    status = db.Column(db.String(20), default='pending')  # pending, answered, closed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    answered_at = db.Column(db.DateTime)
    
    student = db.relationship('Student', backref='subject_queries')
    faculty = db.relationship('Faculty', backref='student_queries')
    subject = db.relationship('Subject', backref='student_queries')

class QueryResponse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    query_id = db.Column(db.Integer, db.ForeignKey('student_query.id'), nullable=False)
    response_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    query = db.relationship('StudentQuery', backref='responses')

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

class ScholarshipApplication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    scholarship_id = db.Column(db.Integer, db.ForeignKey('scholarship.id'), nullable=False)
    application_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    documents_submitted = db.Column(db.Boolean, default=False)
    
    student = db.relationship('Student', backref='scholarship_applications')
    scholarship = db.relationship('Scholarship', backref='applications')

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)  # notice, query, fee, scholarship, attendance
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='notifications')

class Mentorship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    assigned_date = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    faculty = db.relationship('Faculty', backref='mentees')
    student = db.relationship('Student', backref='mentors')
