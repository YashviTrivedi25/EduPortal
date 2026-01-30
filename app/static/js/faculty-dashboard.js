// Global variables
// --- Auth Token Injection (Multi-Tab Support) ---
const originalFetch = window.fetch;
window.fetch = function (url, options) {
    options = options || {};
    options.headers = options.headers || {};

    // Inject Token
    const userDataStr = sessionStorage.getItem('userData');
    if (userDataStr) {
        try {
            const userData = JSON.parse(userDataStr);
            if (userData.token) {
                if (options.headers instanceof Headers) {
                    options.headers.append('X-Auth-Token', userData.token);
                } else {
                    options.headers['X-Auth-Token'] = userData.token;
                }
            }
        } catch (e) { console.error("Auth Token Error", e); }
    }
    return originalFetch(url, options);
};
// ------------------------------------------------

let currentUser = null;
let currentClass = null;
let studentsData = [];

// Toggle Sidebar for Mobile and Desktop
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const overlay = document.getElementById('sidebarOverlay');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        sidebar.classList.toggle('active');

        // Manage overlay
        if (sidebar.classList.contains('active')) {
            if (!overlay) {
                const newOverlay = document.createElement('div');
                newOverlay.id = 'sidebarOverlay';
                newOverlay.style.position = 'fixed';
                newOverlay.style.top = '0';
                newOverlay.style.left = '0';
                newOverlay.style.width = '100%';
                newOverlay.style.height = '100%';
                newOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
                newOverlay.style.zIndex = '999';
                newOverlay.onclick = toggleSidebar;
                document.body.appendChild(newOverlay);
            } else {
                overlay.style.display = 'block';
            }
        } else {
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    } else {
        // Desktop Collapse
        sidebar.classList.toggle('collapsed');
        if (mainContent) mainContent.classList.toggle('expanded');
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function () {
    // Add event listener to close sidebar when a menu item is clicked on mobile
    const menuLinks = document.querySelectorAll('.sidebar-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar.classList.contains('active')) {
                    toggleSidebar();
                }
            }
        });
    });

    // Load user data from sessionStorage (Tab Specific)
    const userData = sessionStorage.getItem('userData');
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
    // loadFacultyClasses(); // Removed (SubjectAssignment deleted)
    loadTodaySchedule();

    // Setup Notice Form
    setupFacultyNoticeForm();
});

// Setup Faculty Notice Form
function setupFacultyNoticeForm() {
    const form = document.getElementById('facultyNoticeForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const title = document.getElementById('noticeTitle').value;
            const content = document.getElementById('noticeContent').value;
            const urgency = document.getElementById('noticeUrgency').value;
            const audience = document.getElementById('targetAudience').value;

            // Map audience to visible_to
            // Faculty form has: both, student, faculty
            // API expects: visible_to (student, faculty, both)

            const noticeData = {
                title: title,
                content: content,
                urgency: urgency,
                visible_to: audience, // Direct mapping works: 'student', 'faculty', 'both'
                expiry_date: null // Not in form yet
            };

            fetch('/api/notices/publish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noticeData)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert("Notice published successfully!");
                        form.reset();
                        document.getElementById('noticeFormContainer').style.display = 'none';
                        loadFacultyNotices();
                    } else {
                        alert("Error: " + data.error);
                    }
                })
                .catch(err => console.error("Error publishing notice:", err));
        });
    }
}

