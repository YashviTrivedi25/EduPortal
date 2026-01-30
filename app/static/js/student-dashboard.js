// Global variables
console.log("Student Dashboard JS v3.06 Loaded");

// --- Auth Token Injection (Multi-Tab Support) ---
const originalFetch = window.fetch;
window.fetch = function (url, options) {
    options = options || {};
    options.headers = options.headers || {};

    // Inject Token inside headers
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
let marksChart = null;

// Toggle Sidebar for Mobile and Desktop
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content'); // Add this line
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
        // Put fresh data fetch here
        fetch(`/api/get_current_user/${currentUser.id}`)
            .then(res => res.json())
            .then(updatedUser => {
                if (!updatedUser.error) {
                    currentUser = updatedUser;
                    localStorage.setItem('userData', JSON.stringify(currentUser));
                    loadUserData(); // Update UI with fresh data (e.g. Sem 4)

                    // Reload dependent sections if needed
                    const timetableSemester = document.getElementById('timetableSemester');
                    if (timetableSemester) timetableSemester.textContent = currentUser.current_semester;
                }
            })
            .catch(err => console.error("Failed to refresh user profile:", err));

        loadUserData();
    } else {
        // Redirect to login if no user data
        window.location.href = '/';
    }

    // Initialize charts
    initializeCharts();

    // Load initial data
    // Load initial data
    // loadAttendanceData(); // Removed
    // loadMarksData(); // Removed
    // loadNotices(); // Removed
    // loadFeeDetails(); // Removed
    // loadScholarships(); // Removed
    // loadQueries(); // Removed
    loadNotifications();
    loadStudentTimetable();

    // FORCE HIDE ALL MODALS ON LOAD
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
        m.style.opacity = '1'; // Reset opacity if changed
        m.style.visibility = 'visible'; // Reset visibility if changed
    });

    // Setup scholarship category filter
    const scholarshipCategory = document.getElementById('scholarshipCategory');
    if (scholarshipCategory) {
        scholarshipCategory.addEventListener('change', loadScholarships);
    }

    // Check for low attendance and show modal if needed
    checkLowAttendance();

    // Setup modal close functionality
    setupModals();
});

// Load user data into the interface
// Load user data into the interface
function loadUserData() {
    if (currentUser) {
        document.getElementById('studentName').textContent = currentUser.full_name || 'Student';
        document.getElementById('rollNumber').textContent = currentUser.roll_number || 'N/A';
        document.getElementById('enrollmentNumber').textContent = currentUser.enrollment_number || 'N/A';
        document.getElementById('currentSemester').textContent = `${currentUser.current_semester || 'N/A'} Semester`;
        document.getElementById('branch').textContent = currentUser.branch || 'N/A';
    }
}

// ... (omitted shared code) ...

// Load attendance data
function loadAttendanceData() {
    if (!currentUser) return;

    fetch(`/api/student/attendance/${currentUser.student_id || currentUser.id}`) // Use student_id
        .then(response => response.json())
        .then(data => {
            updateAttendanceDisplay(data);
        })
        .catch(error => {
            console.error('Error loading attendance:', error);
            // Use mock data for demo
            const mockData = [
                { subject_name: 'Mathematics', attendance_percentage: 90, present_classes: 27, total_classes: 30 },
                { subject_name: 'Physics', attendance_percentage: 72, present_classes: 18, total_classes: 25 },
                { subject_name: 'Computer Science', attendance_percentage: 88, present_classes: 22, total_classes: 25 }
            ];
            updateAttendanceDisplay(mockData);
        });
}

