// Global variables
let currentUser = null;
let currentClass = null;
let studentsData = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function () {
    // Load user data from localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
        currentUser = JSON.parse(userData);
        loadUserData();
    } else {
        // Redirect to login if no user data
        window.location.href = '/';
    }

    // Initialize date and time
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Load initial data
    loadFacultyClasses();
    loadTodaySchedule();
});

// Load user data into the interface
function loadUserData() {
    if (currentUser) {
        document.getElementById('facultyName').textContent = currentUser.full_name || 'Faculty';
        document.getElementById('facultyId').textContent = currentUser.faculty_id || 'N/A';
        document.getElementById('department').textContent = currentUser.department || 'N/A';
        document.getElementById('designation').textContent = currentUser.designation || 'N/A';
        document.getElementById('experience').textContent = `${currentUser.experience_years || 0} Years`;
    }
}

// Show specific section
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));

    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));

    const activeMenuItem = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }

    // Update page title
    const titles = {
        'dashboard': 'Faculty Dashboard',
        'classes': 'My Classes',
        'attendance': 'Mark Attendance',
        'materials': 'Upload Materials',
        'marks': 'Manage Marks',
        'mentorship': 'Mentorship',
        'schedule': 'Today\'s Schedule'
    };

    document.getElementById('pageTitle').textContent = titles[sectionId] || 'Faculty Dashboard';

    // Load section-specific data
    switch (sectionId) {
        case 'classes':
            loadFacultyClasses();
            break;
        case 'schedule':
            loadTodaySchedule();
            break;
        case 'mentorship':
            loadMentees();
            break;
    }
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const currentDateEl = document.getElementById('currentDate');
    const currentTimeEl = document.getElementById('currentTime');
    const todayDateEl = document.getElementById('todayDate');

    if (currentDateEl) currentDateEl.textContent = dateStr;
    if (currentTimeEl) currentTimeEl.textContent = timeStr;
    if (todayDateEl) todayDateEl.textContent = dateStr;
}

