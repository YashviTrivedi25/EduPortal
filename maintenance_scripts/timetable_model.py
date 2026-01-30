from extensions import db

class ClassSchedule(db.Model):
    __tablename__ = 'class_schedule'
    
    id = db.Column(db.Integer, primary_key=True)
    division = db.Column(db.String(5))   # A, B, C
    batch = db.Column(db.String(10))     # A1, A2... B1...
    day_of_week = db.Column(db.String(15)) # Monday, Tuesday...
    time_slot = db.Column(db.String(50))   # "08:45 to 09:45"
    
    entry_type = db.Column(db.String(20)) # 'Lecture', 'Lab', 'Break'
    
    subject = db.Column(db.String(100))
    faculty = db.Column(db.String(100))
    room = db.Column(db.String(50))
    
    # Optional sorting helper
    day_order = db.Column(db.Integer, default=0) # Mon=1, Tue=2...
    
    def to_dict(self):
        return {
            'day': self.day_of_week,
            'time': self.time_slot,
            'type': self.entry_type,
            'subject': self.subject,
            'faculty': self.faculty,
            'room': self.room,
            'batch': self.batch
        }