// Load marks data
function loadMarksData() {
    if (!currentUser) return;

    fetch(`/api/student/marks/${currentUser.student_id || currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            updateMarksDisplay(data);
        })
        .catch(error => {
            console.error('Error loading marks:', error);
            const mockData = [
                { subject_name: 'Mathematics', exam_type: 'internal', marks_obtained: 85, max_marks: 100, percentage: 85 },
                { subject_name: 'Physics', exam_type: 'internal', marks_obtained: 78, max_marks: 100, percentage: 78 },
                { subject_name: 'Computer Science', exam_type: 'internal', marks_obtained: 92, max_marks: 100, percentage: 92 }
            ];
            updateMarksDisplay(mockData);
        });
}

// Load student timetable
async function loadStudentTimetable() {
    if (!currentUser) return;

    try {
        const response = await fetch(`/api/student/timetable/${currentUser.student_id || currentUser.id}`);
        const timetableList = await response.json();

        // Transform Array to Map keys
        const timetable = {};
        if (Array.isArray(timetableList)) {
            timetableList.forEach(item => {
                const dayKey = item.day.toLowerCase();
                if (!timetable[dayKey]) timetable[dayKey] = {};

                // Normalize time: API "08:45 AM - 09:45 AM" -> JS "08:45 AM-09:45 AM"
                // Remove spaces around hyphen
                const timeKey = item.time.replace(/\s+-\s+/, '-');

                timetable[dayKey][timeKey] = {
                    subject_name: item.subject,
                    faculty_name: item.faculty,
                    room_number: item.room,
                    status: 'scheduled'
                };
            });
        } else if (timetableList && !timetableList.error) {
            // Fallback if it was already an object (unlikely given app.py)
            // But just in case
            Object.assign(timetable, timetableList);
        }

        if (timetableList.error) {
            console.error(timetableList.error);
            return;
        }

        // Update Semester Display
        const semesterEl = document.getElementById('timetableSemester');
        if (semesterEl && currentUser) {
            semesterEl.textContent = currentUser.current_semester || 'N/A';
        }

        const tbody = document.getElementById('timetable-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayIndex = new Date().getDay(); // 0=Sun, 1=Mon...
        const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayName = dayMap[todayIndex];

        const badge = document.getElementById('current-day-badge');
        if (badge) {
            badge.textContent = `Today is ${currentDayName.charAt(0).toUpperCase() + currentDayName.slice(1)}`;
        }

        days.forEach(day => {
            const row = document.createElement('tr');
            if (day === currentDayName) {
                row.classList.add('current-day-row');
            }

            // Day Name Cell
            const dayCell = document.createElement('th');
            dayCell.textContent = day.charAt(0).toUpperCase() + day.slice(1);
            dayCell.className = "table-light";
            row.appendChild(dayCell);

            // Time Slots matching the DB/CSV (08:45 Start)
            const slots = [
                '08:45 AM-09:45 AM',
                '09:45 AM-10:45 AM',
                '11:30 AM-12:30 PM',
                '12:30 PM-01:30 PM'
            ];

            slots.forEach(slot => {
                const cell = document.createElement('td');
                const entry = timetable[day] ? timetable[day][slot] : null;

                if (entry) {
                    let content = `<strong>${entry.subject_name}</strong><br>
                                 <small>${entry.faculty_name}</small><br>
                                 <span class="badge bg-secondary">${entry.room_number || 'Room TBD'}</span>`;

                    if (entry.status === 'rescheduled') {
                        cell.classList.add('rescheduled-slot');
                        content = `<span class="badge bg-danger rescheduled-badge">Changed</span><br>` + content;
                    }

                    cell.innerHTML = content;
                } else {
                    cell.innerHTML = '<span class="text-muted">-</span>';
                }
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading timetable:', error);
    }
}

// Load fee details
function loadFeeDetails() {
    if (!currentUser) return;

    fetch(`/api/fee/details/${currentUser.student_id || currentUser.id}`) // Use student_id
        .then(response => response.json())
        .then(data => {
            updateFeeDisplay(data);
        })
        .catch(error => {
            console.error('Error loading fee details:', error);
        });
}

// Load queries
function loadQueries() {
    if (!currentUser) return;

    fetch(`/api/queries?student_id=${currentUser.student_id || currentUser.id}`) // Use student_id
        .then(response => response.json())
        .then(data => {
            updateQueriesDisplay(data);
        })
        .catch(error => {
            console.error('Error loading queries:', error);
        });
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
        'dashboard': 'Dashboard',
        'attendance': 'Attendance Management',
        'marks': 'Academic Performance',
        'notes': 'Study Materials',
        'notices': 'Notices & Announcements',
        'fees': 'Fee Management',
        'queries': 'Query Management',
        'examination': 'Examination Module',
        'exams': 'Examination Schedule',
        'clubs': 'Recommended Clubs',
        'timetable': 'Class Timetable',
        'scholarship': 'Scholarship Opportunities'
    };

    document.getElementById('pageTitle').textContent = titles[sectionId] || 'Dashboard';

    // Load section-specific data
    switch (sectionId) {
        case 'attendance':
            loadAttendanceData();
            break;
        case 'marks':
            loadMarksData();
            break;
        case 'notices':
            loadNotices();
            break;
        case 'notes':
            loadNotes();
            break;
        case 'events':
            loadEvents();
            break;
        case 'fees':
            loadFeeDetails();
            break;
        case 'queries':
            loadQueries();
            break;
        case 'idcard':
            loadStudentIdCard();
            break;
        case 'exams':
            loadExamSchedule();
            break;
        case 'clubs':
            // Default to 'All Clubs' to ensure content is visible
            loadStudentClubs();
            // Manually set active state for 'All Clubs' tab
            document.querySelectorAll('.club-tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.clubs-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));

            document.getElementById('allClubsTab').classList.add('active');
            // Find the "All Clubs" button. Since we can't easily select by text content without ID, 
            // let's assume it's the second one or add IDs in HTML. 
            // Better focus: Just load the data. The HTML has "Recommendations" active by default.
            // Let's switch it.
            const allClubsBtn = document.querySelector('.clubs-tabs .tab-btn:nth-child(2)');
            if (allClubsBtn) allClubsBtn.classList.add('active');
            else document.querySelector('.clubs-tabs .tab-btn').classList.add('active'); // Fallback

            document.getElementById('allClubsTab').classList.add('active');
            document.getElementById('recommendationsTab').classList.remove('active');
            break;
        case 'timetable':
            loadStudentTimetable();
            break;
        case 'scholarship':
            // Scholarships loaded on eligibility check
            break;
    }
}

// Initialize charts
function initializeCharts() {
    const ctx = document.getElementById('marksChart');
    if (ctx) {
        marksChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mathematics', 'Physics', 'Computer Science', 'Chemistry', 'English'],
                datasets: [{
                    label: 'Marks Obtained',
                    data: [85, 78, 92, 80, 88],
                    backgroundColor: [
                        'rgba(102, 126, 234, 0.8)',
                        'rgba(118, 75, 162, 0.8)',
                        'rgba(67, 233, 123, 0.8)',
                        'rgba(250, 112, 154, 0.8)',
                        'rgba(254, 225, 64, 0.8)'
                    ],
                    borderColor: [
                        'rgba(102, 126, 234, 1)',
                        'rgba(118, 75, 162, 1)',
                        'rgba(67, 233, 123, 1)',
                        'rgba(250, 112, 154, 1)',
                        'rgba(254, 225, 64, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Subject-wise Performance'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

// Duplicate loadAttendanceData removed
// See lines 125+ for correct version

// Update attendance display
function updateAttendanceDisplay(attendanceData) {
    const container = document.querySelector('.attendance-cards');
    if (!container) return;

    container.innerHTML = '';

    attendanceData.forEach(subject => {
        const card = document.createElement('div');
        card.className = 'subject-attendance';

        const statusClass = subject.attendance_percentage >= 75 ? 'good' : 'warning';
        const statusText = subject.attendance_percentage >= 75 ? 'Good' :
            `Need ${Math.ceil((75 * subject.total_classes / 100) - subject.present_classes)} more classes`;

        card.innerHTML = `
            <h3>${subject.subject_name}</h3>
            <div class="attendance-bar">
                <div class="attendance-fill" style="width: ${subject.attendance_percentage}%"></div>
            </div>
            <span class="attendance-percent">${subject.attendance_percentage}%</span>
            <p class="attendance-status ${statusClass}">${statusText}</p>
        `;

        container.appendChild(card);
    });
}

// Duplicate loadMarksData removed
// See lines 139+ for correct version

// Update marks display
function updateMarksDisplay(marksData) {
    const tableBody = document.getElementById('marksTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    // Group marks by subject
    const subjectMarks = {};
    marksData.forEach(mark => {
        if (!subjectMarks[mark.subject_name]) {
            subjectMarks[mark.subject_name] = { internal: 0, external: 0 };
        }
        subjectMarks[mark.subject_name][mark.exam_type] = mark.marks_obtained;
    });

    Object.keys(subjectMarks).forEach(subject => {
        const internal = subjectMarks[subject].internal || 0;
        const external = subjectMarks[subject].external || 0;
        const total = internal + external;
        const grade = getGrade(total);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${subject}</td>
            <td>${internal}</td>
            <td>${external}</td>
            <td>${total}</td>
            <td>${grade}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Get grade based on marks
function getGrade(marks) {
    if (marks >= 90) return 'A+';
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B+';
    if (marks >= 60) return 'B';
    if (marks >= 50) return 'C';
    return 'F';
}

// Load notices
function loadNotices() {
    const role = currentUser ? currentUser.role : 'student';
    const department = currentUser ? currentUser.department : '';

    fetch(`/api/notices?role=${role}&department=${department}`)
        .then(response => response.json())
        .then(data => {
            updateNoticesDisplay(data);
        })
        .catch(error => {
            console.error('Error loading notices:', error);
            // Use mock data for demo
            const mockData = [
                {
                    title: 'Exam Schedule Released',
                    content: 'Mid-semester examination schedule has been published. Check your exam dates.',
                    notice_type: 'exam',
                    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                },
                {
                    title: 'Holiday Announcement',
                    content: 'College will remain closed on January 15th due to national holiday.',
                    notice_type: 'holiday',
                    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                }
            ];
            updateNoticesDisplay(mockData);
        });
}

// Update notices display
function updateNoticesDisplay(notices) {
    const container = document.querySelector('.notices-container');
    if (!container) return;

    container.innerHTML = '';

    notices.forEach(notice => {
        const card = document.createElement('div');
        card.className = `notice-card ${notice.notice_type === 'urgent' ? 'urgent' : ''}`;

        const timeAgo = getTimeAgo(new Date(notice.created_at));

        card.innerHTML = `
            <div class="notice-header">
                <h4>${notice.title}</h4>
                <span class="notice-date">${timeAgo}</span>
            </div>
            <p>${notice.content}</p>
            <span class="notice-type">${notice.notice_type.charAt(0).toUpperCase() + notice.notice_type.slice(1)} Notice</span>
        `;

        container.appendChild(card);
    });
}

// Get time ago string
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

// Find scholarships based on criteria
function findScholarships() {
    const income = document.getElementById('searchIncome').value;
    const category = document.getElementById('searchCategory').value;
    const gender = document.getElementById('searchGender').value;

    if (!income || !category || !gender) {
        alert('Please fill in all details to find matching scholarships.');
        return;
    }

    // Show loading state
    const container = document.getElementById('scholarshipCards');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Finding best matches...</p></div>';

    const requestData = {
        family_income: parseFloat(income),
        category: category,
        gender: gender,
        cgpa: currentUser ? currentUser.cgpa : 0.0 // Include CGPA from profile
    };

    fetch('/api/scholarships/eligible', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
        .then(response => response.json())
        .then(data => {
            updateScholarshipsDisplay(data);
        })
        .catch(error => {
            console.error('Error finding scholarships:', error);
            container.innerHTML = '<p class="error-text">Failed to load scholarships. Please try again.</p>';
        });
}

// Update scholarships display
// Horizontal layout container style
function updateScholarshipsDisplay(scholarships) {
    const container = document.getElementById('scholarshipCards');
    if (!container) return;

    container.innerHTML = '';

    container.style.display = 'grid';
    container.style.gap = '20px';
    container.style.gridTemplateColumns = '1fr'; // Full width cards

    if (scholarships.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: #f8f9fa; border-radius: 8px;">
                <i class="fas fa-search-minus" style="font-size: 2rem; color: #6c757d; margin-bottom: 15px;"></i>
                <p>No scholarships found matching your specific criteria.</p>
                <p>Try adjusting your filters or checking back later.</p>
            </div>`;
        return;
    }

    scholarships.forEach(scholarship => {
        const card = document.createElement('div');
        card.className = 'scholarship-card';
        // Horizontal Card Styling
        card.style.background = 'white';
        card.style.borderRadius = '12px';
        card.style.padding = '25px';
        card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
        card.style.display = 'flex';
        card.style.flexDirection = 'row'; // Horizontal
        card.style.alignItems = 'center';
        card.style.justifyContent = 'space-between';
        card.style.flexWrap = 'wrap'; // Responsive wrap
        card.style.gap = '20px';
        card.style.borderLeft = '5px solid #1a237e'; // Accent border

        card.innerHTML = `
            <div style="flex: 2; min-width: 300px;">
                <h3 style="color: #1a237e; font-size: 1.3rem; margin-bottom: 8px; font-weight: 700;">${scholarship.name}</h3>
                <p style="color: #546e7a; font-size: 0.95rem; line-height: 1.5; margin-bottom: 10px;">${scholarship.description}</p>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                   <div style="background: #e8eaf6; color: #3f51b5; padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                        <i class="fas fa-money-bill-wave"></i> ₹${scholarship.amount.toLocaleString()}
                   </div>
                   <div style="background: #e0f2f1; color: #00695c; padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                        <i class="fas fa-users"></i> Income < ₹${scholarship.max_family_income ? scholarship.max_family_income.toLocaleString() : 'N/A'}
                   </div>
                </div>
            </div>
            
            <div style="flex: 1; min-width: 250px; border-left: 1px solid #eee; padding-left: 20px; display: flex; flex-direction: column; justify-content: center;">
                <h5 style="margin: 0 0 10px 0; color: #455a64; font-size: 0.9rem;">Eligibility Snapshot</h5>
                <div style="font-size: 0.9rem; color: #37474f; line-height: 1.4;">
                    ${scholarship.eligibility_criteria}
                </div>
            </div>

            <div style="flex: 0 0 auto; min-width: 180px; text-align: right;">
                <a href="${scholarship.official_website}" target="_blank" style="display: inline-block; padding: 12px 25px; background: #1a237e; color: white; text-decoration: none; border-radius: 50px; font-weight: 600; box-shadow: 0 4px 10px rgba(26, 35, 126, 0.2); transition: all 0.2s; white-space: nowrap;">
                    Visit Official Site <i class="fas fa-arrow-right" style="margin-left: 5px;"></i>
                </a>
            </div>
        `;

        // Responsive adjustment script (basic)
        // Ideally handled in CSS file but doing inline as requested for quick fix
        if (window.innerWidth < 768) {
            card.style.flexDirection = 'column';
            card.style.alignItems = 'flex-start';
        }

        container.appendChild(card);
    });
}
// Function to handle "Apply Now" (mock)
function applyScholarship(id) {
    alert("Application process started! You will be redirected to the official application portal.");
}

// Helper to load default scholarships (optional, maybe distinct from search)
function loadScholarships() {
    // We can leave this empty or load some featured scholarships
    // For now, let's just let the user search.
    const container = document.getElementById('scholarshipCards');
    if (container && container.children.length === 0) {
        // Only show initial state if empty
    }
}

// Submit scholarship application
document.addEventListener('DOMContentLoaded', function () {
    const scholarshipForm = document.getElementById('scholarshipApplicationForm');
    if (scholarshipForm) {
        scholarshipForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const modal = document.getElementById('scholarshipModal');
            const scholarshipId = modal.dataset.scholarshipId;

            if (!scholarshipId || !currentUser) return;

            const applicationData = {
                student_id: currentUser.id,
                scholarship_id: scholarshipId,
                reason: document.getElementById('applicationReason').value
            };

            fetch('/api/scholarship/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(applicationData)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Scholarship application submitted successfully!');
                        closeScholarshipModal();
                        loadScholarships(); // Refresh the list
                    } else {
                        alert(data.message || 'Failed to submit application');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while submitting the application');
                });
        });
    }
});