// Load Faculty Notices
function loadFacultyNotices() {
    const container = document.querySelector('.notices-list');
    if (!container) return;

    // Fetch notices visible to faculty (role=faculty)
    fetch('/api/notices?role=faculty')
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">No notices found.</div>';
                return;
            }

            container.innerHTML = '';
            data.forEach(notice => {
                const card = document.createElement('div');
                card.className = 'notice-card';
                // Inline styles for simplicity matching Student/Admin themes
                card.style.background = 'white';
                card.style.padding = '15px';
                card.style.borderRadius = '8px';
                card.style.marginBottom = '15px';
                card.style.borderLeft = `4px solid ${getUrgencyColor(notice.notice_type)}`;
                card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';

                const dateStr = new Date(notice.created_at).toLocaleDateString();

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h4 style="margin:0; color:#333;">${notice.title}</h4>
                        <span style="font-size:0.8em; color:#666;">${dateStr}</span>
                    </div>
                    <p style="color:#555; font-size:0.95em; line-height:1.5;">${notice.content}</p>
                    <div style="margin-top:10px; font-size:0.85em; display:flex; gap:10px;">
                        <span style="background:#f0f2f5; padding:2px 8px; border-radius:4px;">By: ${notice.author}</span>
                        <span style="background:${getUrgencyColor(notice.notice_type, true)}; color:${getUrgencyColor(notice.notice_type)}; padding:2px 8px; border-radius:4px; font-weight:600;">${notice.notice_type.toUpperCase()}</span>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(err => {
            console.error("Error loading notices:", err);
            container.innerHTML = '<div style="color:red; text-align:center;">Failed to load notices.</div>';
        });
}

function getUrgencyColor(type, bg = false) {
    if (bg) {
        if (type === 'urgent') return '#fee2e2';
        if (type === 'moderate') return '#e0f2fe';
        return '#dcfce7'; // low
    }
    if (type === 'urgent') return '#ef4444';
    if (type === 'moderate') return '#3b82f6';
    return '#10b981'; // low
}

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
        'schedule': 'Today\'s Schedule',
        'notices': 'Notices & Announcements',
        'queries': 'Student Queries'
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
        case 'timetable':
            loadFacultyTimetable();
            break;
        case 'queries':
            loadFacultyQueries();
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
    sessionStorage.removeItem('userData');
    localStorage.removeItem('userData'); // Clear legacy just in case
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

// --- Timetable Management ---

// Load and generate Faculty Timetable
async function loadFacultyTimetable() {
    if (!currentUser) return;

    const tbody = document.getElementById('faculty-timetable-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

    try {
        const response = await fetch(`/api/faculty/timetable/${currentUser.id}`);
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();

        if (data && data.length > 0) {
            generateFacultyTimetableTable(data);
        } else {
            tbody.innerHTML = '<tr><td colspan="7">No classes found assigned to you.</td></tr>';
        }
    } catch (error) {
        console.error('Error:', error);
        if (tbody) tbody.innerHTML = '<tr><td colspan="7">Error loading timetable.</td></tr>';
    }
}

function generateFacultyTimetableTable(timetableData) {
    const tableBody = document.getElementById('faculty-timetable-body');
    const tableHeader = document.querySelector('#faculty-timetable-grid thead tr');
    if (!tableBody || !tableHeader) return;

    tableBody.innerHTML = '';
    tableHeader.innerHTML = '';

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    function normalizeJS(t) {
        if (!t || t.toLowerCase() === 'break' || t.toLowerCase() === 'recess') return 'Break';
        const match = t.match(/(\d{1,2}):(\d{2})\s*to\s*(\d{1,2}):(\d{2})/i);
        if (match) {
            return `${match[1].padStart(2, '0')}:${match[2]} to ${match[3].padStart(2, '0')}:${match[4]}`;
        }
        return t;
    }

    const processedData = timetableData.map(item => ({
        ...item,
        time: normalizeJS(item.time)
    }));

    const slotsMap = {};
    processedData.forEach(entry => { slotsMap[entry.time] = true; });

    function timeToMin(t) {
        if (t === 'Break') return 11 * 60;
        const match = t.match(/(\d{2}):(\d{2})/);
        if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
        return 9999;
    }

    const sortedSlots = Object.keys(slotsMap).sort((a, b) => timeToMin(a) - timeToMin(b));

    // Update Headers
    let headerHTML = '<th style="width: 12%; background: #1a237e; color: white;">Day / Time</th>';
    sortedSlots.forEach(slot => {
        headerHTML += `<th style="background: #1a237e; color: white;">${slot}</th>`;
    });
    tableHeader.innerHTML = headerHTML;

    // Update Rows
    let bodyHTML = '';
    days.forEach(day => {
        const dayClasses = processedData.filter(d => d.day === day);
        const isToday = day === today;

        bodyHTML += `<tr><td class="fw-bold" style="background: ${isToday ? '#fff3cd' : '#f8f9fa'};">${day}</td>`;

        sortedSlots.forEach(slot => {
            const classInfo = dayClasses.find(c => c.time === slot);
            if (classInfo) {
                if (classInfo.time === 'Break') {
                    bodyHTML += `<td class="recess-slot" style="background: #fff9f0; text-align: center;"><em>Recess</em></td>`;
                } else {
                    bodyHTML += `
                        <td class="lecture-slot" style="padding: 10px; border: 1px solid #eef2f7;">
                            <div class="fw-bold text-primary">${classInfo.subject}</div>
                            <div class="small">Batch: <strong>${classInfo.batch || '-'}</strong></div>
                            <div class="badge bg-secondary" style="margin-top: 5px;">Room ${classInfo.room || ''}</div>
                            <button class="btn btn-sm btn-outline-primary mt-2" onclick="openSwapModal(${classInfo.id || classInfo.original_id}, '${classInfo.subject}', '${day}', '${classInfo.time}')" style="font-size: 0.7rem; padding: 2px 5px; width: 100%;">Manage</button>
                        </td>
                    `;
                }
            } else {
                bodyHTML += '<td style="color: #ddd; text-align: center;">-</td>';
            }
        });
        bodyHTML += '</tr>';
    });

    tableBody.innerHTML = bodyHTML;
}

// Swap Modal handling
function openSwapModal(timetableId, subject, day, slot) {
    document.getElementById('swapTimetableId').value = timetableId;
    document.getElementById('swapSlotDetails').innerText = `Rescheduling ${subject} on ${day.toUpperCase()} (${slot})`;
    document.getElementById('swapModal').style.display = 'block';

    // Set default date to next occurrence of this day?
    // Start of logic to find next 'day' date
    // (omitted for brevity, user can pick date)
}

function closeSwapModal() {
    document.getElementById('swapModal').style.display = 'none';
    document.getElementById('swapForm').reset();
}

function toggleSwapFields() {
    const type = document.getElementById('swapType').value;
    const dateGroup = document.getElementById('dateGroup');
    if (type === 'temporary') {
        dateGroup.style.display = 'block';
        document.getElementById('swapDate').required = true;
    } else {
        dateGroup.style.display = 'none';
        document.getElementById('swapDate').required = false;
    }
}

function submitSwapRequest() {
    const timetableId = document.getElementById('swapTimetableId').value;
    const type = document.getElementById('swapType').value;
    const newFacultyId = document.getElementById('newFacultyId').value;
    const reason = document.getElementById('swapReason').value;
    const date = document.getElementById('swapDate').value; // YYYY-MM-DD

    const payload = {
        timetable_id: timetableId,
        new_faculty_id: newFacultyId,
        change_type: type,
        reason: reason
    };

    if (type === 'temporary') {
        payload.date = date;
    }

    fetch('/api/faculty/timetable/change', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                closeSwapModal();
                // Reload timetable if permanent change or refresh view
                loadFacultyTimetable();
            } else {
                alert(data.error || 'Failed to request change.');
            }
        })
        .catch(e => {
            console.error(e);
            alert('Error submitting request.');
        });
}

