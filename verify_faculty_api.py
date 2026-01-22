import urllib.request
import urllib.parse
import json
import urllib.error

BASE_URL = 'http://localhost:5001/api/admin/faculty'

def make_request(url, method='GET', data=None):
    try:
        req = urllib.request.Request(url, method=method)
        req.add_header('Content-Type', 'application/json')
        
        if data:
            json_data = json.dumps(data).encode('utf-8')
            req.data = json_data
            
        with urllib.request.urlopen(req) as response:
            print(f"Status: {response.getcode()}")
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code}")
        print(e.read().decode())
    except Exception as e:
        print(f"Failed: {e}")
    return None

def test_get_all():
    print("Testing GET ALL...")
    result = make_request(BASE_URL)
    if result:
        print(f"Count: {len(result)}")
        if len(result) > 0:
            return result[0]['id']
    return None

def test_get_one(id):
    print(f"\nTesting GET ONE ({id})...")
    result = make_request(f"{BASE_URL}/{id}")
    print(result)

def test_update(id):
    print(f"\nTesting UPDATE ({id})...")
    data = {"full_name": "Updated Name Test"}
    result = make_request(f"{BASE_URL}/{id}", method='PUT', data=data)
    print(result)

if __name__ == "__main__":
    faculty_id = test_get_all()
    if faculty_id:
        test_get_one(faculty_id)
        test_update(faculty_id)
        test_get_one(faculty_id)