// Duplicate loadQueries removed
// See lines 180+ for correct version

// Update queries display
function updateQueriesDisplay(queries) {
    const container = document.querySelector('#queries .query-list');
    if (!container) {
        // Create query list container if it doesn't exist
        const queriesSection = document.getElementById('queries');
        const queryList = document.createElement('div');
        queryList.className = 'query-list';
        queriesSection.appendChild(queryList);
    }

    const queryList = document.querySelector('#queries .query-list');
    queryList.innerHTML = '';

    if (queries.length === 0) {
        queryList.innerHTML = '<p class="no-queries">No queries submitted yet.</p>';
        return;
    }

    queries.forEach(query => {
        const queryCard = document.createElement('div');
        queryCard.className = `query-card status-${query.status}`;

        const createdDate = new Date(query.created_at).toLocaleDateString();

        queryCard.innerHTML = `
            <div class="query-header">
                <h4>${query.subject}</h4>
                <span class="query-status ${query.status}">${query.status.toUpperCase()}</span>
            </div>
            <p class="query-type">${query.query_type.charAt(0).toUpperCase() + query.query_type.slice(1)} Query</p>
            <p class="query-description">${query.description}</p>
            <div class="query-meta">
                <span class="query-date">Submitted: ${createdDate}</span>
                <span class="query-priority priority-${query.priority}">${query.priority.toUpperCase()}</span>
            </div>
            ${query.responses.length > 0 ? `
                <div class="query-responses">
                    <h5>Responses:</h5>
                    ${query.responses.map(response => `
                        <div class="response">
                            <p>${response.response_text}</p>
                            <small>By ${response.responder} on ${new Date(response.created_at).toLocaleDateString()}</small>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;

        queryList.appendChild(queryCard);
    });
}

// Open query modal
function openQueryModal() {
    document.getElementById('queryModal').style.display = 'block';
}

// Close query modal
function closeQueryModal() {
    document.getElementById('queryModal').style.display = 'none';
}

// Submit query
document.addEventListener('DOMContentLoaded', function () {
    const queryForm = document.getElementById('queryForm');
    if (queryForm) {
        queryForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!currentUser) return;

            const queryData = {
                student_id: currentUser.id,
                query_type: document.getElementById('queryType').value,
                subject: document.getElementById('querySubject').value,
                description: document.getElementById('queryDescription').value,
                priority: document.getElementById('queryPriority').value
            };

            fetch('/api/queries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(queryData)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Query submitted successfully!');
                        closeQueryModal();
                        queryForm.reset();
                        loadQueries(); // Refresh the list
                    } else {
                        alert(data.message || 'Failed to submit query');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while submitting the query');
                });
        });
    }
});

// Duplicate loadFeeDetails removed
// See lines 166+ for correct version

// Update fee display
function updateFeeDisplay(feeData) {
    const feeSection = document.getElementById('fees');
    if (!feeSection) return;

    // Update current semester fee status
    const currentFee = feeData.current_semester;
    const feeStatusCard = feeSection.querySelector('.fee-status-card');

    if (feeStatusCard) {
        feeStatusCard.innerHTML = `
            <h3>Semester ${currentFee.semester} Fee Status</h3>
            <div class="fee-details">
                <div class="fee-item">
                    <span>Tuition Fee:</span>
                    <span class="paid">₹${currentFee.tuition_fee.toLocaleString()} - Paid</span>
                </div>
                <div class="fee-item">
                    <span>Lab Fee:</span>
                    <span class="paid">₹${currentFee.lab_fee.toLocaleString()} - Paid</span>
                </div>
                <div class="fee-item">
                    <span>Library Fee:</span>
                    <span class="paid">₹${currentFee.library_fee.toLocaleString()} - Paid</span>
                </div>
                <div class="fee-item">
                    <span>Other Fees:</span>
                    <span class="paid">₹${currentFee.other_fees.toLocaleString()} - Paid</span>
                </div>
                <div class="fee-item total">
                    <span><strong>Total Fee:</strong></span>
                    <span class="paid"><strong>₹${currentFee.total_fee.toLocaleString()} - Paid</strong></span>
                </div>
            </div>
            <div class="fee-actions">
                <button onclick="showFeeReceipt()" class="download-receipt-btn">View Receipt</button>
                <button onclick="downloadFeeReceipt()" class="download-receipt-btn">Download Receipt</button>
            </div>
        `;
    }
}

// Show fee receipt
function showFeeReceipt() {
    const modal = document.getElementById('feeReceiptModal');
    modal.style.display = 'block';

    // Load receipt details
    const receiptDetails = document.getElementById('receiptDetails');
    receiptDetails.innerHTML = `
        <div class="receipt-header">
            <h4>Fee Payment Receipt</h4>
            <p>Transaction ID: TXN123456789</p>
        </div>
        <div class="receipt-body">
            <p><strong>Student Name:</strong> ${currentUser.full_name}</p>
            <p><strong>Roll Number:</strong> ${currentUser.roll_number}</p>
            <p><strong>Semester:</strong> ${currentUser.current_semester}</p>
            <p><strong>Amount Paid:</strong> ₹58,000</p>
            <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Payment Method:</strong> Online</p>
        </div>
    `;
}

// Close fee receipt modal
function closeFeeReceiptModal() {
    document.getElementById('feeReceiptModal').style.display = 'none';
}

// Download fee receipt
function downloadFeeReceipt() {
    // Implementation for PDF generation
    alert('Receipt download started...');
}

// Load notifications
function loadNotifications() {
    if (!currentUser) return;

    fetch(`/api/notifications/${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            updateNotificationCount(data);
        })
        .catch(error => {
            console.error('Error loading notifications:', error);
        });
}

// Update notification count
function updateNotificationCount(notifications) {
    const notificationCount = document.querySelector('.notification-count');
    if (notificationCount) {
        const unreadCount = notifications.filter(n => !n.is_read).length;
        notificationCount.textContent = unreadCount;
        notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

// Load events
function loadEvents() {
    fetch('/api/events')
        .then(response => response.json())
        .then(data => {
            updateEventsDisplay(data);
        })
        .catch(error => {
            console.error('Error loading events:', error);
        });
}

// Update events display
function updateEventsDisplay(events) {
    const container = document.getElementById('eventsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = '<p class="no-events">No events scheduled at the moment.</p>';
        return;
    }

    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = `event-card ${event.event_type}`;

        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date);

        eventCard.innerHTML = `
            <div class="event-header">
                <h4>${event.title}</h4>
                <span class="event-type ${event.event_type}">${event.event_type.toUpperCase()}</span>
            </div>
            <p class="event-description">${event.description}</p>
            <div class="event-details">
                <div class="event-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</span>
                </div>
                <div class="event-detail">
                    <i class="fas fa-clock"></i>
                    <span>${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}</span>
                </div>
                <div class="event-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${event.venue}</span>
                </div>
                <div class="event-detail">
                    <i class="fas fa-user"></i>
                    <span>Organized by: ${event.organizer_name}</span>
                </div>
            </div>
            <div class="event-contact">
                <h5>Contact Information:</h5>
                <p><strong>Contact Person:</strong> ${event.contact_person}</p>
                <p><strong>Phone:</strong> <a href="tel:${event.contact_phone}">${event.contact_phone}</a></p>
                <p><strong>Email:</strong> <a href="mailto:${event.contact_email}">${event.contact_email}</a></p>
            </div>
            ${event.registration_required ? `
                <div class="event-registration">
                    <p><strong>Registration Required</strong></p>
                    <p>Deadline: ${new Date(event.registration_deadline).toLocaleDateString()}</p>
                    <p>Max Participants: ${event.max_participants}</p>
                    <button class="register-btn" onclick="registerForEvent(${event.id})">Register Now</button>
                </div>
            ` : ''}
        `;

        container.appendChild(eventCard);
    });
}

// Filter events
function filterEvents() {
    const filter = document.getElementById('eventTypeFilter').value;
    loadEvents(); // In a real implementation, you'd pass the filter to the API
}

// Register for event
function registerForEvent(eventId) {
    alert(`Registration for event ${eventId} would be processed here.`);
}

// Load fee history
function loadFeeHistory() {
    if (!currentUser) return;

    fetch(`/api/student/fee-history/${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            updateFeeHistoryDisplay(data);
        })
        .catch(error => {
            console.error('Error loading fee history:', error);
        });
}

// Update fee history display
function updateFeeHistoryDisplay(feeHistory) {
    const tableBody = document.getElementById('feeHistoryTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    feeHistory.forEach(payment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Semester ${payment.semester}</td>
            <td>${payment.academic_year}</td>
            <td>₹${payment.amount_paid.toLocaleString()}</td>
            <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
            <td>${payment.transaction_id}</td>
            <td>
                <button onclick="viewFeeReceipt(${payment.id})" class="view-receipt-btn">View Receipt</button>
                <button onclick="downloadFeeReceipt(${payment.id})" class="download-receipt-btn">Download</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Show fee tab
function showFeeTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.fee-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(`${tabName}FeeTab`).classList.add('active');
    event.target.classList.add('active');

    if (tabName === 'history') {
        loadFeeHistory();
    }
}

// View fee receipt
function viewFeeReceipt(paymentId) {
    // Generate receipt content
    const receiptDetails = document.getElementById('receiptDetails');
    receiptDetails.innerHTML = `
        <div class="receipt-header">
            <h4>Fee Payment Receipt</h4>
            <p>Payment ID: ${paymentId}</p>
        </div>
        <div class="receipt-body">
            <p><strong>Student Name:</strong> ${currentUser.full_name}</p>
            <p><strong>Roll Number:</strong> ${currentUser.roll_number}</p>
            <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Amount:</strong> ₹58,000</p>
            <p><strong>Status:</strong> Completed</p>
        </div>
    `;

    document.getElementById('feeReceiptModal').style.display = 'block';
}

// Load academic queries
function loadAcademicQueries() {
    if (!currentUser) return;

    fetch(`/api/student/queries?student_id=${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            updateAcademicQueriesDisplay(data);
            updateQueryStats(data);
        })
        .catch(error => {
            console.error('Error loading academic queries:', error);
        });
}

// Update academic queries display
function updateAcademicQueriesDisplay(queries) {
    const container = document.getElementById('academicQueriesList');
    if (!container) return;

    container.innerHTML = '';

    if (queries.length === 0) {
        container.innerHTML = '<p class="no-queries">No academic queries submitted yet.</p>';
        return;
    }

    queries.forEach(query => {
        const queryCard = document.createElement('div');
        queryCard.className = `academic-query-card status-${query.status}`;

        queryCard.innerHTML = `
            <div class="query-header">
                <h4>${query.query_title}</h4>
                <span class="query-status ${query.status}">${query.status.toUpperCase()}</span>
            </div>
            <div class="query-meta">
                <span><strong>Subject:</strong> ${query.subject_name}</span>
                <span><strong>Faculty:</strong> ${query.faculty_name}</span>
                <span><strong>Date:</strong> ${new Date(query.created_at).toLocaleDateString()}</span>
            </div>
            <p class="query-description">${query.query_description}</p>
            ${query.responses.length > 0 ? `
                <div class="query-responses">
                    <h5>Faculty Response:</h5>
                    ${query.responses.map(response => `
                        <div class="response">
                            <p>${response.response_text}</p>
                            <small>Responded on ${new Date(response.created_at).toLocaleDateString()}</small>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="no-response">Waiting for faculty response...</p>'}
        `;

        container.appendChild(queryCard);
    });
}

// Update query statistics
function updateQueryStats(queries) {
    const totalQueries = queries.length;
    const pendingQueries = queries.filter(q => q.status === 'pending').length;
    const answeredQueries = queries.filter(q => q.status === 'answered').length;

    document.getElementById('totalQueries').textContent = totalQueries;
    document.getElementById('pendingQueries').textContent = pendingQueries;
    document.getElementById('answeredQueries').textContent = answeredQueries;
}

// Open academic query modal
function openAcademicQueryModal() {
    // Load subjects first
    loadSubjectsForQuery();
    document.getElementById('academicQueryModal').style.display = 'block';
}

// Close academic query modal
function closeAcademicQueryModal() {
    document.getElementById('academicQueryModal').style.display = 'none';
}

// Load subjects for query
function loadSubjectsForQuery() {
    // Mock subjects - in real implementation, fetch from API
    const subjects = [
        { id: 1, name: 'Data Structures', code: 'CS501' },
        { id: 2, name: 'Algorithms', code: 'CS502' },
        { id: 3, name: 'Database Systems', code: 'CS503' }
    ];

    const subjectSelect = document.getElementById('querySubject');
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';

    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = `${subject.name} (${subject.code})`;
        subjectSelect.appendChild(option);
    });

    // Load faculty when subject changes
    subjectSelect.addEventListener('change', function () {
        if (this.value) {
            loadFacultyForSubject(this.value);
        }
    });
}

// Load faculty for selected subject
function loadFacultyForSubject(subjectId) {
    // Mock faculty - in real implementation, fetch from API
    const faculty = [
        { id: 1, name: 'Prof. John Smith' },
        { id: 2, name: 'Dr. Sarah Johnson' }
    ];

    const facultySelect = document.getElementById('queryFaculty');
    facultySelect.innerHTML = '<option value="">Select Faculty</option>';

    faculty.forEach(fac => {
        const option = document.createElement('option');
        option.value = fac.id;
        option.textContent = fac.name;
        facultySelect.appendChild(option);
    });
}

// Load student ID card
function loadStudentIdCard() {
    if (!currentUser) return;

    // Clear existing content and show loading
    const container = document.getElementById('studentIdCard');
    if (container) {
        container.innerHTML = '<div style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#667eea;"></i><p style="margin-top:10px; color:#555;">Loading ID Card Details...</p></div>';
    }

    // Use student_id explicitly
    const idToFetch = currentUser.student_id ? currentUser.student_id : (currentUser.id ? currentUser.id : null);

    if (!idToFetch) {
        if (container) container.innerHTML = '<div style="color:red; padding:20px;">Error: User ID missing. Please re-login.</div>';
        return;
    }

    fetch(`/api/student/id-card/${idToFetch}`)
        .then(response => {
            if (response.status === 404) throw new Error("Student record not found.");
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.error) throw new Error(data.error);
            generateIdCard(data);
        })
        .catch(error => {
            console.error('Error loading ID card:', error);
            if (container) {
                container.innerHTML = `
                    <div class="error-message" style="text-align: center; padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <p style="margin: 0; font-weight: 600;">Failed to load ID Card</p>
                        <p style="margin: 5px 0 0 0; font-size: 0.9rem;">${error.message}</p>
                        <button onclick="loadStudentIdCard()" style="margin-top: 15px; padding: 5px 15px; background: #fff; border: 1px solid #721c24; color: #721c24; border-radius: 4px; cursor: pointer;">Try Again</button>
                    </div>`;
            }
        });
}

// Generate ID card
function generateIdCard(data) {
    const idCardContainer = document.getElementById('studentIdCard');
    if (!idCardContainer) return;

    // Use inline styles to guarantee visibility and layout
    // This bypasses potential CSS conflicts
    idCardContainer.innerHTML = `
        <div class="id-card-front" style="
            width: 100%;
            max-width: 400px;
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border: 1px solid #e1e4e8;
            margin: 0 auto;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        ">
            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
                color: white;
                padding: 15px 20px;
                display: flex;
                align-items: center;
                gap: 15px;
            ">
                <div style="
                    font-size: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <i class="fas fa-university"></i>
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">ABC Engineering College</h3>
                    <p style="margin: 2px 0 0 0; font-size: 12px; opacity: 0.9;">Student Identity Card</p>
                </div>
            </div>

            <!-- Body -->
            <div style="padding: 20px; display: flex; gap: 20px; flex-wrap: wrap;">
                <!-- Photo -->
                <div style="flex-shrink: 0; margin: 0 auto;">
                    <img src="${data.photo_url || (data.gender && data.gender.toLowerCase() === 'female' ? 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png' : 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png')}" 
                        alt="Student Photo" 
                        style="
                            width: 100px; 
                            height: 125px; 
                            object-fit: cover; 
                            border-radius: 6px; 
                            border: 3px solid #f0f2f5;
                            display: block;
                            background: #fff; 
                        "
                        onerror="this.src='https://cdn-icons-png.flaticon.com/512/847/847969.png'"
                    >
                </div>

                <!-- Details -->
                <div style="flex: 1; min-width: 180px;">
                    <style>
                        .id-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; border-bottom: 1px dashed #eee; padding-bottom: 4px; }
                        .id-label { font-weight: 600; color: #555; }
                        .id-val { color: #333; font-weight: 500; text-align: right; }
                    </style>
                    
                    <div class="id-row"><span class="id-label">Name</span> <span class="id-val">${data.full_name}</span></div>
                    <div class="id-row"><span class="id-label">Roll No</span> <span class="id-val">${data.roll_number}</span></div>
                    <div class="id-row"><span class="id-label">Branch</span> <span class="id-val">${data.branch}</span></div>
                    <div class="id-row"><span class="id-label">Semester</span> <span class="id-val">${data.semester}</span></div>
                    <div class="id-row"><span class="id-label">Emergency</span> <span class="id-val">${data.emergency_contact || 'N/A'}</span></div>
                    <div class="id-row" style="border:none;"><span class="id-label">Blood Group</span> <span class="id-val">${data.blood_group || '-'}</span></div>
                </div>
            </div>

            <!-- Footer -->
            <div style="
                background: #f8f9fa; 
                padding: 10px 20px; 
                border-top: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
            ">
                <div style="font-size: 11px; color: #666;">
                    Valid Until: <strong>${data.valid_until || 'Dec 2025'}</strong>
                </div>
                <div style="text-align: center;">
                    <div style="font-family: 'Cursive', serif; font-size: 14px; color: #1a237e; font-weight: bold;">Principal</div>
                    <div style="font-size: 10px; color: #888; border-top: 1px solid #ccc; padding-top: 2px; margin-top: 2px;">Authority Signature</div>
                </div>
            </div>
        </div>
    `;
}

// Download ID card
function downloadIdCard() {
    const idCardElement = document.querySelector('.id-card');
    const downloadBtn = document.getElementById('downloadIdBtn');

    if (!idCardElement) {
        alert('ID Card not generated yet.');
        return;
    }

    // Show loading state
    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    downloadBtn.disabled = true;

    html2canvas(idCardElement, {
        scale: 2, // Higher resolution
        useCORS: true, // Allow cross-origin images (like simple placeholder)
        backgroundColor: '#ffffff', // Ensure white background
        logging: false
    }).then(canvas => {
        // Create download link
        const link = document.createElement('a');
        link.download = `${currentUser.full_name.replace(/\s+/g, '_')}_ID_Card.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Reset button
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }).catch(err => {
        console.error('ID Card generation failed:', err);
        alert('Failed to generate ID Card image.');
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    });
}

// Check for low attendance and show modal
// Check for low attendance and show modal
function checkLowAttendance() {
    // Disabled random popup
    console.log("Low attendance check skipped.");
}

// Setup modal functionality
function setupModals() {
    const modals = document.querySelectorAll('.modal');

    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.close');
        const modalBtn = modal.querySelector('.modal-btn');

        if (closeBtn) {
            closeBtn.onclick = function () {
                modal.style.display = 'none';
            }
        }

        if (modalBtn) {
            modalBtn.onclick = function () {
                modal.style.display = 'none';
            }
        }

        window.onclick = function (event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        }
    });
}

// Load marks for specific semester
function loadMarks() {
    const semester = document.getElementById('semesterSelect').value;
    console.log('Loading marks for semester:', semester);
    // Implementation would fetch marks for specific semester
    loadMarksData();
}

// Download marksheet
function downloadMarksheet() {
    // Mock implementation
    alert('Marksheet download started...');
    // In real implementation, this would generate and download a PDF
}

// Check for login
// Global check removed to prevent redirection loop. Auth is handled in DOMContentLoaded.
// currentUser = JSON.parse(localStorage.getItem('userData')); 


// Logout function
function logout() {
    sessionStorage.removeItem('userData');
    localStorage.removeItem('userData');
    window.location.href = '/';
}

// Load Clubs
function loadStudentClubs() {
    fetch('/api/clubs')
        .then(response => response.json())
        .then(clubs => {
            const container = document.getElementById('allClubsGrid');
            if (!container) return;

            container.innerHTML = '';

            if (clubs.length === 0) {
                container.innerHTML = '<div class="no-data">No clubs active at the moment.</div>';
                return;
            }

            clubs.forEach(club => {
                // Determine icon based on category
                let iconClass = 'fa-star';
                const cat = club.category.toLowerCase();
                const name = club.name.toLowerCase();

                // Specific check for LFA or Literature first
                if (name.includes('lfa') || name.includes('literary') || cat.includes('lit')) {
                    iconClass = 'fa-pen-nib';
                }
                else if (cat.includes('tech')) iconClass = 'fa-laptop-code';
                else if (cat.includes('cult') || name.includes('music') || name.includes('saaz')) iconClass = 'fa-music';
                else if (cat.includes('sport')) iconClass = 'fa-futbol';
                else if (cat.includes('social') || cat.includes('service')) iconClass = 'fa-hands-helping';

                const card = document.createElement('div');
                card.className = 'club-recommendation-card'; // Use same class as recommendations

                // Interests tags
                const interestsHtml = club.interests && club.interests.length > 0
                    ? `<div class="matching-interests" style="margin-top: 10px;">
                        <strong>Interests:</strong>
                        ${club.interests.map(i => `<span class="interest-tag">${i}</span>`).join('')}
                       </div>`
                    : '';

                card.innerHTML = `
                    <div class="recommendation-header">
                        <h4>${club.name}</h4>
                        <span class="club-category tag-${club.category}">${club.category}</span>
                    </div>
                    <p class="club-description">${club.description}</p>
                    ${interestsHtml}
                    <div class="club-contact">
                        <p><strong>Coordinator:</strong> ${club.faculty_coordinator || 'N/A'}</p>
                        <p><strong>Contact:</strong> ${club.contact_email || 'N/A'}</p>
                        ${club.meeting_schedule ? `<p><strong>Schedule:</strong> ${club.meeting_schedule}</p>` : ''}
                    </div>
                    <div class="club-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                        ${club.instagram_link ?
                        `<a href="${club.instagram_link}" target="_blank" class="instagram-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; background: #E1306C; color: white; border: none; padding: 8px 15px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 0.9rem;">
                            <i class="fab fa-instagram" style="margin-right: 8px;"></i> Instagram
                        </a>` : ''}
                        <button onclick="registerForClub(${club.id}, '${club.name}')" class="register-btn" style="flex: 2; background: #4a90e2; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: 500;">Register</button>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(error => console.error('Error loading clubs:', error));
}

// Open interest survey
function openInterestSurvey() {
    document.getElementById('interestSurveyModal').style.display = 'block';
}

// Close interest survey
function closeInterestSurvey() {
    document.getElementById('interestSurveyModal').style.display = 'none';
}

// Show club tab
// Show club tab
function showClubTab(tabName, fromSurvey = false) {
    document.querySelectorAll('.club-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const tabId = tabName === 'all' ? 'allClubsTab' : `${tabName}Tab`;
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
        tabElement.classList.add('active');
    }

    // Safely handle button active state
    // Use a selector to find the specific button if event is missing
    if (event && event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.add('active');
    } else {
        // Fallback: highlight the button that corresponds to this tab
        const specificBtn = document.querySelector(`.tab-btn[onclick*="'${tabName}'"]`);
        if (specificBtn) specificBtn.classList.add('active');
    }

    if (tabName === 'all') {
        loadStudentClubs();
        // Automatic via CSS class
    } else if (tabName === 'my') {
        loadMyClubMemberships();
        // Automatic via CSS class
    } else if (tabName === 'recommendations') {
        // Handle recommendations tab
        // Automatic via CSS class

        // Auto-open survey if not coming from survey completion
        if (!fromSurvey) {
            openInterestSurvey();
        }
    }
}

// Register for Club
function registerForClub(clubId, clubName) {
    if (!currentUser) return;

    if (!confirm(`Do you want to send a registration request to ${clubName}?`)) return;

    fetch('/api/student/club/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            student_id: currentUser.student_id || currentUser.id,
            club_id: clubId
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`Request sent! The faculty coordinator will review your application for ${clubName}.`);
            } else {
                alert(data.error || 'Failed to register');
            }
        })
        .catch(error => {
            console.error('Error registering:', error);
            alert('An error occurred. Please try again.');
        });
}