// --- Faculty Query Management ---

let currentFacultyQueries = [];
let activeFacultyThreadId = null;

function loadFacultyQueries() {
    if (!currentUser) return;

    const container = document.getElementById('facultyQueryList');
    if (container) container.innerHTML = '<div class="text-center p-5 text-muted"><i class="fas fa-spinner fa-spin"></i> Loading queries...</div>';

    // We use currentUser.id (User Table ID) as updated in app.py logic
    fetch(`/api/queries/faculty/${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
            currentFacultyQueries = data;
            filterFacultyQueries();
        })
        .catch(err => {
            console.error(err);
            if (container) container.innerHTML = '<div class="text-center p-5 text-danger">Failed to load queries.</div>';
        });
}

function filterFacultyQueries() {
    const filterEl = document.getElementById('queryStatusFilter');
    const container = document.getElementById('facultyQueryList');
    if (!container) return;

    const filter = filterEl ? filterEl.value : 'pending';

    let filtered = currentFacultyQueries;
    if (filter !== 'all') {
        filtered = currentFacultyQueries.filter(q => q.status === filter);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center p-5 text-muted">No queries found.</div>';
        return;
    }

    container.innerHTML = '';
    filtered.forEach(q => {
        const card = document.createElement('div');
        card.className = 'query-card';
        card.style.cssText = "background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #eee; cursor: pointer; transition: transform 0.2s; border-left: 4px solid " + getStatusColor(q.status);

        // Context Info
        const studentInfo = `<strong>${q.student_name}</strong> (${q.student_roll})`;
        const metaInfo = `Subject: ${q.subject || 'N/A'}`;

        // Type Badge
        const typeBadge = q.type === 'mentorship'
            ? '<span style="background-color: #6f42c1; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-right: 6px; font-weight: bold;">MENTOR</span>'
            : '<span style="background-color: #17a2b8; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-right: 6px; font-weight: bold;">ACADEMIC</span>';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <h4 style="margin: 0; font-size: 1.1rem; color: #333; display: flex; align-items: center;">${typeBadge} <span>${q.title}</span></h4>
                <span class="badge" style="background:${getStatusColor(q.status)}; color:white; padding:4px 8px; border-radius:12px; font-size:0.8rem;">${q.status.toUpperCase()}</span>
            </div>
            <div style="margin-top: 8px; font-size: 0.9rem; color: #555;">
                ${studentInfo}
            </div>
            <div style="margin-top: 5px; font-size: 0.85rem; color: #888;">
                ${metaInfo} • Updated: ${q.updated_at}
            </div>
            <div style="margin-top: 10px; font-size: 0.95rem; color: #444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${q.last_message || 'No messages yet.'}
            </div>
        `;

        card.onclick = () => openFacultyReplyModal(q.id);
        container.appendChild(card);
    });
}

