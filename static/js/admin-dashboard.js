// Global variables
let currentUser = null;
let enrollmentChart = null;
let departmentChart = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

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
<<<<<<< HEAD
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

=======
>>>>>>> 9b29b48c3aabeb646d18063d7e5dfc0794c9d7a0
    // Load user data from localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
        currentUser = JSON.parse(userData);
        loadUserData();
    } else {
        // Redirect to login if no user data
        window.location.href = '/';
    }

    // Initialize charts
    initializeCharts();

    // Load initial data
    loadDashboardStats();
    loadStudentsData();
    loadFacultyData();
    loadCoursesData();
    loadPublishedNotices();

    // Initialize calendar
    generateCalendar();

    // Setup form handlers
    setupFormHandlers();
});

// Load user data into the interface
function loadUserData() {
    if (currentUser) {
        document.getElementById('adminName').textContent = currentUser.full_name || 'Administrator';
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
        'dashboard': 'Admin Dashboard',
        'students': 'Manage Students',
        'faculty': 'Manage Faculty',
        'courses': 'Manage Courses',
        'assignments': 'Subject Assignments',
        'calendar': 'Academic Calendar',
        'notices': 'Publish Notices',
        'fees': 'Fee Management',
        'reports': 'Reports & Analytics',
        'exams': 'Examination Management'
    };

    document.getElementById('pageTitle').textContent = titles[sectionId] || 'Admin Dashboard';

    // Load section-specific data
    switch (sectionId) {
        case 'students':
            loadStudentsData();
            break;
        case 'faculty':
            loadFacultyData();
            break;
        case 'courses':
            loadCoursesData();
            break;
        case 'assignments':
            loadAssignmentsData();
            break;
        case 'fees':
            loadFeeData();
            break;
    }
}

