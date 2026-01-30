
import os

new_code = r'''
# --- Query Resolution System Routes ---

@app.route('/api/queries/create', methods=['POST'])
def create_query():
    data = request.json
    try:
        student_id = data.get('student_id')
        subject_name = data.get('subject_name')
        title = data.get('title')
        content = data.get('content')
        faculty_id = data.get('faculty_id') # Optional, if student selects specific faculty

        # Auto-assign faculty logic if not provided
        if not faculty_id:
             # Find faculty who teaches this subject (simple keyword match in assigned_subjects)
             # This is a basic "First Match" routing. Scalable systems would use load balancing.
             potential_faculty = Faculty.query.filter(Faculty.assigned_subjects.contains(subject_name)).first()
             if potential_faculty:
                 faculty_id = potential_faculty.id
        
        # Create Thread
        thread = QueryThread(
            student_id=student_id,
            faculty_id=faculty_id,
            subject_name=subject_name,
            title=title,
            status='pending'
        )
        db.session.add(thread)
        db.session.flush() # Get ID

        # Create First Post
        # We need User ID of the student. data['student_id'] is Student Table ID.
        student = Student.query.get(student_id)
        if not student:
             return jsonify({'error': 'Student not found'}), 404

        post = QueryPost(
            thread_id=thread.id,
            author_user_id=student.user_id,
            role='student',
            content=content
        )
        db.session.add(post)
        
        # Notification to Faculty
        if faculty_id:
            faculty = Faculty.query.get(faculty_id)
            if faculty:
                notif = Notification(
                    user_id=faculty.user_id,
                    title="New Academic Query",
                    message=f"New query in {subject_name}: {title}",
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
    # Fetch threads for this student
    threads = QueryThread.query.filter_by(student_id=student_id).order_by(QueryThread.updated_at.desc()).all()
    
    result = []
    for t in threads:
        result.append({
            'id': t.id,
            'title': t.title,
            'subject': t.subject_name,
            'status': t.status,
            'faculty_name': t.faculty.user.full_name if t.faculty else "Unassigned",
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
        posts_data.append({
            'id': p.id,
            'author_name': p.author.full_name,
            'role': p.role,
            'content': p.content,
            'created_at': p.created_at.strftime('%Y-%m-%d %H:%M')
            # Attachments would go here
        })
        
    return jsonify({
        'id': thread.id,
        'title': thread.title,
        'subject': thread.subject_name,
        'status': thread.status,
        'faculty_id': thread.faculty_id,
        'faculty_name': thread.faculty.user.full_name if thread.faculty else None,
        'posts': posts_data
    })

@app.route('/api/queries/<int:thread_id>/reply', methods=['POST'])
def reply_to_query(thread_id):
    data = request.json
    user_id = data.get('user_id') # User Table ID of the replier
    role = data.get('role') # 'student' or 'faculty'
    content = data.get('content')
    
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
    
    # Update Thread Status/Time
    thread.updated_at = datetime.utcnow()
    if role == 'faculty':
        thread.status = 'answered'
        # Notify Student
        notif = Notification(
            user_id=thread.student.user_id,
            title="Query Update",
            message=f"Faculty replied to: {thread.title}",
            notification_type="query"
        )
        db.session.add(notif)
        
    elif role == 'student' and thread.status == 'answered':
         # If student replies to an answer, maybe move back to pending or clarification?
         # "Follow-ups stay under same query card" - Request implies status logic
         thread.status = 'clarification'
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/queries/<int:thread_id>/resolve', methods=['POST'])
def resolve_query(thread_id):
    # Only student can mark resolved usually, or faculty?
    thread = QueryThread.query.get(thread_id)
    if not thread:
        return jsonify({'error': 'Thread not found'}), 404
        
    thread.status = 'resolved'
    thread.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/common/subjects')
def get_common_subjects():
    # Helper to get unique subjects from Timetable for Dropdown
    # Since Subject table is gone, we aggregate distinct names
    try:
        subjects = db.session.query(Timetable.subject_raw).distinct().all()
        # subjects is list of tuples [('Math',), ('Physics',)]
        subject_list = [s[0] for s in subjects if s[0]]
        return jsonify(sorted(subject_list))
    except:
        return jsonify([])
'''

def fix_app_file():
    with open('app.py', 'rb') as f:
        content = f.read()
    
    # Split by lines
    lines = content.split(b'\n')
    
    # Keep lines until 'app.run(debug=True, port=5001)'
    # We look for the last occurrence or key line
    clean_lines = []
    found_end = False
    
    for line in lines:
        try:
            line_str = line.decode('utf-8').strip()
            # print(line_str)
            if 'app.run(debug=True, port=5001)' in line_str:
                clean_lines.append(line)
                found_end = True
                break
            
            # Simple check to stop if we hit null bytes
            if b'\x00' in line:
                break
                
            clean_lines.append(line)
        except:
            # Encoding error means we hit garbage
            break
            
    if found_end:
        print("Trimming file at 'app.run'. Appending new code...")
        
        with open('app.py', 'wb') as f:
            f.write(b'\n'.join(clean_lines))
            f.write(b'\n')
            f.write(new_code.encode('utf-8'))
        print("Success: app.py repaired.")
    else:
        print("Error: Could not find 'app.run' line to truncate safely.")

if __name__ == "__main__":
    fix_app_file()