// Load student timetable
function loadStudentTimetable() {
    if (!currentUser) return;

    const timetableBody = document.getElementById('timetable-body');
    if (timetableBody) {
        timetableBody.innerHTML = '<tr><td colspan="7">Loading timetable...</td></tr>';
    }

    fetch(`/api/student/timetable/${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                generateTimetableTable(data);
            } else {
                if (timetableBody) {
                    timetableBody.innerHTML = '<tr><td colspan="7">No timetable data found for your batch.</td></tr>';
                }
            }
        })
        .catch(error => {
            console.error('Error loading timetable:', error);
            if (timetableBody) {
                timetableBody.innerHTML = '<tr><td colspan="7">Error loading timetable data.</td></tr>';
            }
        });
}

// Generate timetable table with robust time matching
function generateTimetableTable(timetableData) {
    const tableBody = document.getElementById('timetable-body');
    const tableHeader = document.querySelector('#timetable-grid thead tr');
    if (!tableBody || !tableHeader) return;

    // Clear existing content
    tableBody.innerHTML = '';
    tableHeader.innerHTML = '';

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Normalize times in the data to ensure consistency (08:45 vs 8:45)
    function normalizeJS(t) {
        if (!t || t.toLowerCase().includes('break') || t.toLowerCase().includes('recess')) return 'Break';
        // Normalize: "08:45 AM - 09:45 AM" -> "08:45 to 09:45"
        // Regex matches HH:MM (optional AM/PM) [separator] HH:MM (optional AM/PM)
        const match = t.match(/(\d{1,2}):(\d{2})\s*(?:[ap]\.?m\.?)?\s*(?:to|-|–)\s*(\d{1,2}):(\d{2})/i);
        if (match) {
            return `${match[1].padStart(2, '0')}:${match[2]} to ${match[3].padStart(2, '0')}:${match[4]}`;
        }
        return t;
    }

    // Process data to use normalized times
    const processedData = timetableData.map(item => ({
        ...item,
        time: normalizeJS(item.time)
    }));

    // Use fixed slots for reliability (4 lectures + 1 break)
    const sortedSlots = [
        '08:45 to 09:45',
        '09:45 to 10:45',
        'Break',
        '11:30 to 12:30',
        '12:30 to 01:30'
    ];

    // 1. Build Header
    let headerHTML = '<th style="width: 12%; background: #1a237e; color: white;">Day / Time</th>';
    sortedSlots.forEach(slot => {
        const label = slot === 'Break' ? 'RECESS' : slot;
        headerHTML += `<th style="background: #1a237e; color: white; font-size: 0.85rem;">${label}</th>`;
    });
    tableHeader.innerHTML = headerHTML;

    // 2. Populate Rows
    let bodyHTML = '';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Update the "Today" badge
    const badge = document.getElementById('current-day-badge');
    if (badge) {
        badge.textContent = `Today: ${today}`;
    }

    days.forEach(day => {
        const dayClasses = processedData.filter(d => d.day === day);
        const isToday = day === today;

        bodyHTML += `<tr class="${isToday ? 'current-day-row' : ''}">
            <td class="fw-bold" style="background: ${isToday ? '#fff3cd' : '#f8f9fa'}; border-left: ${isToday ? '5px solid #ffc107' : '1px solid #eef2f7'}; text-transform: uppercase; font-size: 0.8rem;">${day}</td>`;

        sortedSlots.forEach(slot => {
            const classInfo = dayClasses.find(c => c.time === slot);

            if (slot === 'Break') {
                bodyHTML += `<td style="background: #fff9f0; vertical-align: middle; color: #d97706; font-style: italic; font-weight: 500;">Recess</td>`;
            } else if (classInfo) {
                bodyHTML += `
                    <td style="padding: 15px 10px; border: 1px solid #eef2f7; vertical-align: middle;">
                        <div class="fw-bold" style="font-size: 1.05rem; color: #1e293b; letter-spacing: -0.01em;">${classInfo.subject}</div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 500;">
                            <i class="fas fa-map-marker-alt" style="color: #94a3b8; margin-right: 3px;"></i>${classInfo.room || 'Room TBD'}
                        </div>
                    </td>
                `;
            } else {
                bodyHTML += '<td style="background: #fafafa; color: #cbd5e1; font-size: 1.2rem;">-</td>';
            }
        });
        bodyHTML += '</tr>';
    });

    tableBody.innerHTML = bodyHTML;
}

// Open scholarship eligibility check
function openScholarshipEligibilityCheck() {
    document.getElementById('scholarshipEligibilityModal').style.display = 'block';
}

// Close scholarship eligibility modal
function closeScholarshipEligibility() {
    document.getElementById('scholarshipEligibilityModal').style.display = 'none';
}

// Check scholarship eligibility
function checkScholarshipEligibility(formData) {
    const eligibilityData = {
        cgpa: currentUser.cgpa || 8.5,
        family_income: formData.get('familyIncome'),
        category: formData.get('studentCategory'),
        gender: formData.get('studentGender')
    };

    fetch('/api/scholarships/eligible', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(eligibilityData)
    })
        .then(response => response.json())
        .then(data => {
            updateEligibleScholarshipsDisplay(data);
            showEligibilityStatus(eligibilityData);
        })
        .catch(error => {
            console.error('Error checking eligibility:', error);
        });
}

// Update eligible scholarships display
function updateEligibleScholarshipsDisplay(scholarships) {
    const container = document.getElementById('eligibleScholarships');
    if (!container) return;

    container.innerHTML = '';

    const eligibleScholarships = scholarships.filter(s => s.eligible);
    const ineligibleScholarships = scholarships.filter(s => !s.eligible);

    if (eligibleScholarships.length > 0) {
        const eligibleSection = document.createElement('div');
        eligibleSection.innerHTML = '<h3 class="section-title eligible">✅ Eligible Scholarships</h3>';

        eligibleScholarships.forEach(scholarship => {
            const card = createScholarshipCard(scholarship, true);
            eligibleSection.appendChild(card);
        });

        container.appendChild(eligibleSection);
    }

    if (ineligibleScholarships.length > 0) {
        const ineligibleSection = document.createElement('div');
        ineligibleSection.innerHTML = '<h3 class="section-title ineligible">❌ Not Eligible</h3>';

        ineligibleScholarships.forEach(scholarship => {
            const card = createScholarshipCard(scholarship, false);
            ineligibleSection.appendChild(card);
        });

        container.appendChild(ineligibleSection);
    }
}

// Create scholarship card
function createScholarshipCard(scholarship, eligible) {
    const card = document.createElement('div');
    card.className = `scholarship-card ${eligible ? 'eligible' : 'ineligible'}`;

    card.innerHTML = `
        <div class="scholarship-header">
            <h4>${scholarship.name}</h4>
            <span class="scholarship-amount">₹${scholarship.amount.toLocaleString()}</span>
        </div>
        <p class="scholarship-description">${scholarship.description}</p>
        <div class="scholarship-details">
            <p><strong>Category:</strong> ${scholarship.category.charAt(0).toUpperCase() + scholarship.category.slice(1)}</p>
            <p><strong>Deadline:</strong> ${new Date(scholarship.deadline).toLocaleDateString()}</p>
        </div>
        ${!eligible ? `
            <div class="ineligibility-reasons">
                <h5>Reasons for ineligibility:</h5>
                <ul>
                    ${scholarship.ineligibility_reasons.map(reason => `<li>${reason}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        <div class="scholarship-actions">
            <a href="${scholarship.official_website}" target="_blank" class="official-link-btn">
                <i class="fas fa-external-link-alt"></i> Official Website
            </a>
            ${eligible ? `
                <button onclick="applyForScholarship(${scholarship.id})" class="apply-scholarship-btn">
                    Apply Now
                </button>
            ` : ''}
        </div>
    `;

    return card;
}

// Show eligibility status
function showEligibilityStatus(eligibilityData) {
    const statusContainer = document.getElementById('eligibilityStatus');
    statusContainer.style.display = 'block';

    statusContainer.innerHTML = `
        <div class="eligibility-summary">
            <h4>Your Profile Summary</h4>
            <div class="profile-details">
                <span><strong>CGPA:</strong> ${eligibilityData.cgpa}</span>
                <span><strong>Family Income:</strong> ₹${parseInt(eligibilityData.family_income).toLocaleString()}</span>
                <span><strong>Category:</strong> ${eligibilityData.category.toUpperCase()}</span>
                <span><strong>Gender:</strong> ${eligibilityData.gender.charAt(0).toUpperCase() + eligibilityData.gender.slice(1)}</span>
            </div>
        </div>
    `;
}

// Apply for scholarship
function applyForScholarship(scholarshipId) {
    alert(`Scholarship application process for scholarship ${scholarshipId} would be initiated here.`);
}

// Form submission handlers
document.addEventListener('DOMContentLoaded', function () {
    // Academic query form
    // Academic query form with enhanced logic
    const academicQueryForm = document.getElementById('academicQueryForm');
    if (academicQueryForm) {
        academicQueryForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData(this);
            const queryType = formData.get('queryType');

            const queryData = {
                student_id: currentUser.id,
                query_type: queryType,
                title: formData.get('queryTitle'), // Mapped from updated ID
                content: formData.get('queryDescription') // Mapped from updated ID
            };

            // Conditional Data
            if (queryType === 'academic') {
                queryData.subject_name = formData.get('querySubject'); // Note: ID is querySubject, name might be missing in HTML? Check HTML input names.
                // In HTML replace I didn't set 'name' attribute for select. I should rely on ID or fix HTML.
                // Correction: FormData uses 'name' attribute. The HTML I pasted has id="querySubject" but NO name="querySubject".
                // I should assume I need to get by ID if name is missing, but FormData requires name.
                // Let's use document.getElementById since I control the IDs.
                queryData.subject_name = document.getElementById('querySubject').value;
                queryData.faculty_id = document.getElementById('queryFaculty').value;

                if (!queryData.subject_name) {
                    alert('Please select a subject.');
                    return;
                }
            } else {
                queryData.subject_name = 'Mentorship';
            }

            // Manual check for title/desc if names missing
            queryData.title = document.getElementById('queryTitle').value;
            queryData.content = document.getElementById('queryDescription').value;

            fetch('/api/queries/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(queryData)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(data.message || 'Query submitted successfully!');
                        closeAcademicQueryModal();
                        this.reset();
                        // Reset UI state
                        toggleQueryType('academic');
                        loadAcademicQueries();
                    } else {
                        alert(data.error || 'Failed to submit query');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred. Please try again.');
                });
        });
    }

    // Interest survey form
    const interestSurveyForm = document.getElementById('interestSurveyForm');
    if (interestSurveyForm) {
        interestSurveyForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData(this);
            const interests = formData.getAll('interests');

            if (interests.length === 0) {
                alert('Please select at least one interest');
                return;
            }

            fetch('/api/student/club-recommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ interests: interests })
            })
                .then(response => response.json())
                .then(data => {
                    updateClubRecommendations(data);
                    closeInterestSurvey();
                    showClubTab('recommendations', true);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while getting recommendations');
                });
        });
    }

    // Scholarship eligibility form
    const scholarshipEligibilityForm = document.getElementById('scholarshipEligibilityForm');
    if (scholarshipEligibilityForm) {
        scholarshipEligibilityForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData(this);
            checkScholarshipEligibility(formData);
            closeScholarshipEligibility();
        });
    }
});

// Update club recommendations
function updateClubRecommendations(recommendations) {
    const container = document.getElementById('clubRecommendations');
    if (!container) return;

    container.innerHTML = '';

    if (recommendations.length === 0) {
        container.innerHTML = '<p class="no-recommendations">No clubs match your interests. Try selecting different interests!</p>';
        return;
    }

    recommendations.forEach(rec => {
        const club = rec.club;
        const card = document.createElement('div');
        card.className = 'club-recommendation-card';

        card.innerHTML = `
            <div class="recommendation-header">
                <h4>${club.name}</h4>
                <span class="match-score">${rec.match_score} matches</span>
            </div>
            <p class="club-description">${club.description}</p>
            <div class="matching-interests">
                <strong>Matching Interests:</strong>
                ${rec.matching_interests.map(interest => `<span class="interest-tag">${interest}</span>`).join('')}
            </div>
            <div class="club-contact">
                <p><strong>Coordinator:</strong> ${club.faculty_coordinator || 'N/A'}</p>
                <p><strong>Contact:</strong> ${club.contact_email}</p>
            </div>
            <div class="club-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                ${club.instagram_link ?
                `<a href="${club.instagram_link}" target="_blank" class="instagram-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; background: #E1306C; color: white; border: none; padding: 8px 15px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 0.9rem;">
                    <i class="fab fa-instagram" style="margin-right: 8px;"></i> Instagram
                </a>` : ''}
                <button onclick="joinClub(${club.id})" class="join-club-btn" style="flex: 2;">Join This Club</button>
            </div>
        `;

        container.appendChild(card);
    });
}

// --- Settings Functionality ---

// Change Password
function changePassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        alert("New passwords do not match!");
        return;
    }

    fetch('/api/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                document.getElementById('changePasswordForm').reset();
            } else {
                alert(data.message || 'Failed to change password');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while changing password');
        });
}

// Check Password Strength and update UI
function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBar = document.getElementById('strengthBar');
    const strengthLabel = document.getElementById('strengthLabel');

    // Requirements
    const lengthReq = document.getElementById('req-length');
    const specialReq = document.getElementById('req-special');
    const numberReq = document.getElementById('req-number');
    const upperReq = document.getElementById('req-upper');

    // Regex check
    const hasLength = password.length >= 8;
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);

    // Update Checklist UI
    updateRequirement(lengthReq, hasLength);
    updateRequirement(specialReq, hasSpecial);
    updateRequirement(numberReq, hasNumber);
    updateRequirement(upperReq, hasUpper);

    // Calculate Strength Score (0-4)
    let score = 0;
    if (hasLength) score++;
    if (hasSpecial) score++;
    if (hasNumber) score++;
    if (hasUpper) score++;

    // Update Bar and Label
    let width = 0;
    let color = '#dc3545'; // Red
    let text = 'Weak';

    switch (score) {
        case 0:
        case 1:
            width = 25;
            color = '#dc3545';
            text = 'Weak';
            break;
        case 2:
            width = 50;
            color = '#ffc107'; // Yellow
            text = 'Fair';
            break;
        case 3:
            width = 75;
            color = '#17a2b8'; // Blue
            text = 'Good';
            break;
        case 4:
            width = 100;
            color = '#28a745'; // Green
            text = 'Strong';
            break;
    }

    if (password.length === 0) {
        width = 0;
        text = 'Weak';
    }

    strengthBar.style.width = width + '%';
    strengthBar.style.backgroundColor = color;
    strengthLabel.textContent = text;
    strengthLabel.style.color = color;
}

function updateRequirement(element, isValid) {
    const icon = element.querySelector('i');
    if (isValid) {
        element.style.color = '#28a745';
        element.style.fontWeight = '600';
        icon.className = 'fas fa-check-circle';
        icon.style.color = '#28a745';
    } else {
        element.style.color = '#666';
        element.style.fontWeight = 'normal';
        icon.className = 'far fa-circle';
        icon.style.color = '#ccc';
    }
}

// Duplicate loadStudentIdCard removed.
// The robust version is defined earlier in the file around line 1247.

// Print ID Card
function printIdCard() {
    const printContent = document.getElementById('printableIdCard').outerHTML;
    const win = window.open('', '', 'height=600,width=800');
    win.document.write('<html><head><title>Student ID Card</title>');
    // Include styles for printing
    win.document.write('<link rel="stylesheet" href="/static/css/dashboard.css">');
    win.document.write('<style>body { display: flex; justify-content: center; align-items: center; height: 100vh; background: #fff; } .id-card-container { box-shadow: none; border: 1px solid #ddd; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }</style>');
    win.document.write('</head><body>');
    win.document.write(printContent);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
}

// Set Theme
function setTheme(mode) {
    const lightBtn = document.getElementById('theme-light-btn');
    const darkBtn = document.getElementById('theme-dark-btn');

    if (mode === 'dark') {
        document.body.classList.add('dark-mode');

        // Update Buttons Visuals
        if (lightBtn) {
            lightBtn.classList.remove('active');
            lightBtn.style.background = 'transparent';
            lightBtn.style.color = '#ccc';
            lightBtn.style.boxShadow = 'none';
        }

        if (darkBtn) {
            darkBtn.classList.add('active');
            darkBtn.style.background = '#2c3e50'; // Dark card-like
            darkBtn.style.color = '#fff';
            darkBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        }

        // Inject Styles if needed
        injectDarkStyles();
    } else {
        document.body.classList.remove('dark-mode');

        // Update Buttons Visuals
        if (darkBtn) {
            darkBtn.classList.remove('active');
            darkBtn.style.background = 'transparent';
            darkBtn.style.color = '#666';
            darkBtn.style.boxShadow = 'none';
        }

        if (lightBtn) {
            lightBtn.classList.add('active');
            lightBtn.style.background = 'white';
            lightBtn.style.color = '#333';
            lightBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }
    }
}

function injectDarkStyles() {
    if (!document.getElementById('darkModeStyles')) {
        const style = document.createElement('style');
        style.id = 'darkModeStyles';
        style.textContent = `
            .dark-mode {
                background-color: #1a1a1a;
                color: #e0e0e0;
            }
            .dark-mode .sidebar {
                background-color: #242424;
                border-right: 1px solid #333;
            }
            .dark-mode .header {
                background-color: #242424;
                border-bottom: 1px solid #333;
                color: #fff;
            }
            .dark-mode .card, .dark-mode .settings-card.premium-ui, .dark-mode .appearance-card {
                background-color: #2d2d2d !important;
                color: #fff;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
            }
            .dark-mode .card h3, .dark-mode .card-header h3 {
                color: #fff !important;
            }
            .dark-mode .appearance-label span {
                color: #fff !important;
            }
            .dark-mode .appearance-label i {
                color: #ccc !important;
            }
            .dark-mode input, .dark-mode select, .dark-mode textarea {
                background-color: #383838 !important;
                color: #fff !important;
                border-color: #555 !important;
            }
            .dark-mode .theme-toggle-group {
                background-color: #222 !important;
            }
            .dark-mode .password-requirements p, .dark-mode .strength-text span:first-child {
                color: #ccc !important;
            }
            .dark-mode .strength-bar-bg {
                background-color: #444 !important;
            }
            /* Menus and common */
            .dark-mode .menu-item { color: #aaa; }
            .dark-mode .menu-item:hover, .dark-mode .menu-item.active {
                background-color: #333; color: #fff;
            }
        `;
        document.head.appendChild(style);
    }
}

// Load Exam Schedule
function loadExamSchedule() {
    const wrapper = document.getElementById('examScheduleWrapper');
    if (!wrapper) return;

    wrapper.innerHTML = '<div style="text-align: center; padding: 30px; color: #666;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top: 10px;">Loading exam schedule...</p></div>';

    fetch('/api/student/exams')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                wrapper.innerHTML = `<div class="error-state" style="text-align:center; padding:30px; color:#dc3545;"><i class="fas fa-exclamation-circle fa-2x"></i><p>${data.error}</p></div>`;
                return;
            }

            if (data.length === 0) {
                wrapper.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-calendar-check" style="font-size: 3rem; margin-bottom: 20px; color: #ddd;"></i>
                        <p>No exam schedule published yet.</p>
                    </div>`;
                return;
            }

            // Group by date (optional) or just list
            let html = `
                <table class="data-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background: #f8fafc; text-align: left;">
                            <th style="padding: 15px; font-weight: 600; color: #444; border-bottom: 2px solid #eef2f7;">Subject</th>
                            <th style="padding: 15px; font-weight: 600; color: #444; border-bottom: 2px solid #eef2f7;">Date & Time</th>
                            <th style="padding: 15px; font-weight: 600; color: #444; border-bottom: 2px solid #eef2f7;">Room</th>
                            <th style="padding: 15px; font-weight: 600; color: #444; border-bottom: 2px solid #eef2f7;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(exam => {
                html += `
                    <tr style="border-bottom: 1px solid #eee; transition: background 0.2s;">
                        <td style="padding: 15px;">
                            <div style="font-weight: 600; color: #333;">${exam.subject_name}</div>
                            <div style="font-size: 0.85em; color: #888;">${exam.subject_code}</div>
                        </td>
                        <td style="padding: 15px;">
                            <div style="color: #333;"><i class="far fa-calendar-alt" style="margin-right:5px; color:#667eea;"></i> ${exam.date}</div>
                            <div style="font-size: 0.9em; color: #666; margin-top:4px;"><i class="far fa-clock" style="margin-right:5px; color:#667eea;"></i> ${exam.time}</div>
                        </td>
                        <td style="padding: 15px; color: #555;">
                            ${exam.room || 'TBA'}
                        </td>
                        <td style="padding: 15px;">
                            <span class="status-badge ${exam.status_class}" style="
                                padding: 5px 12px; 
                                border-radius: 20px; 
                                font-size: 0.85em; 
                                font-weight: 500;
                                background: ${exam.status_class === 'upcoming' ? '#e3f2fd' : (exam.status_class === 'ongoing' ? '#fff3cd' : '#e8f5e9')};
                                color: ${exam.status_class === 'upcoming' ? '#2196f3' : (exam.status_class === 'ongoing' ? '#856404' : '#2e7d32')};
                            ">
                                ${exam.status}
                            </span>
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            wrapper.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading exams:', error);
            wrapper.innerHTML = `<div class="error-state" style="text-align:center; padding:30px; color:#dc3545;"><i class="fas fa-exclamation-triangle fa-2x"></i><p>Failed to load schedule. Please try again later.</p></div>`;
        });
}

