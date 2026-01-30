from app import app, db
from models import Club, Faculty

def update_clubs():
    with app.app_context():
        # Clean up existing duplicate clubs
        print("Clearing existing clubs...")
        db.session.query(Club).delete()
        db.session.commit()

        clubs_data = [
            {
                "name": "BinaryBrains",
                "description": "The official Coding & Tech club. We organize hackathons, coding workshops, and tech talks.",
                "category": "technical",
                "interests": "coding,tech,events,social media",
                "contact_email": "binarybrains@college.edu",
                "instagram_link": "https://instagram.com/binarybrains"
            },
            {
                "name": "Saaz Room",
                "description": "The music soul of the campus. Jamming sessions, open mics, and musical artists community.",
                "category": "cultural",
                "interests": "music,artist,jamming,social media",
                "contact_email": "saaz@college.edu",
                "instagram_link": "https://instagram.com/saazroom"
            },
            {
                "name": "LFA (Literature & Fine Arts)",
                "description": "For the creative minds. We handle the college magazine, content writing, marketing, and logistics for events.",
                "category": "cultural",
                "interests": "magazines,content writing,social media,marketing,logistics",
                "contact_email": "lfa@college.edu",
                "instagram_link": "https://instagram.com/lfa_official"
            },
            {
                "name": "LJSE (Social Events)",
                "description": "Organizing cultural activities, social media campaigns, and major campus events.",
                "category": "cultural",
                "interests": "cultural activities,social media,events",
                "contact_email": "ljse@college.edu",
                "instagram_link": "https://instagram.com/ljse_events"
            }
        ]

        # Get a default faculty coordinator if none exists
        coordinator = Faculty.query.first()
        
        for data in clubs_data:
            existing_club = Club.query.filter_by(name=data["name"]).first()
            if existing_club:
                print(f"Updating {data['name']}...")
                existing_club.description = data["description"]
                existing_club.category = data["category"]
                existing_club.interests = data["interests"]
                existing_club.contact_email = data["contact_email"]
                existing_club.instagram_link = data["instagram_link"]
            else:
                print(f"Creating {data['name']}...")
                new_club = Club(
                    name=data["name"],
                    description=data["description"],
                    category=data["category"],
                    interests=data["interests"],
                    contact_email=data["contact_email"],
                    instagram_link=data["instagram_link"],
                    faculty_coordinator=coordinator.id if coordinator else None,
                    is_active=True
                )
                db.session.add(new_club)
        
        db.session.commit()
        print("Clubs updated successfully!")

if __name__ == "__main__":
    update_clubs()
