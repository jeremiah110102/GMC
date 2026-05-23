// Form Elements
const loginForm = document.getElementById('loginForm');
const successMessage = document.getElementById('successMessage');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotPasswordModal = document.getElementById('forgotPasswordModal');

// Storage Manager - Handles both localStorage and fallback
const StorageManager = {
    // Try localStorage first, fallback to session/memory
    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available, using fallback storage');
            return false;
        }
    },

    setItem(key, value) {
        try {
            if (this.isLocalStorageAvailable()) {
                localStorage.setItem(key, value);
            } else {
                // Fallback to sessionStorage
                try {
                    sessionStorage.setItem(key, value);
                } catch (e) {
                    // Last resort: use in-memory storage
                    window._appStorage = window._appStorage || {};
                    window._appStorage[key] = value;
                }
            }
        } catch (error) {
            console.error('Error saving data:', error);
        }
    },

    getItem(key) {
        try {
            if (this.isLocalStorageAvailable()) {
                return localStorage.getItem(key);
            } else {
                // Try sessionStorage
                try {
                    return sessionStorage.getItem(key);
                } catch (e) {
                    // Use in-memory storage
                    return (window._appStorage || {})[key] || null;
                }
            }
        } catch (error) {
            console.error('Error retrieving data:', error);
            return null;
        }
    },

    removeItem(key) {
        try {
            if (this.isLocalStorageAvailable()) {
                localStorage.removeItem(key);
            } else {
                try {
                    sessionStorage.removeItem(key);
                } catch (e) {
                    if (window._appStorage) {
                        delete window._appStorage[key];
                    }
                }
            }
        } catch (error) {
            console.error('Error removing data:', error);
        }
    }
};

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

        // Store user info using StorageManager
        StorageManager.setItem('currentUser', JSON.stringify({
            userId: userData.userId,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            isAdmin: userData.isAdmin || false,
            membershipType: userData.membershipType
        }));

        // Handle "Remember me" checkbox
        const rememberMe = document.getElementById('rememberMe').checked;
        if (rememberMe) {
            StorageManager.setItem('rememberMe', JSON.stringify({
                email: email,
                timestamp: new Date().getTime()
            }));
        } else {
            StorageManager.removeItem('rememberMe');
        }

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

// Forgot Password Modal Functions
function openForgotPasswordModal() {
    forgotPasswordModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeForgotPasswordModal() {
    forgotPasswordModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    resetForgotPasswordSteps();
}

function resetForgotPasswordSteps() {
    document.getElementById('forgotPasswordStep1').classList.remove('hidden');
    document.getElementById('forgotPasswordStep2').classList.add('hidden');
    document.getElementById('forgotPasswordStep3').classList.add('hidden');
    document.getElementById('forgotPasswordForm').reset();
    document.getElementById('newPasswordForm').reset();
    clearErrors();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Pre-fill email if "Remember me" was checked
    const rememberMe = StorageManager.getItem('rememberMe');
    if (rememberMe) {
        try {
            const { email } = JSON.parse(rememberMe);
            document.getElementById('loginEmail').value = email;
        } catch (e) {
            console.error('Error parsing rememberMe data:', e);
        }
    }

    // Real-time validation for login form
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

    // Forgot Password Modal
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        openForgotPasswordModal();
    });

    document.getElementById('closeForgotPasswordModal').addEventListener('click', closeForgotPasswordModal);

    // Close modal when clicking outside
    document.getElementById('forgotPasswordModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeForgotPasswordModal();
        }
    });
});