function getStatusColor(status) {
    if (status === 'pending') return '#dc3545';
    if (status === 'answered') return '#198754';
    if (status === 'clarification') return '#ffc107';
    if (status === 'resolved') return '#6c757d';
    return '#0d6efd';
}

function openFacultyReplyModal(threadId) {
    activeFacultyThreadId = threadId;
    const modal = document.getElementById('facultyReplyModal');
    const msgContainer = document.getElementById('replyThreadMessages');

    if (modal) modal.style.display = 'block';
    if (msgContainer) msgContainer.innerHTML = '<div class="text-center p-3">Loading messages...</div>';

    fetch(`/api/queries/thread/${threadId}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('replyStudentName').textContent = data.student_details?.full_name || 'Student';
            document.getElementById('replyStudentRoll').textContent = `Roll: ${data.student_details?.roll_number || '--'}`;
            document.getElementById('replyStudentBranch').textContent = `Branch: ${data.student_details?.branch || '--'}`;

            document.getElementById('replyQueryTitle').textContent = data.title;
            const statusBadge = document.getElementById('replyQueryStatus');
            statusBadge.textContent = data.status.toUpperCase();
            statusBadge.style.backgroundColor = getStatusColor(data.status);
            statusBadge.style.color = 'white';

            const statusSelect = document.getElementById('replyStatusAction');
            if (statusSelect) statusSelect.value = 'answered';

            if (msgContainer) {
                msgContainer.innerHTML = '';
                if (!data.posts || data.posts.length === 0) {
                    msgContainer.innerHTML = '<p class="text-center text-muted">No messages.</p>';
                } else {
                    data.posts.forEach(post => {
                        const isMe = post.role === 'faculty';
                        const div = document.createElement('div');
                        div.style.cssText = `display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'}; margin-bottom: 15px;`;

                        let attachmentHtml = '';
                        if (post.attachments && post.attachments.length > 0) {
                            post.attachments.forEach(att => {
                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(att.file_type.toLowerCase());
                                if (isImage) {
                                    attachmentHtml += `<div style="margin-top:8px;"><img src="${att.file_url}" style="max-width:100%; border-radius:8px; cursor:pointer;" onclick="window.open(this.src)"></div>`;
                                } else {
                                    attachmentHtml += `<div style="margin-top:8px;"><a href="${att.file_url}" target="_blank" style="text-decoration:none; color:${isMe ? '#333' : '#0d6efd'}; font-size:0.9rem;"><i class="fas fa-file-download"></i> ${att.file_name}</a></div>`;
                                }
                            });
                        }

                        div.innerHTML = `
                            <div style="background: ${isMe ? '#e9ecef' : '#e3f2fd'}; color: #333; padding: 10px 15px; border-radius: 15px; border-${isMe ? 'bottom-right' : 'bottom-left'}-radius: 0; max-width: 80%;">
                                <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 4px; color: ${isMe ? '#495057' : '#0d6efd'};">
                                    ${post.author_name} <span style="font-weight: normal; color: #888;">• ${post.role.toUpperCase()}</span>
                                </div>
                                <div style="white-space: pre-wrap;">${post.content}</div>
                                ${attachmentHtml}
                                <div style="font-size: 0.75rem; color: #999; text-align: right; margin-top: 5px;">${post.created_at}</div>
                            </div>
                        `;
                        msgContainer.appendChild(div);
                    });
                    msgContainer.scrollTop = msgContainer.scrollHeight;
                }
            }
        })
        .catch(err => {
            console.error(err);
            if (msgContainer) msgContainer.innerHTML = '<div class="text-danger">Failed to load thread.</div>';
        });
}

function closeFacultyReplyModal() {
    const modal = document.getElementById('facultyReplyModal');
    if (modal) modal.style.display = 'none';
    activeFacultyThreadId = null;
    document.getElementById('facultyReplyForm').reset();
}

// Bind Reply Form
// Bind Reply Form
document.addEventListener('DOMContentLoaded', function () {
    const replyForm = document.getElementById('facultyReplyForm');
    if (replyForm) {
        replyForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!activeFacultyThreadId) return;

            const content = document.getElementById('replyContent').value;
            const statusAction = document.getElementById('replyStatusAction').value;
            const fileInput = document.getElementById('facultyReplyFile');
            const file = fileInput ? fileInput.files[0] : null;

            const formData = new FormData();
            formData.append('user_id', currentUser.id);
            formData.append('role', 'faculty');
            formData.append('content', content);
            formData.append('status', statusAction);
            if (file) {
                formData.append('file', file);
            }

            fetch(`/api/queries/${activeFacultyThreadId}/reply`, {
                method: 'POST',
                body: formData
            }).then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('Reply sent!');
                        closeFacultyReplyModal();
                        loadFacultyQueries();
                    } else {
                        alert('Failed to send reply');
                    }
                });
        });
    }
});