// Initialize charts
function initializeCharts() {
    // Enrollment Chart
    const enrollmentCtx = document.getElementById('enrollmentChart');
    if (enrollmentCtx) {
        enrollmentChart = new Chart(enrollmentCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'New Enrollments',
                    data: [65, 59, 80, 81, 56, 55],
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Department Chart
    const departmentCtx = document.getElementById('departmentChart');
    if (departmentCtx) {
        departmentChart = new Chart(departmentCtx, {
            type: 'doughnut',
            data: {
                labels: ['CSE', 'ECE', 'ME', 'CE', 'EE'],
                datasets: [{
                    data: [245, 180, 150, 120, 100],
                    backgroundColor: [
                        'rgba(102, 126, 234, 0.8)',
                        'rgba(118, 75, 162, 0.8)',
                        'rgba(67, 233, 123, 0.8)',
                        'rgba(250, 112, 154, 0.8)',
                        'rgba(254, 225, 64, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Load dashboard statistics
function loadDashboardStats() {
    fetch('/api/admin/stats')
        .then(response => response.json())
        .then(data => {
            updateStatsDisplay(data);
        })
        .catch(error => {
            console.error('Error loading stats:', error);
            // Use mock data for demo
            const mockData = {
                total_students: 1245,
                total_faculty: 85,
                total_courses: 12,
                total_fee_collection: 2400000
            };
            updateStatsDisplay(mockData);
        });
}

// Update statistics display
function updateStatsDisplay(stats) {
    document.getElementById('totalStudents').textContent = stats.total_students.toLocaleString();
    document.getElementById('totalFaculty').textContent = stats.total_faculty;
    document.getElementById('totalCourses').textContent = stats.total_courses;
    document.getElementById('totalRevenue').textContent = `₹${(stats.total_fee_collection / 100000).toFixed(1)}L`;
}

// Load students data
function loadStudentsData() {
    // Mock implementation for demo
    const mockStudents = [
        { rollNo: '2023001', name: 'John Doe', department: 'CSE', semester: 5, cgpa: 8.5, status: 'Active' },
        { rollNo: '2023002', name: 'Jane Smith', department: 'ECE', semester: 3, cgpa: 7.8, status: 'Active' },
        { rollNo: '2023003', name: 'Mike Johnson', department: 'ME', semester: 7, cgpa: 8.2, status: 'Active' },
        { rollNo: '2023004', name: 'Sarah Wilson', department: 'CE', semester: 1, cgpa: 9.1, status: 'Active' },
        { rollNo: '2023005', name: 'David Brown', department: 'CSE', semester: 5, cgpa: 7.5, status: 'Active' }
    ];

    updateStudentsTable(mockStudents);
}

// Update students table
function updateStudentsTable(students) {
    const tableBody = document.getElementById('studentsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.rollNo}</td>
            <td>${student.name}</td>
            <td>${student.department}</td>
            <td>${student.semester}</td>
            <td>${student.cgpa}</td>
            <td><span class="status ${student.status.toLowerCase()}">${student.status}</span></td>
            <td class="actions">
                <button class="edit-btn" onclick="editStudent('${student.rollNo}')">Edit</button>
                <button class="view-btn" onclick="viewStudent('${student.rollNo}')">View</button>
                <button class="delete-btn" onclick="deleteStudent('${student.rollNo}')">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Search students
function searchStudents() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    // Implementation would filter students based on search term
    console.log('Searching for:', searchTerm);
}

// Filter students
function filterStudents() {
    const department = document.getElementById('departmentFilter').value;
    const semester = document.getElementById('semesterFilter').value;
    // Implementation would filter students based on selected filters
    console.log('Filtering by:', { department, semester });
}

// Load faculty data
// Load faculty data
function loadFacultyData() {
    fetch('/api/admin/faculty')
        .then(response => response.json())
        .then(data => {
            const grid = document.querySelector('.faculty-grid');
            if (!grid) return;
            grid.innerHTML = '';

            data.forEach(faculty => {
                const card = document.createElement('div');
                card.className = 'faculty-card';
                card.innerHTML = `
                    <div class="faculty-avatar">
                        <img src="${faculty.photo_url}" alt="Faculty">
                    </div>
                    <div class="faculty-info">
                        <h4>${faculty.full_name}</h4>
                        <p>${faculty.department}</p>
                        <p>${faculty.designation}</p>
                        <span class="experience">${faculty.experience_years} years experience</span>
                        <div class="faculty-assignments" style="margin-top: 8px; font-size: 0.85em; color: #666;">
                            <div><i class="fas fa-chalkboard"></i> ${faculty.assigned_classes || 'No classes'}</div>
                            <div><i class="fas fa-layer-group"></i> ${faculty.assigned_semesters || 'No semester'}</div>
                            <div><i class="fas fa-book"></i> ${faculty.assigned_subjects || 'No subjects'}</div>
                        </div>
                    </div>
                    <div class="faculty-actions">
                        <button onclick="editFaculty(${faculty.id})">Edit</button>
                        <button onclick="viewFacultyDetails(${faculty.id})">View Details</button>
                    </div>
                `;
                grid.appendChild(card);
            });
        })
        .catch(error => console.error('Error loading faculty:', error));
}

// Load courses data
function loadCoursesData() {
    // Mock implementation - courses are already in HTML
    console.log('Courses data loaded');
}

// Load assignments data
function loadAssignmentsData() {
    const mockAssignments = [
        { subject: 'Data Structures', faculty: 'Prof. John Smith', department: 'CSE', semester: 5, year: '2025-26' },
        { subject: 'Algorithms', faculty: 'Prof. John Smith', department: 'CSE', semester: 5, year: '2025-26' },
        { subject: 'Digital Electronics', faculty: 'Dr. Sarah Johnson', department: 'ECE', semester: 3, year: '2025-26' }
    ];

    updateAssignmentsTable(mockAssignments);
}

// Update assignments table
function updateAssignmentsTable(assignments) {
    const tableBody = document.getElementById('assignmentsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    assignments.forEach((assignment, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${assignment.subject}</td>
            <td>${assignment.faculty}</td>
            <td>${assignment.department}</td>
            <td>${assignment.semester}</td>
            <td>${assignment.year}</td>
            <td class="actions">
                <button class="edit-btn" onclick="editAssignment(${index})">Edit</button>
                <button class="delete-btn" onclick="deleteAssignment(${index})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Load fee data
function loadFeeData() {
    const mockFeeStructure = [
        { course: 'CSE', semester: 5, tuition: 50000, lab: 5000, other: 2000, total: 57000 },
        { course: 'ECE', semester: 3, tuition: 48000, lab: 4500, other: 2000, total: 54500 },
        { course: 'ME', semester: 7, tuition: 45000, lab: 3000, other: 2000, total: 50000 }
    ];

    updateFeeStructureTable(mockFeeStructure);
}

// Update fee structure table
function updateFeeStructureTable(feeStructure) {
    const tableBody = document.getElementById('feeStructureBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    feeStructure.forEach((fee, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${fee.course}</td>
            <td>${fee.semester}</td>
            <td>₹${fee.tuition.toLocaleString()}</td>
            <td>₹${fee.lab.toLocaleString()}</td>
            <td>₹${fee.other.toLocaleString()}</td>
            <td>₹${fee.total.toLocaleString()}</td>
            <td class="actions">
                <button class="edit-btn" onclick="editFeeStructure(${index})">Edit</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Generate calendar
function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthEl = document.getElementById('currentMonth');

    if (!calendarGrid || !currentMonthEl) return;

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    currentMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    calendarGrid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        dayHeader.style.fontWeight = 'bold';
        dayHeader.style.textAlign = 'center';
        dayHeader.style.padding = '0.5rem';
        dayHeader.style.background = '#667eea';
        dayHeader.style.color = 'white';
        calendarGrid.appendChild(dayHeader);
    });

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }

    // Add days of the month
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;

        if (currentYear === today.getFullYear() &&
            currentMonth === today.getMonth() &&
            day === today.getDate()) {
            dayElement.classList.add('today');
        }

        // Add mock events
        if (day === 15 || day === 20) {
            dayElement.classList.add('has-event');
        }

        calendarGrid.appendChild(dayElement);
    }
}

// Calendar navigation
function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    generateCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    generateCalendar();
}

// Setup form handlers
function setupFormHandlers() {
    // Notice form handler
    const noticeForm = document.getElementById('noticeForm');
    if (noticeForm) {
        noticeForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const noticeData = {
                title: document.getElementById('noticeTitle').value,
                notice_type: document.getElementById('noticeType').value,
                target_audience: document.getElementById('targetAudience').value,
                department: document.getElementById('noticeDepartment').value,
                content: document.getElementById('noticeContent').value,
                expiry_date: document.getElementById('expiryDate').value
            };

            fetch('/api/notices/publish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(noticeData)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showSuccessModal('Notice Published', 'Notice has been published successfully and notifications sent to target audience.');
                        noticeForm.reset();
                        loadPublishedNotices();
                    } else {
                        showErrorModal('Error', data.message || 'Failed to publish notice');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showErrorModal('Error', 'An error occurred while publishing the notice');
                });
        });
    }

    // Target audience change handler
    const targetAudience = document.getElementById('targetAudience');
    const departmentGroup = document.getElementById('departmentGroup');

    if (targetAudience && departmentGroup) {
        targetAudience.addEventListener('change', function () {
            if (this.value === 'department') {
                departmentGroup.style.display = 'block';
            } else {
                departmentGroup.style.display = 'none';
            }
        });
    }
}

// Load published notices
function loadPublishedNotices() {
    fetch('/api/notices?role=admin')
        .then(response => response.json())
        .then(data => {
            updatePublishedNoticesDisplay(data);
        })
        .catch(error => {
            console.error('Error loading notices:', error);
        });
}

// Update published notices display
function updatePublishedNoticesDisplay(notices) {
    const container = document.querySelector('.notices-list');
    if (!container) return;

    container.innerHTML = '';

    notices.forEach(notice => {
        const noticeItem = document.createElement('div');
        noticeItem.className = 'notice-item';

        const createdDate = new Date(notice.created_at).toLocaleDateString();

        noticeItem.innerHTML = `
            <div class="notice-header">
                <h4>${notice.title}</h4>
                <span class="notice-type ${notice.notice_type}">${notice.notice_type}</span>
            </div>
            <p>${notice.content}</p>
            <div class="notice-meta">
                <span>Published ${createdDate}</span>
                <div class="notice-actions">
                    <button onclick="editNotice(${notice.id})">Edit</button>
                    <button onclick="deleteNotice(${notice.id})">Delete</button>
                </div>
            </div>
        `;

        container.appendChild(noticeItem);
    });
}

// Show success modal
function showSuccessModal(title, message) {
    showModal(title, message, 'success');
}

// Show error modal
function showErrorModal(title, message) {
    showModal(title, message, 'error');
}

// Show confirmation modal
function showConfirmModal(title, message, onConfirm) {
    const modal = createModal(title, message, 'confirm');

    const confirmBtn = modal.querySelector('.confirm-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');

    confirmBtn.onclick = function () {
        onConfirm();
        closeModal(modal);
    };

    cancelBtn.onclick = function () {
        closeModal(modal);
    };

    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Generic modal function
function showModal(title, message, type = 'info') {
    const modal = createModal(title, message, type);
    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Auto close after 3 seconds for success/error
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            closeModal(modal);
        }, 3000);
    }
}

// Create modal element
function createModal(title, message, type) {
    const modal = document.createElement('div');
    modal.className = 'modal admin-modal';

    const iconClass = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'confirm': 'fas fa-question-circle',
        'info': 'fas fa-info-circle'
    }[type] || 'fas fa-info-circle';

    const iconColor = {
        'success': '#27ae60',
        'error': '#e74c3c',
        'confirm': '#f39c12',
        'info': '#667eea'
    }[type] || '#667eea';

    modal.innerHTML = `
        <div class="modal-content admin-modal-content">
            <div class="modal-header" style="position: relative;">
                <span class="close-modal" onclick="closeModal(this.closest('.modal'))" style="position: absolute; right: 0; top: 0; font-size: 1.5rem; cursor: pointer;">&times;</span>
                <i class="${iconClass}" style="color: ${iconColor}; font-size: 2rem; margin-bottom: 1rem;"></i>
                <h3>${title}</h3>
            </div>
            <div class="modal-body">
                ${message}
            </div>
            <div class="modal-footer">
                ${type === 'confirm' ?
            '<button class="confirm-btn">Confirm</button><button class="cancel-btn">Cancel</button>' :
            '<button class="ok-btn" onclick="closeModal(this.closest(\'.modal\'))">OK</button>'
        }
            </div>
        </div>
    `;

    return modal;
}

// Close modal
function closeModal(modal) {
    modal.style.display = 'none';
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

// Enhanced CRUD Operations with modals
function addStudent() {
    showModal('Add Student', 'Student registration form would open here. This would include fields for personal details, course selection, and document upload.', 'info');
}

function editStudent(rollNo) {
    showModal('Edit Student', `Edit form for student ${rollNo} would open here with pre-filled data.`, 'info');
}

function viewStudent(rollNo) {
    showModal('Student Details', `Detailed view of student ${rollNo} including academic history, attendance, and performance metrics.`, 'info');
}

function deleteStudent(rollNo) {
    showConfirmModal(
        'Delete Student',
        `Are you sure you want to delete student ${rollNo}? This action cannot be undone.`,
        function () {
            // Perform deletion
            showSuccessModal('Student Deleted', `Student ${rollNo} has been successfully deleted from the system.`);
        }
    );
}

function importStudents() {
    showModal('Import Students', 'CSV import functionality would allow bulk student registration with validation and error reporting.', 'info');
}

function addFaculty() {
    const formHtml = `
        <form id="addFacultyForm" class="add-form">
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="addName" required placeholder="Dr. Jane Doe">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="addEmail" required placeholder="jane.doe@college.edu">
            </div>
            <div class="form-group">
                <label>Department</label>
                <select id="addDept" required>
                     <option value="" disabled selected>Select Department</option>
                     <option value="Computer Science">Computer Science</option>
                     <option value="Electronics">Electronics</option>
                     <option value="Mechanical">Mechanical</option>
                     <option value="Civil">Civil</option>
                </select>
            </div>
            <div class="form-group">
                <label>Designation</label>
                <input type="text" id="addDesignation" required placeholder="Assistant Professor">
            </div>
             <div class="form-group">
                <label>Specialization</label>
                <input type="text" id="addSpecialization" placeholder="e.g. AI/ML">
            </div>
            <div class="form-group">
                <label>Experience (Years)</label>
                <input type="number" id="addExp" min="0" value="0">
            </div>
            <div class="form-group">
                <label>Assigned Classes/Divisions</label>
                <input type="text" id="addClasses" placeholder="e.g. CSE-A, ECE-B">
            </div>
            <div class="form-group">
                <label>Assigned Semesters</label>
                <input type="text" id="addSemesters" placeholder="e.g. 1st, 3rd, 5th">
            </div>
            <div class="form-group">
                <label>Assigned Subjects</label>
                <input type="text" id="addSubjects" placeholder="e.g. Data Structures, OS">
            </div>
            <div class="modal-actions" style="margin-top: 20px;">
                <button type="submit" class="save-btn" style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%;">Add Faculty</button>
            </div>
        </form>
    `;

    showModal('Add New Faculty', formHtml, 'info');

    setTimeout(() => {
        const form = document.getElementById('addFacultyForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const facultyData = {
                    full_name: document.getElementById('addName').value,
                    email: document.getElementById('addEmail').value,
                    department: document.getElementById('addDept').value,
                    designation: document.getElementById('addDesignation').value,
                    specialization: document.getElementById('addSpecialization').value,
                    experience_years: document.getElementById('addExp').value,
                    assigned_classes: document.getElementById('addClasses').value,
                    assigned_semesters: document.getElementById('addSemesters').value,
                    assigned_subjects: document.getElementById('addSubjects').value
                };

                fetch('/api/admin/faculty', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(facultyData)
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            showSuccessModal('Success', 'Faculty added successfully');
                            loadFacultyData();
                            closeModal(form.closest('.modal'));
                        } else {
                            showErrorModal('Error', data.error || 'Failed to add faculty');
                        }
                    })
                    .catch(err => showErrorModal('Error', 'Failed to add faculty'));
            };
        }
    }, 100);
}

