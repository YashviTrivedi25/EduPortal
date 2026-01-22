import urllib.request
import json
import urllib.error
import time

BASE_URL = 'http://localhost:5001/api/admin/faculty'

def make_request(url, method='GET', data=None):
    try:
        req = urllib.request.Request(url, method=method)
        req.add_header('Content-Type', 'application/json')
        if data:
            req.data = json.dumps(data).encode('utf-8')
        
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Error {method} {url}: {e.code} - {e.read().decode()}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def verify_enhancements():
    print("1. Adding new faculty with details...")
    new_faculty = {
        "full_name": "Test Prof Enhanced",
        "email": f"test.enhanced.{int(time.time())}@college.edu",
        "department": "Computer Science",
        "designation": "Professor",
        "specialization": "Testing",
        "experience_years": 5,
        "assigned_classes": "CS-Test-A",
        "assigned_semesters": "1st",
        "assigned_subjects": "Unit Testing"
    }
    
    result = make_request(BASE_URL, 'POST', new_faculty)
    if not result or not result.get('success'):
        print("Failed to add faculty.")
        return
    
    faculty_id = result['id']
    print(f"   Created ID: {faculty_id}")
    
    print("2. Verifying details (GET)...")
    details = make_request(f"{BASE_URL}/{faculty_id}")
    if details:
        print(f"   Classes: {details.get('assigned_classes')}")
        print(f"   Semesters: {details.get('assigned_semesters')}")
        print(f"   Subjects: {details.get('assigned_subjects')}")
        
        if details.get('assigned_classes') == "CS-Test-A":
             print("   [PASS] Details match.")
        else:
             print("   [FAIL] Details mismatch.")
    
    print("3. Verifying Soft Delete...")
    delete_res = make_request(f"{BASE_URL}/{faculty_id}", 'DELETE')
    if delete_res and delete_res.get('success'):
        print("   Delete successful.")
        
        # Verify it's gone from list
        all_faculty = make_request(BASE_URL)
        found = any(f['id'] == faculty_id for f in all_faculty)
        if not found:
            print("   [PASS] Faculty removed from list (Soft Delete worked).")
        else:
            print("   [FAIL] Faculty still in list.")
    else:
        print("   Delete failed.")

if __name__ == "__main__":
    # Wait a bit for server to restart if called immediately
    time.sleep(2) 
    verify_enhancements()
