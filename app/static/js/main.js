// Global variables
let currentRole = '';

// Role selection function
function selectRole(role) {
    currentRole = role;
    showLoginModal(role);
}

// Show login modal
function showLoginModal(role) {
    const modal = document.getElementById('loginModal');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = `${role.charAt(0).toUpperCase() + role.slice(1)} Login`;
    modal.style.display = 'block';
}

// Close modal functionality
document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('loginModal');
    const closeBtn = document.querySelector('.close');
    const loginForm = document.getElementById('loginForm');

    // Close modal when clicking X
    closeBtn.onclick = function () {
        modal.style.display = 'none';
    }

    // Close modal when clicking outside
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }

    // Handle login form submission
    loginForm.onsubmit = function (e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Send login request to Flask backend
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password,
                role: currentRole
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store user data in sessionStorage (Tab specific)
                    sessionStorage.setItem('userData', JSON.stringify(data.user));

                    // Redirect based on role
                    redirectToDashboard(currentRole);
                } else {
                    alert(data.message || 'Login failed. Please check your credentials.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred during login. Please try again.');
            });
    }
});

// Redirect to appropriate dashboard
function redirectToDashboard(role) {
    switch (role) {
        case 'student':
            window.location.href = '/student-dashboard';
            break;
        case 'faculty':
            window.location.href = '/faculty-dashboard';
            break;
        case 'admin':
            window.location.href = '/admin-dashboard';
            break;
        default:
            alert('Invalid role selected');
    }
}

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function () {
    // Add hover effects to role cards
    const roleCards = document.querySelectorAll('.role-card');

    roleCards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Add floating animation to logo
    const logoIcon = document.querySelector('.logo-icon');
    setInterval(() => {
        logoIcon.style.transform = 'translateY(-5px)';
        setTimeout(() => {
            logoIcon.style.transform = 'translateY(0)';
        }, 1000);
    }, 2000);
});