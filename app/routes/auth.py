from flask import Blueprint, request, jsonify, session, g
from werkzeug.security import check_password_hash
from itsdangerous import URLSafeTimedSerializer
from flask import current_app
from app.models import User, Student, Faculty

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/login', methods=['POST'])
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
        s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
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

@auth_bp.route('/api/get_current_user/<int:user_id>')
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
