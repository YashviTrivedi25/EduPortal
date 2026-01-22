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
        'reports': 'Reports & Analytics'
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
function loadFacultyData() {
    // Mock implementation - faculty cards are already in HTML
    console.log('Faculty data loaded');
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
            <div class="modal-header">
                <i class="${iconClass}" style="color: ${iconColor}; font-size: 2rem; margin-bottom: 1rem;"></i>
                <h3>${title}</h3>
            </div>
            <div class="modal-body">
                <p>${message}</p>
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
    showModal('Add Faculty', 'Faculty registration form would include personal details, qualifications, and subject expertise.', 'info');
}

function editFaculty(facultyId) {
    showModal('Edit Faculty', `Edit form for faculty ${facultyId} with current information pre-loaded.`, 'info');
}

function viewFacultyDetails(facultyId) {
    showModal('Faculty Details', `Comprehensive view of faculty ${facultyId} including teaching assignments and performance.`, 'info');
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