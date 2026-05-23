// Form Elements
const loginForm = document.getElementById('loginForm');
const successMessage = document.getElementById('successMessage');

// Validation Rules
const loginValidationRules = {
    loginEmail: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        errorMessages: {
            required: 'Email is required',
            pattern: 'Please enter a valid email address'
        }
    },
    loginPassword: {
        required: true,
        minLength: 6,
        errorMessages: {
            required: 'Password is required',
            minLength: 'Password must be at least 6 characters'
        }
    }
};

// Validation Functions
function validateField(fieldName, value) {
    const rules = loginValidationRules[fieldName];
    if (!rules) return null;

    if (rules.required && !value) {
        return rules.errorMessages.required;
    }

    if (rules.minLength && value.length < rules.minLength) {
        return rules.errorMessages.minLength;
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
        return rules.errorMessages.pattern;
    }

    return null;
}

function displayError(fieldName, errorMessage) {
    const field = document.getElementById(fieldName);
    const errorElement = field?.parentElement?.querySelector('.error-message');
    
    if (errorElement) {
        if (errorMessage) {
            errorElement.textContent = errorMessage;
        } else {
            errorElement.textContent = '';
        }
    }
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
}

function validateLoginForm() {
    clearErrors();
    let isValid = true;

    Object.keys(loginValidationRules).forEach(fieldName => {
        const field = document.getElementById(fieldName);
        const value = field?.value?.trim();
        const error = validateField(fieldName, value);
        if (error) {
            displayError(fieldName, error);
            isValid = false;
        }
    });

    return isValid;
}

// Sign In Function - Firestore only
async function handleLogin(email, password) {
    try {
        const submitBtn = loginForm.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-text">Signing In...</span>';

        // Find user in Firestore
        const userSnapshot = await db.collection('users').where('email', '==', email).get();
        
        if (userSnapshot.empty) {
            displayError('loginEmail', 'No account found with this email.');
            const submitBtn = loginForm.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Sign In</span><span class="btn-icon">→</span>';
            return;
        }

        const userData = userSnapshot.docs[0].data();
        const hashedPassword = btoa(email + password + 'salt123');

        // Verify password
        if (userData.password !== hashedPassword) {
            displayError('loginPassword', 'Incorrect password.');
            const submitBtn = loginForm.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Sign In</span><span class="btn-icon">→</span>';
            return;
        }

        console.log('User logged in:', userData.email, 'Is Admin:', userData.isAdmin);

        // Store user info in localStorage for session management
        localStorage.setItem('currentUser', JSON.stringify({
            userId: userData.userId,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            isAdmin: userData.isAdmin || false,
            membershipType: userData.membershipType
        }));

        // Show success message
        loginForm.style.display = 'none';
        successMessage.classList.remove('hidden');

        // Redirect based on user role
        setTimeout(() => {
            if (userData.isAdmin) {
                // Admin goes to admin dashboard
                window.location.href = 'admin-dashboard.html';
            } else {
                // Regular users go to member landing page
                window.location.href = 'member-landing.html';
            }
        }, 2000);

    } catch (error) {
        console.error('Login error:', error);
        displayError('loginEmail', 'An error occurred while signing in. Please try again.');
        
        const submitBtn = loginForm.querySelector('.submit-btn');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-text">Sign In</span><span class="btn-icon">→</span>';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Real-time validation
    Object.keys(loginValidationRules).forEach(fieldName => {
        const field = document.getElementById(fieldName);
        
        if (field) {
            field.addEventListener('blur', function() {
                const error = validateField(fieldName, this.value.trim());
                displayError(fieldName, error);
            });

            field.addEventListener('input', function() {
                const errorElement = this.parentElement?.querySelector('.error-message');
                if (errorElement && errorElement.textContent) {
                    const error = validateField(fieldName, this.value.trim());
                    displayError(fieldName, error);
                }
            });
        }
    });

    // Form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!validateLoginForm()) {
            return;
        }

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        handleLogin(email, password);
    });
});