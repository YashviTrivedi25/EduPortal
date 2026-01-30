
import os

def fix_app_structure():
    with open('app.py', 'r', encoding='utf-8') as f:
         lines = f.readlines()
    
    run_line_index = -1
    for i, line in enumerate(lines):
        if 'app.run(debug=True, port=5001)' in line:
            run_line_index = i
            break
            
    if run_line_index == -1:
        print("Could not find app.run line")
        return

    # Extract new routes which are after app.run
    # We look for the marker
    routes_start_index = -1
    for i in range(run_line_index + 1, len(lines)):
        if '# --- Query Resolution System Routes ---' in lines[i]:
            routes_start_index = i
            break
            
    if routes_start_index != -1:
        print(f"Found routes at line {routes_start_index}")
        routes_block = lines[routes_start_index:]
        
        # New structure: 
        # 1. Everything before app.run
        # 2. Routes block
        # 3. app.run line
        
        # Be careful not to include app.run in "before" if we split by index
        before_run = lines[:run_line_index]
        run_line = lines[run_line_index]
        
        new_content = "".join(before_run) + "\n" + "".join(routes_block) + "\n" + run_line
        
        with open('app.py', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Moved routes before app.run()")
    else:
        print("Routes block not found after app.run")

if __name__ == "__main__":
    fix_app_structure()
