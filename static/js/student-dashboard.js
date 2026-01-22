// Global variables
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
    loadAttendanceData();
    loadMarksData();
    loadNotices();
    loadFeeDetails();
    loadScholarships();
    loadQueries();
    loadNotifications();

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
function loadUserData() {
    if (currentUser) {
        document.getElementById('studentName').textContent = currentUser.full_name || 'Student';
        document.getElementById('rollNumber').textContent = currentUser.roll_number || 'N/A';
        document.getElementById('enrollmentNumber').textContent = currentUser.enrollment_number || 'N/A';
        document.getElementById('currentSemester').textContent = `${currentUser.current_semester || 'N/A'} Semester`;
        document.getElementById('branch').textContent = currentUser.branch || 'N/A';
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
        'dashboard': 'Dashboard',
        'attendance': 'Attendance Management',
        'marks': 'Academic Performance',
        'notes': 'Study Materials',
        'notices': 'Notices & Announcements',
        'fees': 'Fee Management',
        'queries': 'Query Management',
        'examination': 'Examination Module',
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
            loadAcademicQueries();
            break;
        case 'idcard':
            loadStudentIdCard();
            break;
        case 'clubs':
            loadAllClubs();
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

// Load attendance data
function loadAttendanceData() {
    if (!currentUser) return;

    fetch(`/api/student/attendance/${currentUser.id}`)
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

// Load marks data
function loadMarksData() {
    if (!currentUser) return;

    fetch(`/api/student/marks/${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            updateMarksDisplay(data);
        })
        .catch(error => {
            console.error('Error loading marks:', error);
            // Use mock data for demo
            const mockData = [
                { subject_name: 'Mathematics', exam_type: 'internal', marks_obtained: 85, max_marks: 100, percentage: 85 },
                { subject_name: 'Physics', exam_type: 'internal', marks_obtained: 78, max_marks: 100, percentage: 78 },
                { subject_name: 'Computer Science', exam_type: 'internal', marks_obtained: 92, max_marks: 100, percentage: 92 }
            ];
            updateMarksDisplay(mockData);
        });
}

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

// Load queries
function loadQueries() {
    if (!currentUser) return;

    fetch(`/api/queries?student_id=${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            updateQueriesDisplay(data);
        })
        .catch(error => {
            console.error('Error loading queries:', error);
        });
}

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

// Load fee details
function loadFeeDetails() {
    if (!currentUser) return;

    fetch(`/api/fee/details/${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            updateFeeDisplay(data);
        })
        .catch(error => {
            console.error('Error loading fee details:', error);
        });
}

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

    fetch(`/api/student/id-card/${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            generateIdCard(data);
        })
        .catch(error => {
            console.error('Error loading ID card:', error);
        });
}

// Generate ID card
function generateIdCard(data) {
    const idCardContainer = document.getElementById('studentIdCard');
    if (!idCardContainer) return;

    idCardContainer.innerHTML = `
        <div class="id-card-front">
            <div class="id-card-header">
                <div class="college-logo">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <div class="college-info">
                    <h3>ABC Engineering College</h3>
                    <p>Student Identity Card</p>
                </div>
            </div>
            <div class="id-card-body">
                <div class="student-photo">
                    <img src="${data.photo_url}" alt="Student Photo">
                </div>
                <div class="student-details">
                    <div class="detail-row">
                        <span class="label">Name:</span>
                        <span class="value">${data.full_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Roll No:</span>
                        <span class="value">${data.roll_number}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Enrollment:</span>
                        <span class="value">${data.enrollment_number}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Branch:</span>
                        <span class="value">${data.branch}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Semester:</span>
                        <span class="value">${data.semester}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Blood Group:</span>
                        <span class="value">${data.blood_group}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Emergency:</span>
                        <span class="value">${data.emergency_contact}</span>
                    </div>
                </div>
            </div>
            <div class="id-card-footer">
                <p>Valid Until: ${data.valid_until}</p>
                <div class="signature-section">
                    <div class="signature">
                        <p>Principal's Signature</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Download ID card
function downloadIdCard() {
    alert('ID Card download functionality would generate a PDF version of the ID card.');
}

// Check for low attendance and show modal
function checkLowAttendance() {
    // Mock check - in real implementation, this would check actual attendance data
    const hasLowAttendance = Math.random() > 0.7; // 30% chance for demo

    if (hasLowAttendance) {
        setTimeout(() => {
            const modal = document.getElementById('attendanceModal');
            if (modal) {
                modal.style.display = 'block';
            }
        }, 2000);
    }
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

// Logout function
function logout() {
    localStorage.removeItem('userData');
    window.location.href = '/';
}

// Load all clubs
function loadAllClubs() {
    fetch('/api/clubs')
        .then(response => response.json())
        .then(data => {
            updateAllClubsDisplay(data);
        })
        .catch(error => {
            console.error('Error loading clubs:', error);
        });
}

// Update all clubs display
function updateAllClubsDisplay(clubs) {
    const container = document.getElementById('allClubsGrid');
    if (!container) return;

    container.innerHTML = '';

    clubs.forEach(club => {
        const clubCard = document.createElement('div');
        clubCard.className = `club-card ${club.category}`;

        clubCard.innerHTML = `
            <div class="club-header">
                <h4>${club.name}</h4>
                <span class="club-category ${club.category}">${club.category.toUpperCase()}</span>
            </div>
            <p class="club-description">${club.description}</p>
            <div class="club-details">
                <p><strong>Coordinator:</strong> ${club.faculty_coordinator || 'N/A'}</p>
                <p><strong>Student Lead:</strong> ${club.student_coordinator}</p>
                <p><strong>Meeting:</strong> ${club.meeting_schedule}</p>
                <p><strong>Contact:</strong> ${club.contact_email}</p>
            </div>
            <button onclick="joinClub(${club.id})" class="join-club-btn">Join Club</button>
        `;

        container.appendChild(clubCard);
    });
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
function showClubTab(tabName) {
    document.querySelectorAll('.club-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(`${tabName}Tab`).classList.add('active');
    event.target.classList.add('active');

    if (tabName === 'all') {
        loadAllClubs();
    }
}

// Join club
function joinClub(clubId) {
    alert(`Club joining functionality for club ${clubId} would be implemented here.`);
}

// Load student timetable
function loadStudentTimetable() {
    if (!currentUser) return;

    fetch(`/api/student/timetable/${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            generateTimetableTable(data);
        })
        .catch(error => {
            console.error('Error loading timetable:', error);
        });
}

// Generate timetable table
function generateTimetableTable(timetableData) {
    const table = document.getElementById('studentTimetable');
    if (!table) return;

    const timeSlots = ['09:00-10:00', '10:00-11:00', '11:30-12:30', '12:30-13:30', '14:30-15:30', '15:30-16:30'];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Create table header
    let headerHTML = '<thead><tr><th>Time</th>';
    days.forEach(day => {
        headerHTML += `<th>${day.charAt(0).toUpperCase() + day.slice(1)}</th>`;
    });
    headerHTML += '</tr></thead>';

    // Create table body
    let bodyHTML = '<tbody>';
    timeSlots.forEach(timeSlot => {
        bodyHTML += `<tr><td class="time-slot">${timeSlot}</td>`;
        days.forEach(day => {
            const classInfo = timetableData[day] && timetableData[day][timeSlot];
            if (classInfo) {
                bodyHTML += `
                    <td class="class-cell ${classInfo.subject_code.toLowerCase()}">
                        <div class="subject-name">${classInfo.subject_name}</div>
                        <div class="subject-code">${classInfo.subject_code}</div>
                        <div class="faculty-name">${classInfo.faculty_name}</div>
                        <div class="room-number">${classInfo.room_number}</div>
                    </td>
                `;
            } else {
                bodyHTML += '<td class="empty-cell">-</td>';
            }
        });
        bodyHTML += '</tr>';
    });
    bodyHTML += '</tbody>';

    table.innerHTML = headerHTML + bodyHTML;
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
    const academicQueryForm = document.getElementById('academicQueryForm');
    if (academicQueryForm) {
        academicQueryForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData(this);
            const queryData = {
                student_id: currentUser.id,
                subject_id: formData.get('querySubject'),
                faculty_id: formData.get('queryFaculty'),
                query_title: formData.get('queryTitle'),
                query_description: formData.get('queryDescription')
            };

            fetch('/api/student/queries', {
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
                        closeAcademicQueryModal();
                        this.reset();
                        loadAcademicQueries();
                    } else {
                        alert('Failed to submit query');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while submitting the query');
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
                    showClubTab('recommendations');
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
                <p><strong>Coordinator:</strong> ${club.faculty_coordinator}</p>
                <p><strong>Contact:</strong> ${club.contact_email}</p>
            </div>
            <button onclick="joinClub(${club.id})" class="join-club-btn">Join This Club</button>
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

// Load student timetable
async function loadStudentTimetable() {
    if (!currentUser) return;

    try {
        const response = await fetch(`/api/student/timetable/${currentUser.id}`);
        const timetable = await response.json();

        if (timetable.error) {
            console.error(timetable.error);
            return;
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

            // Time Slots matching the HTML headers
            const slots = [
                '09:00-10:00',
                '10:00-11:00',
                '11:30-12:30',
                '12:30-01:30',
                '02:15-03:15',
                '03:15-04:15'
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