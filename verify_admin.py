import json
import urllib.request
import urllib.error
from datetime import datetime

BASE_URL = 'http://127.0.0.1:5002/api/admin/exams'

def make_request(url, method='GET', data=None):
    req = urllib.request.Request(url, method=method)
    req.add_header('Content-Type', 'application/json')
    
    if data:
        json_data = json.dumps(data).encode('utf-8')
        req.data = json_data
        
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode('utf-8')
            try:
                return status, json.loads(body), response.headers
            except:
                return status, body, response.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8'), e.headers
    except Exception as e:
        return 500, str(e), {}

def test_create_schedule():
    print("\nTesting Create Schedule...")
    data = {
        'name': 'Winter Semester Exams 2026',
        'academic_year': '2025-26',
        'semester_type': '5',
        'start_date': '2026-11-15',
        'end_date': '2026-11-30'
    }
    status, res, _ = make_request(f"{BASE_URL}/schedule", 'POST', data)
    print("Status:", status)
    print("Response:", res)
    return res.get('id') if isinstance(res, dict) else None

def test_add_timetable(schedule_id):
    print("\nTesting Add Timetable...")
    data = [
        {
            'exam_schedule_id': schedule_id,
            'subject_id': 1,
            'exam_date': '2026-11-16',
            'start_time': '10:00',
            'end_time': '13:00',
            'room_number': 'Hall-A',
            'faculty_id': 1
        },
        {
            'exam_schedule_id': schedule_id,
            'subject_id': 2,
            'exam_date': '2026-11-18',
            'start_time': '10:00',
            'end_time': '13:00',
            'room_number': 'Hall-B',
            'faculty_id': 1
        }
    ]
    status, res, _ = make_request(f"{BASE_URL}/timetable", 'POST', data)
    print("Status:", status)
    print("Response:", res)

def test_get_timetable(schedule_id):
    print(f"\nTesting Get Timetable for Schedule {schedule_id}...")
    status, res, _ = make_request(f"{BASE_URL}/timetable/{schedule_id}")
    print("Status:", status)
    print("Response:", json.dumps(res, indent=2))

def test_publish(schedule_id):
    print(f"\nTesting Publish Schedule {schedule_id}...")
    status, res, _ = make_request(f"{BASE_URL}/publish/{schedule_id}", 'POST')
    print("Status:", status)
    print("Response:", res)

def test_re_candidates():
    print("\nTesting Get Re-candidates...")
    status, res, _ = make_request(f"{BASE_URL}/re-candidates")
    print("Status:", status)
    print("Response:", res)

def test_export():
    print("\nTesting Export Results...")
    status, res, headers = make_request(f"{BASE_URL}/results/export?department=Computer%20Science&semester=5")
    print("Status:", status)
    print("Content Type:", headers.get('Content-Type'))
    print("Content Preview:", res[:200])

if __name__ == "__main__":
    try:
        schedule_id = test_create_schedule()
        if schedule_id:
            test_add_timetable(schedule_id)
            test_get_timetable(schedule_id)
            test_publish(schedule_id)
        
        test_re_candidates()
        test_export()
        print("\nAll Tests Completed.")
    except Exception as e:
        print(f"\nTest Failed: {e}")
