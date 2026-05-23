// Form Elements
const registrationForm = document.getElementById('registrationForm');
const successMessage = document.getElementById('successMessage');

// Validation Rules
const validationRules = {
    firstName: {
        required: true,
        minLength: 2,
        pattern: /^[a-zA-Z\s'-]+$/,
        errorMessages: {
            required: 'First name is required',
            minLength: 'First name must be at least 2 characters',
            pattern: 'First name can only contain letters, spaces, hyphens, and apostrophes'
        }
    },
    lastName: {
        required: true,
        minLength: 2,
        pattern: /^[a-zA-Z\s'-]+$/,
        errorMessages: {
            required: 'Last name is required',
            minLength: 'Last name must be at least 2 characters',
            pattern: 'Last name can only contain letters, spaces, hyphens, and apostrophes'
        }
    },
    email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        errorMessages: {
            required: 'Email is required',
            pattern: 'Please enter a valid email address'
        }
    },
    password: {
        required: true,
        minLength: 6,
        pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/,
        errorMessages: {
            required: 'Password is required',
            minLength: 'Password must be at least 6 characters',
            pattern: 'Password must contain at least one letter and one number'
        }
    },
    confirmPassword: {
        required: true,
        errorMessages: {
            required: 'Please confirm your password'
        }
    },
    phone: {
        required: true,
        pattern: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
        errorMessages: {
            required: 'Phone number is required',
            pattern: 'Please enter a valid phone number'
        }
    },
    birthDate: {
        required: true,
        errorMessages: {
            required: 'Date of birth is required'
        }
    },
    address: {
        required: true,
        minLength: 5,
        errorMessages: {
            required: 'Street address is required',
            minLength: 'Address must be at least 5 characters'
        }
    },
    city: {
        required: true,
        minLength: 2,
        errorMessages: {
            required: 'City is required',
            minLength: 'City must be at least 2 characters'
        }
    },
    province: {
        required: true,
        minLength: 2,
        errorMessages: {
            required: 'Province is required',
            minLength: 'Province must be at least 2 characters'
        }
    },
    zipCode: {
        required: true,
        pattern: /^[0-9]{4,6}$/,
        errorMessages: {
            required: 'Zip code is required',
            pattern: 'Zip code must be 4-6 digits'
        }
    },
    membershipType: {
        required: true,
        errorMessages: {
            required: 'Please select a membership type'
        }
    },
    terms: {
        required: true,
        errorMessages: {
            required: 'You must agree to the terms and conditions'
        }
    }
};

// Validation Functions
function validateField(fieldName, value) {
    const rules = validationRules[fieldName];
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

function validateForm() {
    clearErrors();
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
        const field = document.getElementById(fieldName);
        let value = field?.value?.trim();

        if (field?.type === 'checkbox') {
            value = field.checked;
        }

        const error = validateField(fieldName, value);
        if (error) {
            displayError(fieldName, error);
            isValid = false;
        }
    });

    // Verify passwords match
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (password !== confirmPassword) {
        displayError('confirmPassword', 'Passwords do not match');
        isValid = false;
    }

    return isValid;
}

// Collect form data
function collectFormData() {
    const interests = Array.from(document.querySelectorAll('input[name="interests"]:checked'))
        .map(cb => cb.value);

    return {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        birthDate: document.getElementById('birthDate').value,
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        province: document.getElementById('province').value.trim(),
        zipCode: document.getElementById('zipCode').value.trim(),
        membershipType: document.getElementById('membershipType').value,
        interests: interests,
        message: document.getElementById('message').value.trim(),
        timestamp: new Date().toISOString(),
        registrationDate: new Date().toLocaleDateString('en-US')
    };
}

// Register function - Firestore only
async function handleRegister(email, password, userData) {
    try {
        const submitBtn = registrationForm.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-text">Creating Account...</span>';

        // Check if email already exists
        const existingUser = await db.collection('users').where('email', '==', email).get();
        
        if (!existingUser.empty) {
            displayError('email', 'This email is already registered.');
            const submitBtn = registrationForm.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Register Now</span><span class="btn-icon">→</span>';
            return;
        }

        // Generate a unique user ID
        const userId = db.collection('users').doc().id;

        // Simple password hashing (for security, use proper hashing in production)
        const hashedPassword = btoa(email + password + 'salt123');

        // Save user to Firestore
        await db.collection('users').doc(userId).set({
            userId: userId,
            email: email,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            birthDate: userData.birthDate,
            address: userData.address,
            city: userData.city,
            province: userData.province,
            zipCode: userData.zipCode,
            membershipType: userData.membershipType,
            interests: userData.interests,
            message: userData.message,
            timestamp: new Date().toISOString(),
            registrationDate: userData.registrationDate,
            createdAt: new Date()
        });

        // Also save to registrations collection for record keeping
        await db.collection('registrations').doc(userId).set({
            ...userData,
            userId: userId,
            email: email,
            timestamp: new Date().toISOString(),
            createdAt: new Date()
        });

        console.log('User registered successfully:', userId);

        // Reset form
        registrationForm.reset();
        clearErrors();

        // Show success message
        registrationForm.style.display = 'none';
        successMessage.classList.remove('hidden');

        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);

    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'An error occurred during registration. Please try again.';
        
        displayError('email', errorMessage);

        const submitBtn = registrationForm.querySelector('.submit-btn');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-text">Register Now</span><span class="btn-icon">→</span>';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Real-time validation
    Object.keys(validationRules).forEach(fieldName => {
        const field = document.getElementById(fieldName);
        
        if (field) {
            if (field.type === 'checkbox') {
                field.addEventListener('change', function() {
                    const error = validateField(fieldName, this.checked);
                    displayError(fieldName, error);
                });
            } else {
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
        }
    });

    // Form submission
    registrationForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const userData = collectFormData();

        handleRegister(email, password, userData);
    });
});