// Drive Folders logic (keep at end if present)
const driveFolders = {
    'DE': 'https://drive.google.com/drive/folders/1guTPdSVE-nHDqZhpwaFi68N-5-kHE92R?usp=drive_link',
    'FSD': 'https://drive.google.com/drive/folders/1z1s0gjMWZ3bIgb5WUjTS1vLLm_K5-N_J?usp=drive_link',
    'PS': 'https://drive.google.com/drive/folders/1qSvUhaDEmvynEdmGNVC_fNkzYOLGHD1I?usp=drive_link',
    'PYTHON': 'https://drive.google.com/drive/folders/19xElaGMtLzc39tFnoBHcVG6t0RIHyBhN?usp=drive_link'
};

// Function to open Google Drive folder
function openDriveFolder(subject) {
    const url = driveFolders[subject];
    if (url) {
        // Show a brief loading message
        const folderCard = event.target.closest('.folder-card');
        if (folderCard) {
            const originalContent = folderCard.innerHTML;
            folderCard.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            folderCard.style.color = 'white';
            folderCard.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-external-link-alt" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p style="margin: 0; font-weight: 600;">Opening ${subject} Notes...</p>
                    <small style="opacity: 0.8;">Redirecting to Google Drive</small>
                </div>
            `;

            // Restore original content after a brief delay
            setTimeout(() => {
                folderCard.style.background = 'white';
                folderCard.style.color = '#333';
                folderCard.innerHTML = originalContent;
            }, 2000);
        }

        // Open the Google Drive link in a new tab
        window.open(url, '_blank');
    } else {
        alert('Drive folder link not found for ' + subject);
    }
}

// Load notes function (placeholder for compatibility)
function loadNotes() {
    // This function is called when the notes section is shown
    // The folder cards are already loaded in the HTML, so no additional loading needed
    console.log('Notes section loaded - Google Drive folders ready');
}

// --- Academic Query System Logic ---

let currentQueries = [];
let currentFilter = 'all';
let activeThreadId = null;

function loadAcademicQueries() {
    if (!currentUser) return;

    // Show Loading
    const container = document.getElementById('academicQueriesList');
    if (container) container.innerHTML = '<div class="text-center p-4">Loading queries...</div>';

    fetch(`/api/queries/student/${currentUser.student_id || currentUser.id}`)
        .then(res => res.json())
        .then(data => {
            currentQueries = data;
            renderQueries();
            updateQueryStats();
        })
        .catch(err => {
            console.error("Error loading queries", err);
            if (container) container.innerHTML = '<div class="error p-4">Failed to load queries.</div>';
        });
}

function filterQueries(status) {
    currentFilter = status;

    // Update active tab UI
    document.querySelectorAll('.query-tabs .tab-btn').forEach(btn => {
        if (btn.textContent.toLowerCase() === status) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    renderQueries();
}

function renderQueries() {
    const container = document.getElementById('academicQueriesList');
    if (!container) return;

    container.innerHTML = '';

    const filtered = currentQueries.filter(q => {
        if (currentFilter === 'all') return true;
        return q.status.toLowerCase() === currentFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="no-data p-4 text-center text-muted">No queries found in this category.</div>';
        return;
    }

    filtered.forEach(q => {
        const card = document.createElement('div');
        card.className = 'query-card';
        // Basic Card Styling override or integration
        card.style.cssText = "background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #eee; cursor: pointer; transition: transform 0.2s; position: relative;";
        card.onmouseover = () => card.style.transform = "translateY(-2px)";
        card.onmouseout = () => card.style.transform = "translateY(0)";

        // Status Badge Color
        let badgeColor = '#6c757d'; // secondary
        if (q.status === 'answered') badgeColor = '#0d6efd'; // primary
        if (q.status === 'resolved') badgeColor = '#198754'; // success
        if (q.status === 'clarification') badgeColor = '#ffc107'; // warning

        // Type UI
        const isMentor = q.type === 'mentorship';
        const typeBadge = isMentor
            ? '<span style="background-color: #6f42c1; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-right: 6px; font-weight: bold;">MENTOR</span>'
            : '<span style="background-color: #17a2b8; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-right: 6px; font-weight: bold;">ACADEMIC</span>';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <h4 style="margin: 0 0 5px 0; color: #333; font-size: 1rem; display: flex; align-items: center;">
                    ${typeBadge}
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${q.title}</span>
                </h4>
                <span class="badge" style="background-color: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem;">${q.status.toUpperCase()}</span>
            </div>
            <div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">
                <strong>${q.subject}</strong> • ${q.faculty_name}
            </div>
            <div style="font-size: 0.9rem; color: #444; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${q.last_message || 'No messages yet.'}
            </div>
            <div style="font-size: 0.75rem; color: #999; text-align: right;">
                Last updated: ${q.updated_at}
            </div>
        `;

        card.onclick = () => openQueryThread(q.id);
        container.appendChild(card);
    });
}