function editFaculty(id) {
    fetch(`/api/admin/faculty/${id}`)
        .then(res => res.json())
        .then(faculty => {
            const formHtml = `
                <form id="editFacultyForm" class="edit-form">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="editName" value="${faculty.full_name}" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="editEmail" value="${faculty.email}" required>
                    </div>
                    <div class="form-group">
                        <label>Department</label>
                        <select id="editDept" required>
                             <option value="Computer Science" ${faculty.department === 'Computer Science' ? 'selected' : ''}>Computer Science</option>
                             <option value="Electronics" ${faculty.department === 'Electronics' ? 'selected' : ''}>Electronics</option>
                             <option value="Mechanical" ${faculty.department === 'Mechanical' ? 'selected' : ''}>Mechanical</option>
                             <option value="Civil" ${faculty.department === 'Civil' ? 'selected' : ''}>Civil</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Designation</label>
                        <input type="text" id="editDesignation" value="${faculty.designation}" required>
                    </div>
                     <div class="form-group">
                        <label>Specialization</label>
                        <input type="text" id="editSpecialization" value="${faculty.specialization}">
                    </div>
                    <div class="form-group">
                        <label>Experience (Years)</label>
                        <input type="number" id="editExp" value="${faculty.experience_years}">
                    </div>
                    <div class="form-group">
                        <label>Assigned Classes/Divisions</label>
                        <input type="text" id="editClasses" value="${faculty.assigned_classes || ''}" placeholder="e.g. CSE-A, ECE-B">
                    </div>
                    <div class="form-group">
                        <label>Assigned Semesters</label>
                        <input type="text" id="editSemesters" value="${faculty.assigned_semesters || ''}" placeholder="e.g. 1st, 3rd">
                    </div>
                    <div class="form-group">
                        <label>Assigned Subjects</label>
                        <input type="text" id="editSubjects" value="${faculty.assigned_subjects || ''}" placeholder="e.g. Data Structures">
                    </div>
                    <div class="modal-actions" style="margin-top: 20px; display: flex; justify-content: space-between;">
                        <button type="submit" class="save-btn" style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Save Changes</button>
                        <button type="button" onclick="deleteFaculty(${id})" class="delete-btn" style="background: #f44336; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Delete Faculty</button>
                    </div>
                </form>
            `;

            showModal('Edit Faculty', formHtml, 'info');

            // Allow time for modal to render before attaching listener
            setTimeout(() => {
                const form = document.getElementById('editFacultyForm');
                if (form) {
                    form.onsubmit = (e) => {
                        e.preventDefault();
                        const updatedData = {
                            full_name: document.getElementById('editName').value,
                            email: document.getElementById('editEmail').value,
                            department: document.getElementById('editDept').value,
                            designation: document.getElementById('editDesignation').value,
                            specialization: document.getElementById('editSpecialization').value,
                            experience_years: document.getElementById('editExp').value,
                            assigned_classes: document.getElementById('editClasses').value,
                            assigned_semesters: document.getElementById('editSemesters').value,
                            assigned_subjects: document.getElementById('editSubjects').value
                        };

                        fetch(`/api/admin/faculty/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatedData)
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.success) {
                                    showSuccessModal('Success', 'Faculty details updated');
                                    loadFacultyData(); // Refresh list
                                    // Close modal by finding the closest modal parent of the form
                                    closeModal(form.closest('.modal'));
                                } else {
                                    showErrorModal('Error', data.error || 'Update failed');
                                }
                            })
                            .catch(err => showErrorModal('Error', 'Failed to update faculty'));
                    };
                }
            }, 100);
        })
        .catch(err => showErrorModal('Error', 'Failed to load faculty details'));
}

function viewFacultyDetails(id) {
    fetch(`/api/admin/faculty/${id}`)
        .then(res => res.json())
        .then(faculty => {
            const detailsHtml = `
                <div class="faculty-details">
                    <div class="detail-row" style="margin-bottom: 10px;">
                        <strong>ID:</strong> ${faculty.faculty_id}
                    </div>
                    <div class="detail-row" style="margin-bottom: 10px;">
                        <strong>Name:</strong> ${faculty.full_name}
                    </div>
                    <div class="detail-row" style="margin-bottom: 10px;">
                        <strong>Email:</strong> ${faculty.email}
                    </div>
                    <div class="detail-row" style="margin-bottom: 10px;">
                        <strong>Department:</strong> ${faculty.department}
                    </div>
                    <div class="detail-row" style="margin-bottom: 10px;">
                        <strong>Designation:</strong> ${faculty.designation}
                    </div>
                    <div class="detail-row" style="margin-bottom: 10px;">
                        <strong>Specialization:</strong> ${faculty.specialization}
                    </div>
                    <div class="detail-row" style="margin-bottom: 10px;">
                        <strong>Experience:</strong> ${faculty.experience_years} years
                    </div>
                    <hr style="margin: 15px 0; border: 0; border-top: 1px solid #eee;">
                    <div class="detail-row" style="margin-bottom: 10px;">
                        <strong>Classes/Divisions:</strong> ${faculty.assigned_classes || 'N/A'}
                    </div>
                    <div class="detail-row" style="margin-bottom: 10px;">
                        <strong>Semesters:</strong> ${faculty.assigned_semesters || 'N/A'}
                    </div>
                    <div class="detail-row" style="margin-bottom: 10px;">
                        <strong>Subjects:</strong> ${faculty.assigned_subjects || 'N/A'}
                    </div>
                </div>
            `;
            showModal('Faculty Details', detailsHtml, 'info');
        })
        .catch(err => showErrorModal('Error', 'Failed to load faculty details'));
}

function deleteFaculty(id) {
    // Determine the modal to close (the edit modal)
    const editModal = document.querySelector('.modal[style*="block"]'); // rudimentary check

    showConfirmModal('Delete Faculty', 'Are you sure you want to delete this faculty member? This cannot be undone.', () => {
        fetch(`/api/admin/faculty/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showSuccessModal('Deleted', 'Faculty member deleted successfully');
                    loadFacultyData();
                    if (editModal) closeModal(editModal);
                } else {
                    showErrorModal('Error', data.error || 'Delete failed');
                }
            })
            .catch(err => showErrorModal('Error', 'Failed to delete faculty'));
    });
}

function addCourse() {
    showModal('Add Course', 'Course creation form with curriculum design, semester structure, and subject mapping.', 'info');
}

function editCourse(courseCode) {
    showModal('Edit Course', `Course modification form for ${courseCode} including syllabus updates.`, 'info');
}

function viewSyllabus(courseCode) {
    showModal('Course Syllabus', `Detailed syllabus view for ${courseCode} with semester-wise breakdown.`, 'info');
}

function manageSemesters(courseCode) {
    showModal('Manage Semesters', `Semester management interface for ${courseCode} with subject assignments.`, 'info');
}

function createAssignment() {
    showModal('Create Assignment', 'Subject assignment form to assign faculty to courses and subjects.', 'info');
}

function editAssignment(index) {
    showModal('Edit Assignment', `Modify assignment ${index} with updated faculty or subject details.`, 'info');
}

function deleteAssignment(index) {
    showConfirmModal(
        'Delete Assignment',
        `Are you sure you want to delete assignment ${index}?`,
        function () {
            showSuccessModal('Assignment Deleted', `Assignment ${index} has been successfully removed.`);
        }
    );
}

function addEvent() {
    showModal('Add Event', 'Calendar event creation form with date, time, and notification settings.', 'info');
}

function createNotice() {
    // Scroll to notice form
    document.getElementById('noticeForm').scrollIntoView({ behavior: 'smooth' });
}

function editNotice(noticeId) {
    showModal('Edit Notice', `Notice editing form for notice ${noticeId} with current content pre-loaded.`, 'info');
}

function deleteNotice(noticeId) {
    showConfirmModal(
        'Delete Notice',
        'Are you sure you want to delete this notice? This will also remove all related notifications.',
        function () {
            fetch(`/api/notices/delete/${noticeId}`, {
                method: 'DELETE'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showSuccessModal('Notice Deleted', 'Notice has been successfully deleted.');
                        loadPublishedNotices();
                    } else {
                        showErrorModal('Error', 'Failed to delete notice.');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showErrorModal('Error', 'An error occurred while deleting the notice.');
                });
        }
    );
}

function updateFeeStructure() {
    showModal('Update Fee Structure', 'Fee structure management form with semester-wise fee configuration.', 'info');
}

function editFeeStructure(index) {
    showModal('Edit Fee Structure', `Fee structure editing form for entry ${index}.`, 'info');
}

function generateReport(reportType) {
    showModal('Generating Report', `${reportType} report is being generated. You will be notified when it's ready for download.`, 'success');

    // Simulate report generation
    setTimeout(() => {
        showSuccessModal('Report Ready', `${reportType} report has been generated successfully and is ready for download.`);
    }, 3000);
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
// Examination Management Logic
const EXAM_API = 'http://127.0.0.1:5001/api/admin/exams';

function switchExamTab(tabName) {
    // Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.color = '#64748b';
        btn.style.borderBottom = 'none';
        btn.classList.remove('active');
    });
    const activeBtn = event.target;
    activeBtn.style.color = '#2563eb';
    activeBtn.style.borderBottom = '2px solid #2563eb';
    activeBtn.classList.add('active');

    // Content
    document.querySelectorAll('.exam-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(tabName).style.display = 'block';

    // If Timetable tab, load subjects
    if (tabName === 'timetable') {
        loadSubjects();
    }
}

// Load Subjects for Dropdown
async function loadSubjects() {
    const select = document.getElementById('timetableSubject');
    if (select.options.length > 1) return; // Already loaded

    try {
        const res = await fetch(`${EXAM_API}/subjects`);
        const subjects = await res.json();

        subjects.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = `${sub.name} (${sub.code})`;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Failed to load subjects', err);
    }
}

// Create Schedule
const createScheduleForm = document.getElementById('createScheduleForm');
if (createScheduleForm) {
    createScheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch(`${EXAM_API}/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                document.getElementById('scheduleResult').innerHTML = `<div style="color:green; margin-top:0.5rem; padding:0.5rem; background:#ecfdf5; border-radius:4px;">Success! Exam Schedule Created. ID: <strong>${result.id}</strong></div>`;
                document.getElementById('timetableScheduleId').value = result.id;
            } else {
                alert('Error: ' + result.error);
            }
        } catch (err) {
            alert('Failed to connect to Exam API. Make sure admin.py is running.');
        }
    });
}

// Timetable
async function loadTimetable() {
    const id = document.getElementById('timetableScheduleId').value;
    if (!id) return alert('Enter Schedule ID');

    try {
        const res = await fetch(`${EXAM_API}/timetable/${id}`);
        const data = await res.json();

        document.getElementById('timetableWrapper').style.display = 'block';
        const tbody = document.getElementById('timetableBody');
        tbody.innerHTML = data.map(row => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 0.75rem;">${row.subject_name} <br><small style="color:#64748b">${row.subject_code}</small></td>
                <td style="padding: 0.75rem;">${row.exam_date} <br><small>${row.start_time} - ${row.end_time}</small></td>
                <td style="padding: 0.75rem;">${row.room_number}</td>
                <td style="padding: 0.75rem;">${row.faculty_name}</td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

const timetableForm = document.getElementById('timetableForm');
if (timetableForm) {
    timetableForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.exam_schedule_id = document.getElementById('timetableScheduleId').value;

        const res = await fetch(`${EXAM_API}/timetable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            loadTimetable(); // Refresh
            e.target.reset();
        } else {
            alert(result.error);
        }
    });
}

async function publishSchedule() {
    const id = document.getElementById('timetableScheduleId').value;
    if (confirm('Publish schedule? This will notify all students and faculty.')) {
        const res = await fetch(`${EXAM_API}/publish/${id}`, { method: 'POST' });
        const result = await res.json();
        alert(result.message || result.error);
    }
}

// Re-candidates
async function loadReCandidates() {
    const res = await fetch(`${EXAM_API}/re-candidates`);
    const data = await res.json();
    document.getElementById('reCandidatesBody').innerHTML = data.map(row => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 0.75rem;">${row.student_name}</td>
            <td style="padding: 0.75rem;">${row.roll_number}</td>
            <td style="padding: 0.75rem;">${row.subject_name}</td>
            <td style="padding: 0.75rem;">${row.marks_obtained}/${row.max_marks}</td>
            <td style="padding: 0.75rem; color: #ef4444; font-weight: 500;">${row.status}</td>
        </tr>
    `).join('');
}

// Export
function exportResults(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const dept = formData.get('department');
    const sem = formData.get('semester');
    window.location.href = `${EXAM_API}/results/export?department=${dept}&semester=${sem}`;
}


