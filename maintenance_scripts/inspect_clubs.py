from app import app, db
from models import Club

with app.app_context():
    clubs = Club.query.all()
    print(f"Total Clubs: {len(clubs)}")
    print("-" * 50)
    for c in clubs:
        print(f"ID: {c.id} | Name: '{c.name}' | Category: {c.category}")
    print("-" * 50)
