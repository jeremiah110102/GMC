// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDyB0PkModKyIj8p_yS1z_Mw1FHwHYi7uI",
    authDomain: "gracemissionchruch.firebaseapp.com",
    databaseURL: "https://gracemissionchruch-default-rtdb.firebaseio.com",
    projectId: "gracemissionchruch",
    storageBucket: "gracemissionchruch.firebasestorage.app",
    messagingSenderId: "960042031781",
    appId: "1:960042031781:web:44c1097d4384926e1a0b4c",
    measurementId: "G-SCPKJW9RQL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Form Elements
const registrationForm = document.getElementById('registrationForm');
const successMessage = document.getElementById('successMessage');

// Form Validation Rules
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

    // Check required
    if (rules.required && !value) {
        return rules.errorMessages.required;
    }

    // Check minLength
    if (rules.minLength && value.length < rules.minLength) {
        return rules.errorMessages.minLength;
    }

    // Check pattern
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
            field?.parentElement?.classList.add('error');
        } else {
            errorElement.textContent = '';
            field?.parentElement?.classList.remove('error');
        }
    }
}

// Clear all error messages
function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
    document.querySelectorAll('.form-group').forEach(el => {
        el.classList.remove('error');
    });
}

// Validate entire form
function validateForm() {
    clearErrors();
    let isValid = true;

    // Validate individual fields
    Object.keys(validationRules).forEach(fieldName => {
        const field = document.getElementById(fieldName);
        let value = field?.value?.trim();

        // Special handling for checkboxes
        if (field?.type === 'checkbox') {
            value = field.checked;
        }

        const error = validateField(fieldName, value);
        if (error) {
            displayError(fieldName, error);
            isValid = false;
        }
    });

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

// Save to Firestore
async function saveToFirestore(data) {
    try {
        // Show loading state
        const submitBtn = registrationForm.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-text">Saving...</span>';

        // Add document to Firestore
        const docRef = await db.collection('registrations').add(data);
        
        console.log('Document written with ID: ', docRef.id);

        // Reset form
        registrationForm.reset();
        clearErrors();

        // Show success message
        registrationForm.style.display = 'none';
        successMessage.classList.remove('hidden');

        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;

        // Auto-reset after 5 seconds (optional)
        setTimeout(() => {
            successMessage.classList.add('hidden');
            registrationForm.style.display = 'block';
        }, 5000);

    } catch (error) {
        console.error('Error adding document: ', error);
        alert('Error saving registration. Please try again.');
        
        // Re-enable button
        const submitBtn = registrationForm.querySelector('.submit-btn');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-text">Register Now</span><span class="btn-icon">→</span>';
    }
}

// Real-time validation on input
document.addEventListener('DOMContentLoaded', function() {
    // Add real-time validation to fields
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
                    // Clear error as user types
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
    registrationForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            console.log('Form validation failed');
            return;
        }

        // Collect data
        const formData = collectFormData();
        console.log('Form data to save:', formData);

        // Save to Firestore
        await saveToFirestore(formData);
    });
});