function updateQueryStats() {
    // Simple stats from currentQueries
    const total = currentQueries.length;
    const pending = currentQueries.filter(q => q.status === 'pending').length;
    const answered = currentQueries.filter(q => q.status === 'answered').length;

    if (document.getElementById('totalQueries')) document.getElementById('totalQueries').textContent = total;
    if (document.getElementById('pendingQueries')) document.getElementById('pendingQueries').textContent = pending;
    if (document.getElementById('answeredQueries')) document.getElementById('answeredQueries').textContent = answered;
}

// --- Thread View ---

function openQueryThread(threadId) {
    activeThreadId = threadId;
    const modal = document.getElementById('queryThreadModal');
    const msgContainer = document.getElementById('threadMessages');

    if (modal) {
        modal.style.display = 'block';
        if (msgContainer) msgContainer.innerHTML = '<div class="text-center p-3">Loading conversation...</div>';

        fetch(`/api/queries/thread/${threadId}`)
            .then(res => res.json())
            .then(data => {
                renderThreadDetails(data);
            })
            .catch(err => {
                console.error(err);
                if (msgContainer) msgContainer.innerHTML = '<div class="text-danger p-3">Failed to load thread.</div>';
            });
    }
}

function renderThreadDetails(thread) {
    const titleEl = document.getElementById('threadTitle');
    const metaEl = document.getElementById('threadMeta');
    const statusEl = document.getElementById('threadStatusBadge');

    if (titleEl) titleEl.textContent = thread.title;
    if (metaEl) metaEl.textContent = `${thread.subject} • ${thread.faculty_name || 'Unassigned'}`;
    if (statusEl) statusEl.textContent = thread.status.toUpperCase();

    const container = document.getElementById('threadMessages');
    if (!container) return;

    container.innerHTML = '';

    if (!thread.posts || thread.posts.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No messages yet.</p>';
        return;
    }

    thread.posts.forEach(post => {
        const div = document.createElement('div');
        const isMe = post.role === 'student'; // Assuming viewer is student

        div.style.cssText = `
            display: flex; 
            flex-direction: column; 
            align-items: ${isMe ? 'flex-end' : 'flex-start'}; 
            margin-bottom: 15px;
        `;

        let attachmentHtml = '';
        if (post.attachments && post.attachments.length > 0) {
            post.attachments.forEach(att => {
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(att.file_type.toLowerCase());
                if (isImage) {
                    attachmentHtml += `<div style="margin-top:8px;"><img src="${att.file_url}" style="max-width:100%; border-radius:8px; cursor:pointer;" onclick="window.open(this.src)"></div>`;
                } else {
                    attachmentHtml += `<div style="margin-top:8px;"><a href="${att.file_url}" target="_blank" style="text-decoration:none; color:${isMe ? '#0f5132' : '#0d6efd'}; font-size:0.9rem;"><i class="fas fa-file-download"></i> ${att.file_name}</a></div>`;
                }
            });
        }

        div.innerHTML = `
            <div style="
                background: ${isMe ? '#d1e7dd' : 'white'}; 
                color: ${isMe ? '#0f5132' : '#333'};
                padding: 10px 15px; 
                border-radius: 15px; 
                border-bottom-${isMe ? 'right' : 'left'}-radius: 0;
                max-width: 80%; 
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            ">
                <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 4px; color: ${isMe ? '#0f5132' : '#0d6efd'};">
                    ${post.author_name} <span style="font-weight: normal; color: #666; font-size: 0.7rem;">• ${post.role.toUpperCase()}</span>
                </div>
                <div style="white-space: pre-wrap;">${post.content}</div>
                ${attachmentHtml}
                <div style="font-size: 0.7rem; color: #888; text-align: right; margin-top: 5px;">${post.created_at}</div>
            </div>
        `;
        container.appendChild(div);
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Toggle Resolve Button
    const resolveBtn = document.getElementById('resolveBtn');
    if (resolveBtn) {
        if (thread.status === 'resolved') {
            resolveBtn.disabled = true;
            resolveBtn.innerHTML = '<i class="fas fa-check-circle"></i> Resolved';
        } else {
            resolveBtn.disabled = false;
            resolveBtn.innerHTML = '<i class="fas fa-check"></i> Mark as Resolved';
        }
    }
}

function submitQueryReply() {
    if (!activeThreadId || !currentUser) return;

    const content = document.getElementById('replyContent').value;
    const fileInput = document.getElementById('replyFile');
    const file = fileInput ? fileInput.files[0] : null;

    if (!content.trim() && !file) return;

    const formData = new FormData();
    formData.append('user_id', currentUser.id);
    formData.append('role', 'student');
    formData.append('content', content);
    if (file) {
        formData.append('file', file);
    }

    // Determine headers - fetch automatically sets boundary for FormData if Content-Type is NOT set
    fetch(`/api/queries/${activeThreadId}/reply`, {
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('replyContent').value = '';
                if (fileInput) fileInput.value = ''; // Clear file input
                if (document.getElementById('fileNameDisplay')) document.getElementById('fileNameDisplay').textContent = '';

                // Refresh thread
                openQueryThread(activeThreadId);
                // Refresh list in background to update 'last message'
                loadAcademicQueries();
            } else {
                alert('Failed to send reply');
            }
        })
        .catch(err => console.error(err));
}

function markQueryResolved() {
    if (!activeThreadId) return;
    if (!confirm("Are you sure you want to mark this query as resolved?")) return;

    fetch(`/api/queries/${activeThreadId}/resolve`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                openQueryThread(activeThreadId); // Refresh UI
                loadAcademicQueries(); // Update list status
            }
        });
}