// Load faculty classes
function loadFacultyClasses() {
    if (!currentUser) return;

    fetch(`/api/faculty/classes/${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            updateClassesDisplay(data);
        })
        .catch(error => {
            console.error('Error loading classes:', error);
            // Use mock data for demo
            const mockData = [
                {
                    subject_name: 'Data Structures',
                    subject_code: 'CS501',
                    course_name: 'CSE 3rd Year',
                    semester: 5,
                    student_count: 45,
                    credits: 4
                },
                {
                    subject_name: 'Algorithms',
                    subject_code: 'CS502',
                    course_name: 'CSE 3rd Year',
                    semester: 5,
                    student_count: 42,
                    credits: 4
                },
                {
                    subject_name: 'Database Systems',
                    subject_code: 'CS503',
                    course_name: 'CSE 4th Year',
                    semester: 7,
                    student_count: 38,
                    credits: 3
                }
            ];
            updateClassesDisplay(mockData);
        });
}

// Update classes display
function updateClassesDisplay(classes) {
    const container = document.querySelector('.classes-grid');
    if (!container) return;

    container.innerHTML = '';

    classes.forEach((classData, index) => {
        const card = document.createElement('div');
        card.className = 'class-card';

        card.innerHTML = `
            <h4>${classData.subject_name}</h4>
            <p><strong>Course:</strong> ${classData.course_name}</p>
            <p><strong>Students:</strong> ${classData.student_count}</p>
            <p><strong>Credits:</strong> ${classData.credits}</p>
            <p><strong>Subject Code:</strong> ${classData.subject_code}</p>
            <div class="class-actions">
                <button onclick="markAttendance('${classData.subject_code}')">Mark Attendance</button>
                <button onclick="viewStudents('${classData.subject_code}')">View Students</button>
            </div>
        `;

        container.appendChild(card);
    });
}

// Load today's schedule
function loadTodaySchedule() {
    // Mock implementation for demo
    const scheduleData = [
        {
            time: '9:00 - 10:00 AM',
            subject: 'Data Structures',
            course: 'CSE 3rd Year',
            room: 'Room 101',
            students: 45,
            code: 'DS001'
        },
        {
            time: '11:00 - 12:00 PM',
            subject: 'Algorithms',
            course: 'CSE 3rd Year',
            room: 'Room 102',
            students: 42,
            code: 'ALG001'
        },
        {
            time: '2:00 - 3:00 PM',
            subject: 'Database Systems',
            course: 'CSE 4th Year',
            room: 'Room 201',
            students: 38,
            code: 'DB001'
        }
    ];

    updateScheduleDisplay(scheduleData);
}

// Update schedule display
function updateScheduleDisplay(schedule) {
    const container = document.querySelector('.schedule-timeline');
    if (!container) return;

    container.innerHTML = '';

    schedule.forEach(item => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';

        timelineItem.innerHTML = `
            <div class="time-slot">${item.time}</div>
            <div class="class-info">
                <h4>${item.subject}</h4>
                <p>${item.course} • ${item.room}</p>
                <span class="students-count">${item.students} students</span>
            </div>
            <div class="class-actions">
                <button onclick="markAttendance('${item.code}')">Mark Attendance</button>
            </div>
        `;

        container.appendChild(timelineItem);
    });
}

// Mark attendance for a class
function markAttendance(classCode) {
    currentClass = classCode;
    showSection('attendance');

    // Update class selector
    const classSelect = document.getElementById('classSelect');
    if (classSelect) {
        classSelect.value = classCode;
        loadStudentList();
    }
}

// Load student list for attendance
function loadStudentList() {
    const classSelect = document.getElementById('classSelect');
    const attendanceForm = document.getElementById('attendanceForm');
    const selectedClassEl = document.getElementById('selectedClass');

    if (!classSelect.value) {
        attendanceForm.style.display = 'none';
        return;
    }

    // Mock student data
    studentsData = [
        { rollNo: '2023001', name: 'John Doe', id: 1 },
        { rollNo: '2023002', name: 'Jane Smith', id: 2 },
        { rollNo: '2023003', name: 'Mike Johnson', id: 3 },
        { rollNo: '2023004', name: 'Sarah Wilson', id: 4 },
        { rollNo: '2023005', name: 'David Brown', id: 5 }
    ];

    // Update form display
    attendanceForm.style.display = 'block';

    const classNames = {
        'DS001': 'Data Structures - CSE 3rd Year',
        'ALG001': 'Algorithms - CSE 3rd Year',
        'DB001': 'Database Systems - CSE 4th Year'
    };

    selectedClassEl.textContent = classNames[classSelect.value] || 'Selected Class';

    // Generate student list
    const studentsList = document.getElementById('studentsList');
    studentsList.innerHTML = '';

    studentsData.forEach(student => {
        const row = document.createElement('div');
        row.className = 'student-row';

        row.innerHTML = `
            <span>${student.rollNo}</span>
            <span>${student.name}</span>
            <div class="attendance-toggle">
                <label>
                    <input type="radio" name="attendance_${student.id}" value="present" checked>
                    Present
                </label>
                <label>
                    <input type="radio" name="attendance_${student.id}" value="absent">
                    Absent
                </label>
            </div>
        `;

        studentsList.appendChild(row);
    });
}

// Submit attendance
function submitAttendance() {
    const attendanceData = [];

    studentsData.forEach(student => {
        const selectedOption = document.querySelector(`input[name="attendance_${student.id}"]:checked`);
        if (selectedOption) {
            attendanceData.push({
                student_id: student.id,
                status: selectedOption.value,
                date: new Date().toISOString().split('T')[0]
            });
        }
    });

    // Mock API call
    console.log('Submitting attendance:', attendanceData);

    // Show success message
    alert('Attendance submitted successfully!');

    // Reset form
    cancelAttendance();
}

// Cancel attendance marking
function cancelAttendance() {
    const attendanceForm = document.getElementById('attendanceForm');
    const classSelect = document.getElementById('classSelect');

    attendanceForm.style.display = 'none';
    classSelect.value = '';
}

// View students in a class
function viewStudents(classCode) {
    alert(`Viewing students for class: ${classCode}`);
    // Implementation would show detailed student list
}

// Add new class
function addClass() {
    alert('Add new class functionality would open a modal form');
    // Implementation would show form to add new class
}

// Material upload form submission
document.addEventListener('DOMContentLoaded', function () {
    const materialForm = document.getElementById('materialUploadForm');
    if (materialForm) {
        materialForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData();
            formData.append('title', document.getElementById('materialTitle').value);
            formData.append('subject', document.getElementById('materialSubject').value);
            formData.append('semester', document.getElementById('materialSemester').value);
            formData.append('description', document.getElementById('materialDescription').value);
            formData.append('file', document.getElementById('materialFile').files[0]);

            // Mock upload
            console.log('Uploading material:', Object.fromEntries(formData));
            alert('Material uploaded successfully!');

            // Reset form
            materialForm.reset();
        });
    }
});

// Edit material
function editMaterial(materialId) {
    alert(`Edit material: ${materialId}`);
    // Implementation would show edit form
}

// Delete material
function deleteMaterial(materialId) {
    if (confirm('Are you sure you want to delete this material?')) {
        alert(`Material ${materialId} deleted`);
        // Implementation would delete material
    }
}

// Select exam type for marks
function selectExamType(type) {
    const buttons = document.querySelectorAll('.exam-type-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    event.target.classList.add('active');

    // Load marks for selected exam type
    loadMarksForExamType(type);
}

// Load marks for exam type
function loadMarksForExamType(examType) {
    // Mock implementation
    const marksTableBody = document.getElementById('marksTableBody');
    if (!marksTableBody) return;

    // Mock data
    const mockMarks = [
        { rollNo: '2023001', name: 'John Doe', marks: 85, maxMarks: 100 },
        { rollNo: '2023002', name: 'Jane Smith', marks: 78, maxMarks: 100 },
        { rollNo: '2023003', name: 'Mike Johnson', marks: 92, maxMarks: 100 }
    ];

    marksTableBody.innerHTML = '';

    mockMarks.forEach(student => {
        const row = document.createElement('tr');
        const percentage = ((student.marks / student.maxMarks) * 100).toFixed(1);

        row.innerHTML = `
            <td>${student.rollNo}</td>
            <td>${student.name}</td>
            <td><input type="number" value="${student.marks}" min="0" max="${student.maxMarks}"></td>
            <td>${student.maxMarks}</td>
            <td>${percentage}%</td>
            <td><button onclick="updateMarks('${student.rollNo}')">Update</button></td>
        `;

        marksTableBody.appendChild(row);
    });
}

// Save all marks
function saveMarks() {
    alert('All marks saved successfully!');
    // Implementation would save all marks to database
}

// Export marks to Excel
function exportMarks() {
    alert('Exporting marks to Excel...');
    // Implementation would generate Excel file
}

// Update individual student marks
function updateMarks(rollNo) {
    alert(`Marks updated for student: ${rollNo}`);
    // Implementation would update specific student marks
}

// Load mentees
function loadMentees() {
    console.log('Loading mentees...');
    const container = document.querySelector('.mentee-cards');
    if (!container) return;

    fetch('/api/faculty/my-mentees')
        .then(response => response.json())
        .then(mentees => {
            if (mentees.error) {
                console.error(mentees.error);
                return;
            }

            container.innerHTML = '';

            if (mentees.length === 0) {
                container.innerHTML = '<p>No mentees assigned.</p>';
                document.querySelector('.stat-number').textContent = '0'; // Update total mentees count mock
                return;
            }

            // Update total mentees count in the stats card (approximate location)
            // Assuming the first stat card is Total Mentees
            const totalMenteesStat = document.querySelector('.mentees-stats .stat-card:first-child .stat-number');
            if (totalMenteesStat) totalMenteesStat.textContent = mentees.length;

            mentees.forEach(student => {
                const card = document.createElement('div');
                card.className = 'mentee-card';
                // Random status for demo purposes, or default to Good
                const statuses = ['good', 'warning'];
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                const statusText = status === 'good' ? 'Good' : 'Needs Attention';

                card.innerHTML = `
                    <div class="mentee-info">
                        <h4>${student.name}</h4>
                        <p>Roll: ${student.roll_number} | ${student.branch}</p>
                        <p>CGPA: ${student.cgpa || 'N/A'}</p>
                    </div>
                    <div class="mentee-status ${status}">${statusText}</div>
                    <div class="mentee-actions">
                        <button onclick="chatWithMentee('${student.roll_number}')" class="chat-btn">
                            <i class="fas fa-comment"></i> Chat
                        </button>
                        <button onclick="openResetPasswordModal('${student.id}', '${student.name}')" class="reset-pwd-btn" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin-left: 5px; cursor: pointer;">
                            <i class="fas fa-key"></i> Reset Pwd
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(err => console.error('Error loading mentees:', err));
}

// Chat with mentee
function chatWithMentee(studentId) {
    alert(`Opening chat with student: ${studentId}`);
    // Implementation would open chat interface
}

// Logout function
function logout() {
    localStorage.removeItem('userData');
    window.location.href = '/';
}

// Mobile menu toggle
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

// Add mobile menu button for responsive design
document.addEventListener('DOMContentLoaded', function () {
    if (window.innerWidth <= 768) {
        const header = document.querySelector('.header-left');
        const menuBtn = document.createElement('button');
        menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        menuBtn.className = 'mobile-menu-btn';
        menuBtn.onclick = toggleMobileMenu;
        header.insertBefore(menuBtn, header.firstChild);
    }
});

// --- Mentee Password Reset Functionality ---

function openResetPasswordModal(studentId, studentName) {
    document.getElementById('resetStudentId').value = studentId;
    document.getElementById('resetStudentName').textContent = studentName;
    document.getElementById('newStudentPassword').value = '';
    document.getElementById('resetPasswordModal').style.display = 'block';
}

function closeResetPasswordModal() {
    document.getElementById('resetPasswordModal').style.display = 'none';
}

function submitStudentPasswordReset() {
    const studentId = document.getElementById('resetStudentId').value;
    const newPassword = document.getElementById('newStudentPassword').value;

    fetch('/api/faculty/reset-student-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            student_id: studentId,
            new_password: newPassword
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                closeResetPasswordModal();
            } else {
                alert(data.message || 'Failed to reset password');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while resetting password');
        });
}