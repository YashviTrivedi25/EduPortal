import urllib.request
import json
import urllib.error

BASE_URL = 'http://localhost:5001/api/admin/faculty'

faculty_data = [
    {
        "full_name": "Dr. Alan Turing",
        "email": "alan.turing@college.edu",
        "department": "Computer Science",
        "designation": "Professor",
        "specialization": "Artificial Intelligence",
        "experience_years": 15,
        "assigned_classes": "CSE-A, CSE-B",
        "assigned_semesters": "1st, 3rd",
        "assigned_subjects": "Algorithms, AI"
    },
     {
        "full_name": "Dr. Marie Curie",
        "email": "marie.curie@college.edu",
        "department": "Electronics",
        "designation": "Professor",
        "specialization": "Physics & Electronics",
        "experience_years": 20,
        "assigned_classes": "ECE-A",
        "assigned_semesters": "2nd, 4th",
        "assigned_subjects": "Semiconductors, Physics"
    },
    {
        "full_name": "Prof. Richard Feynman",
        "email": "richard.feynman@college.edu",
        "department": "Mechanical",
        "designation": "Associate Professor",
        "specialization": "Quantum Mechanics",
        "experience_years": 12,
        "assigned_classes": "ME-A, ME-B",
        "assigned_semesters": "1st, 2nd",
        "assigned_subjects": "Thermodynamics, Mechanics"
    },
    {
        "full_name": "Dr. Grace Hopper",
        "email": "grace.hopper@college.edu",
        "department": "Computer Science",
        "designation": "Assistant Professor",
        "specialization": "Programming Languages",
        "experience_years": 8,
        "assigned_classes": "CSE-C",
        "assigned_semesters": "5th, 6th",
        "assigned_subjects": "Compiler Design, COBOL"
    }
]

def add_faculty(data):
    try:
        req = urllib.request.Request(BASE_URL, method='POST')
        req.add_header('Content-Type', 'application/json')
        
        json_data = json.dumps(data).encode('utf-8')
        req.data = json_data
        
        with urllib.request.urlopen(req) as response:
            print(f"Added {data['full_name']}: {response.getcode()}")
            return True
    except urllib.error.HTTPError as e:
        if e.code == 400:
            print(f"Faculty {data['full_name']} might already exist. Trying to update (finding ID first)...")
            # This is a bit complex without a direct search by email endpoint, 
            # but we can list all and find the ID.
            try:
                # 1. Get all
                with urllib.request.urlopen(BASE_URL) as list_resp:
                     all_faculty = json.loads(list_resp.read().decode())
                     
                # 2. Find by email
                target_id = None
                for f in all_faculty:
                    if f['email'] == data['email']:
                        target_id = f['id']
                        break
                
                if target_id:
                     # 3. Update
                     update_url = f"{BASE_URL}/{target_id}"
                     req_upd = urllib.request.Request(update_url, method='PUT')
                     req_upd.add_header('Content-Type', 'application/json')
                     req_upd.data = json_data
                     with urllib.request.urlopen(req_upd) as upd_resp:
                         print(f"Updated {data['full_name']}: {upd_resp.getcode()}")
                         return True
                else:
                    print(f"Could not find ID for {data['email']} to update.")
            except Exception as inner_e:
                print(f"Failed to update: {inner_e}")

        else:
            print(f"Failed to add {data['full_name']}: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")
    return False

if __name__ == "__main__":
    print("Adding demo faculty data...")
    for faculty in faculty_data:
        add_faculty(faculty)
    print("Done.")