function closeQueryThreadModal() {
    const modal = document.getElementById('queryThreadModal');
    if (modal) modal.style.display = 'none';
    activeThreadId = null;
}

// --- Create Modal Logic ---

function openCreateQueryModal() {
    // Re-use logic for existing modal ID 'academicQueryModal' 
    // Just ensure dropdowns are loaded
    const modal = document.getElementById('academicQueryModal');
    if (modal) {
        modal.style.display = 'block';
        loadSubjectDropdown();
    }
}

function closeAcademicQueryModal() {
    const modal = document.getElementById('academicQueryModal');
    if (modal) modal.style.display = 'none';
}

function loadSubjectDropdown() {
    const select = document.getElementById('querySubject');
    if (!select || select.options.length > 1) return; // Already loaded?

    fetch('/api/common/subjects')
        .then(res => res.json())
        .then(subjects => {
            select.innerHTML = '<option value="">Select Subject</option>';
            subjects.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                select.appendChild(opt);
            });
        });
}

// Initialize Queries on Load functionality
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        // Preload if needed or verify section state
    }

    // Hook into navigation or just use the onclick handlers we added
    const queriesLink = document.querySelector('a[href="#queries"]');
    if (queriesLink) {
        queriesLink.addEventListener('click', () => {
            setTimeout(loadAcademicQueries, 100);
        });
    }
});

