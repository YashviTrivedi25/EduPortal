
@app.route('/api/faculty/timetable/change', methods=['POST'])
def change_lecture():
    if 'user_id' not in session or session.get('role') != 'faculty':
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    
    timetable_id = data.get('timetable_id')
    new_faculty_id = data.get('new_faculty_id') # ID of Faculty user to swap with? Or Faculty ID? Assume Faculty ID.
    change_type = data.get('change_type') # 'temporary' or 'permanent'
    swap_date_str = data.get('date') # Format YYYY-MM-DD
    reason = data.get('reason', 'Faculty Unavailable')
    
    # Validation
    if not all([timetable_id, new_faculty_id, change_type]):
        return jsonify({'error': 'Missing required fields'}), 400
        
    currentUser = User.query.get(session['user_id'])
    currentFaculty = Faculty.query.filter_by(user_id=currentUser.id).first()
    
    # 1. Verify Timetable Entry
    timetable_entry = Timetable.query.get(timetable_id)
    if not timetable_entry:
        return jsonify({'error': 'Timetable entry not found'}), 404
        
    # Verify ownership (Can only swap OWN lectures? Or admin can do any?)
    # For now assume Faculty can only swap THEIR OWN lectures unless admin.
    if timetable_entry.faculty_id != currentFaculty.id:
         return jsonify({'error': 'You can only change your own lectures.'}), 403
         
    new_faculty = Faculty.query.get(new_faculty_id)
    if not new_faculty:
         return jsonify({'error': 'Target faculty not found'}), 404
         
    if change_type == 'permanent':
        # 2. Permanent Change: Update Master Table
        # Update faculty_id
        timetable_entry.faculty_id = new_faculty_id
        db.session.commit()
        return jsonify({'success': True, 'message': 'Timetable updated permanently.'})
        
    elif change_type == 'temporary':
        if not swap_date_str:
            return jsonify({'error': 'Date is required for temporary swap'}), 400
        
        try:
            swap_date = datetime.strptime(swap_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400
            
        # Create Swap Request
        # In this simple flow, we auto-approve or maybe set to pending.
        # Requirement: "ask... if change is temporary... otherwise do change". 
        # So it implies direct action.
        
        swap_request = LectureSwapRequest(
            timetable_id=timetable_id,
            original_faculty_id=currentFaculty.id,
            new_faculty_id=new_faculty_id,
            swap_date=swap_date,
            is_permanent=False,
            status='approved', # Direct change
            reason=reason
        )
        db.session.add(swap_request)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Lecture rescheduled successfully for ' + swap_date_str})
    
    return jsonify({'error': 'Invalid change type'}), 400