// --- Enhanced Query UI Helpers ---

function toggleQueryType(type) {
    const academic = document.getElementById('academicFields');
    const mentor = document.getElementById('mentorFields');
    if (!academic || !mentor) return;

    if (type === 'academic') {
        academic.style.display = 'block';
        mentor.style.display = 'none';
        // Reset required attribute if using HTML5 validation, but we used manual check in JS
    } else {
        academic.style.display = 'none';
        mentor.style.display = 'block';
    }
}

function loadFacultyForSubject() {
    const subject = document.getElementById('querySubject').value;
    const facultySelect = document.getElementById('queryFaculty');
    if (!facultySelect) return;

    if (!subject) {
        facultySelect.innerHTML = '<option value="">Select Subject First</option>';
        facultySelect.disabled = true;
        return;
    }

    // Show Loading
    facultySelect.innerHTML = '<option value="">Loading...</option>';
    facultySelect.disabled = true;

    fetch(`/api/faculty/by-subject?subject=${encodeURIComponent(subject)}`)
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) {
                facultySelect.innerHTML = '<option value="">No faculty specific to this subject (Auto-assign)</option>';
                // Keep enabled so they can see empty? Or keep logic to allow empty selection
                facultySelect.disabled = false;
            } else {
                facultySelect.innerHTML = '<option value="">Select Faculty (Optional - Auto Assign)</option>';
                data.forEach(fac => {
                    const opt = document.createElement('option');
                    opt.value = fac.id;
                    opt.textContent = fac.name;
                    facultySelect.appendChild(opt);
                });
                facultySelect.disabled = false;
            }
        })
        .catch(err => {
            console.error(err);
            facultySelect.innerHTML = '<option value="">Error loading faculty</option>';
        });
}

// Logout function
function logout() {
    sessionStorage.removeItem('userData');
    localStorage.removeItem('userData');
    window.location.href = '/';
}