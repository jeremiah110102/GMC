// Storage Manager - Handles localStorage, sessionStorage, and in-memory fallback
const StorageManager = {
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
                try {
                    sessionStorage.setItem(key, value);
                } catch (e) {
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
                try {
                    return sessionStorage.getItem(key);
                } catch (e) {
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

// ===== REAL-TIME NOTIFICATION SYSTEM =====
class RealtimeNotificationManager {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 3;
    }

    show(title, message, type = 'info', duration = 5000) {
        const container = document.getElementById('notificationContainer') || this.createContainer();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = {
            'success': '✓',
            'info': 'ℹ',
            'warning': '⚠'
        }[type] || 'ℹ';

        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="realtimeNotificationManager.closeNotification(this)">×</button>
        `;

        if (container.firstChild) {
            container.insertBefore(notification, container.firstChild);
        } else {
            container.appendChild(notification);
        }

        this.notifications.push(notification);

        if (this.notifications.length > this.maxNotifications) {
            const oldest = this.notifications.shift();
            if (oldest.parentElement) {
                oldest.classList.add('fade-out');
                setTimeout(() => oldest.remove(), 300);
            }
        }

        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    this.closeNotification(notification);
                }
            }, duration);
        }

        return notification;
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    closeNotification(element) {
        const notif = element instanceof HTMLElement ? element : element.parentElement;
        if (!notif || !notif.parentElement) return;
        
        notif.classList.add('fade-out');
        setTimeout(() => {
            if (notif.parentElement) {
                notif.remove();
            }
            this.notifications = this.notifications.filter(n => n !== notif);
        }, 300);
    }
}

let realtimeNotificationManager;
const hasNumber = /\d/;

// ===== CONTENT MODERATION SYSTEM =====
const ContentModerator = {
    bannedWords: [
    // =========================
  // Violence / Harm / Threats
  // =========================
  'hate', 'kill', 'killing', 'suicide', 'selfharm', 'self-harm',
  'abuse', 'violence', 'violent', 'harm', 'hurting', 'death',
  'dead', 'die', 'dying',
  'threat', 'threaten', 'attack', 'attacking',
  'rape', 'raped', 'raping',
  'assault', 'murder', 'murdered',
  'terrorist', 'terrorism',
  'bomb', 'explosive', 'explosion',
  'gun', 'firearm', 'shoot', 'shooting',
  'stab', 'stabbing',
  'patay', 'saksak', 'baril', 'patayin', 'mamatay', 'pumatay',
  'bugbog', 'away', 'suntok',

  // =========================
  // Hate Speech / Discrimination
  // =========================
  'racist', 'racism', 'discrimination',
  'slur', 'homophobic', 'sexist',
  'nigger', 'chink', 'spic', 'fag', 'retard',

  'bobo', 'tanga', 'ulol', 'gago', 'inutil', 'tarantado',
  'lintik', 'hayop', 'demonyo', 'hayup',

  // =========================
  // Sexual / Explicit Content
  // =========================
  'explicit', 'porn', 'pornography',
  'sex', 'sexual', 'nude', 'nudity',
  'hubad', 'kantot', 'kantutan',
  'jakol', 'bayag', 'titi', 'pepe', 'puke', 'burat',
  'masturbate', 'masturbation',

  // =========================
  // English Profanity
  // =========================
  'fuck', 'fucked', 'fucking',
  'shit', 'bullshit', 'shitty',
  'damn', 'hell',
  'bitch', 'bitches',
  'asshole', 'a-hole',
  'motherfucker', 'mf',
  'bastard',
  'dick', 'cock',
  'pussy',
  'slut', 'whore',
  'crap',

  // =========================
  // Tagalog / Filipino Profanity
  // =========================
  'putangina', 'putang ina', 'puta', 'putaena', 'pota', 'potaena',
  'gagi', 'gago',
  'leche', 'bwisit',
  'pakyu', 'punyeta',
  'hindot', 'kantutan',
  'ulol',

  // =========================
  // Spam / Scam / Fraud / Hack
  // =========================
  'scam', 'fraud', 'fake',
  'spam', 'spammer',
  'hack', 'hacker', 'hacking',
  'phishing',
  'nakaw', 'steal', 'stolen',
  'loko', 'manloloko',
  'estafa',

  // =========================
  // Suspicious Links / Contact Leakage (optional but useful)
  // =========================
  'http://', 'https://', 'www.',
  '.com', '.net', '.org',
  '@gmail', '@yahoo', '@hotmail',
  //number 
  hasNumber
],

    // Specific strict filters (any match = auto-reject)
    strictFilters: [
    // =========================
  // Violence / Harm / Threats
  // =========================
  'hate', 'kill', 'killing', 'suicide', 'selfharm', 'self-harm',
  'abuse', 'violence', 'violent', 'harm', 'hurting', 'death',
  'dead', 'die', 'dying',
  'threat', 'threaten', 'attack', 'attacking',
  'rape', 'raped', 'raping',
  'assault', 'murder', 'murdered',
  'terrorist', 'terrorism',
  'bomb', 'explosive', 'explosion',
  'gun', 'firearm', 'shoot', 'shooting',
  'stab', 'stabbing',
  'patay', 'saksak', 'baril', 'patayin', 'mamatay', 'pumatay',
  'bugbog', 'away', 'suntok',

  // =========================
  // Hate Speech / Discrimination
  // =========================
  'racist', 'racism', 'discrimination',
  'slur', 'homophobic', 'sexist',
  'nigger', 'chink', 'spic', 'fag', 'retard',

  'bobo', 'tanga', 'ulol', 'gago', 'inutil', 'tarantado',
  'lintik', 'hayop', 'demonyo', 'hayup',

  // =========================
  // Sexual / Explicit Content
  // =========================
  'explicit', 'porn', 'pornography',
  'sex', 'sexual', 'nude', 'nudity',
  'hubad', 'kantot', 'kantutan',
  'jakol', 'bayag', 'titi', 'pepe', 'puke', 'burat',
  'masturbate', 'masturbation',

  // =========================
  // English Profanity
  // =========================
  'fuck', 'fucked', 'fucking',
  'shit', 'bullshit', 'shitty',
  'damn', 'hell',
  'bitch', 'bitches',
  'asshole', 'a-hole',
  'motherfucker', 'mf',
  'bastard',
  'dick', 'cock',
  'pussy',
  'slut', 'whore',
  'crap',

  // =========================
  // Tagalog / Filipino Profanity
  // =========================
  'putangina', 'putang ina', 'puta', 'putaena', 'pota', 'potaena',
  'gagi', 'gago',
  'leche', 'bwisit',
  'pakyu', 'punyeta',
  'hindot', 'kantutan',
  'ulol',

  // =========================
  // Spam / Scam / Fraud / Hack
  // =========================
  'scam', 'fraud', 'fake',
  'spam', 'spammer',
  'hack', 'hacker', 'hacking',
  'phishing',
  'nakaw', 'steal', 'stolen',
  'loko', 'manloloko',
  'estafa',

  // =========================
  // Suspicious Links / Contact Leakage (optional but useful)
  // =========================
  'http://', 'https://', 'www.',
  '.com', '.net', '.org',
  '@gmail', '@yahoo', '@hotmail',
  //number
  hasNumber
],

    suspiciousPatterns: [
        /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g,
        /([\w.-]+@[\w.-]+\.\w+)/g,
        /(http|https):\/\//g,
        /\$\d+/g,
    ],

    validateContent(title, message) {
        const fullText = (title + ' ' + message).toLowerCase();
        const titleLower = title.toLowerCase();
        const messageLower = message.toLowerCase();
        
        // ===== STRICT FILTER CHECK (Most Important) =====
        // Check if title contains "fuck" - NOT APPROVED
        if (titleLower.includes('fuck')) {
            return {
                shouldApprove: false,
                reason: `Title contains inappropriate language`,
                requiresReview: true
            };
        }
        
        // Check if message contains "fuck you" - NOT APPROVED
        if (messageLower.includes('fuck you')) {
            return {
                shouldApprove: false,
                reason: `Contains inappropriate language`,
                requiresReview: true
            };
        }
        
        // Check if message contains just "fuck" - NOT APPROVED
        if (messageLower.includes('fuck')) {
            return {
                shouldApprove: false,
                reason: `Contains inappropriate language`,
                requiresReview: true
            };
        }

        // ===== STANDARD BANNED WORDS CHECK =====
        for (let word of this.bannedWords) {
            if (fullText.includes(word)) {
                return {
                    shouldApprove: false,
                    reason: `Contains potentially harmful content: "${word}"`,
                    requiresReview: true
                };
            }
        }

        let suspiciousCount = 0;
        for (let pattern of this.suspiciousPatterns) {
            const matches = fullText.match(pattern);
            if (matches && matches.length > 0) {
                suspiciousCount += matches.length;
            }
        }

        if (suspiciousCount > 2) {
            return {
                shouldApprove: false,
                reason: `Contains multiple contact details or links (${suspiciousCount} found)`,
                requiresReview: true
            };
        }

        const capsRatio = (fullText.match(/[A-Z]/g) || []).length / fullText.length;
        if (capsRatio > 0.5 && fullText.length > 20) {
            return {
                shouldApprove: false,
                reason: 'Excessive capitalization detected',
                requiresReview: true
            };
        }

        const punctCount = (fullText.match(/[!?]{2,}/g) || []).length;
        if (punctCount > 3) {
            return {
                shouldApprove: false,
                reason: 'Excessive punctuation detected',
                requiresReview: true
            };
        }

        if (message.trim().length < 10) {
            return {
                shouldApprove: false,
                reason: 'Prayer request too short',
                requiresReview: true
            };
        }

        if (message.trim().length > 5000) {
            return {
                shouldApprove: false,
                reason: 'Prayer request too long',
                requiresReview: true
            };
        }

        return {
            shouldApprove: true,
            reason: 'Auto-approved: Clean content',
            requiresReview: false
        };
    }
};

let allMembers = [];
let selectedMembers = [];
let allAnnouncements = [];
let allLinks = [];
let allPrayerRequests = [];
let currentEditingMemberEmail = null;
let allRegistrations = [];
let prayerRequestListener = null;

// Check if user is admin on page load
document.addEventListener('DOMContentLoaded', async function() {
    realtimeNotificationManager = new RealtimeNotificationManager();
    
    const currentUser = StorageManager.getItem('currentUser');
    
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const userData = JSON.parse(currentUser);
        const isAdmin = userData.isAdmin === true;
        
        console.log('User:', userData.email, 'Is Admin:', isAdmin);

        if (!isAdmin) {
            window.location.href = 'member-landing.html';
            return;
        }

        currentAdminEmail = userData.email;
        console.log('Admin email:', currentAdminEmail);

        document.getElementById('userName').textContent = userData.firstName + ' ' + userData.lastName;
        const initials = (userData.firstName.charAt(0) + userData.lastName.charAt(0)).toUpperCase();
        document.getElementById('userAvatar').textContent = initials;

        await loadStatistics();
        await loadMembers();
        await loadRegistrations();
        await loadAnnouncements();
        await loadPrayerRequests();
        await loadLinks();

        // Setup real-time listener for prayer requests
        setupRealtimePrayerListener();

        document.getElementById('editMemberModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditModal();
            }
        });
    } catch (error) {
        console.error('Error loading user data:', error);
        StorageManager.removeItem('currentUser');
        window.location.href = 'index.html';
    }
});

// ===== REAL-TIME LISTENER FOR PRAYERS =====
function setupRealtimePrayerListener() {
    // Remove old listener if exists
    if (prayerRequestListener) {
        prayerRequestListener();
    }

    // Setup real-time listener
    prayerRequestListener = db.collection('prayerRequests')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            console.log('📥 Prayer requests updated in real-time');
            
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    console.log('🆕 New prayer request:', data.title);
                    
                    // Show notification for new prayer
                    const title = data.title;
                    const submitter = data.isAnonymous ? 'Anonymous' : data.submitterName;
                    realtimeNotificationManager.show(
                        '🙏 New Prayer Request',
                        `"${title}" by ${submitter}`,
                        'info',
                        6000
                    );
                } else if (change.type === 'modified') {
                    const data = change.doc.data();
                    console.log('✏️ Prayer request updated:', data.title);
                    
                    // Show notification for status change
                    if (data.status === 'approved') {
                        realtimeNotificationManager.show(
                            '✓ Prayer Approved',
                            `"${data.title}" is now approved`,
                            'success',
                            5000
                        );
                    } else if (data.status === 'declined') {
                        realtimeNotificationManager.show(
                            '✗ Prayer Declined',
                            `"${data.title}" has been declined`,
                            'warning',
                            5000
                        );
                    }
                } else if (change.type === 'removed') {
                    const data = change.doc.data();
                    console.log('🗑️ Prayer request deleted:', data.title);
                    
                    realtimeNotificationManager.show(
                        '🗑️ Prayer Deleted',
                        `"${data.title}" has been removed`,
                        'info',
                        4000
                    );
                }
            });

            // Reload prayer requests
            loadPrayerRequests();
        }, (error) => {
            console.error('Error setting up real-time listener:', error);
        });
}

// Show/Hide Sections
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    event.target.closest('a').classList.add('active');

    const sectionTitles = {
        'dashboard': 'Dashboard Overview',
        'members': 'Members Management',
        'announcements': 'Announcements',
        'prayerRequests': 'Prayer Requests',
        'links': 'Manage Links',
        'registrations': 'New Registrations'
    };
    document.getElementById('currentSection').textContent = sectionTitles[sectionId] || 'Dashboard';

    if (sectionId === 'prayerRequests') {
        loadPrayerRequests();
    }
}

// Load Statistics
async function loadStatistics() {
    try {
        const usersSnapshot = await db.collection('users').get();
        document.getElementById('totalMembers').textContent = usersSnapshot.size - 1;

        const activeMembersSnapshot = await db.collection('users')
            .where('membershipType', '==', 'active').get();
        document.getElementById('activeMembers').textContent = activeMembersSnapshot.size;

        const registrationsSnapshot = await db.collection('registrations').get();
        document.getElementById('totalRegistrations').textContent = registrationsSnapshot.size;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load Members
async function loadMembers() {
    try {
        const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        allMembers = [];
        const tableBody = document.getElementById('membersTableBody');
        tableBody.innerHTML = '';

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.email !== 'admin@gracemission.com') {
                allMembers.push(data);
                const isAdmin = data.isAdmin ? '<span class="badge admin">ADMIN</span>' : '';
                const row = `
                    <tr>
                        <td><input type="checkbox" class="memberCheckbox" value="${data.email}"></td>
                        <td>${data.firstName} ${data.lastName}</td>
                        <td>${data.email}</td>
                        <td>${data.city || 'N/A'}</td>
                        <td>${data.membershipType}</td>
                        <td>${isAdmin}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            }
        });

        if (allMembers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No members found</td></tr>';
        }

        loadMemberCheckboxes();
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

// Load Registrations with Edit Button
async function loadRegistrations() {
    try {
        const registrationsSnapshot = await db.collection('registrations').orderBy('createdAt', 'desc').get();
        allRegistrations = [];
        const tableBody = document.getElementById('registrationsTableBody');
        tableBody.innerHTML = '';

        registrationsSnapshot.forEach(doc => {
            const data = doc.data();
            allRegistrations.push({ id: doc.id, ...data });
            const dateStr = new Date(data.createdAt?.toDate?.() || data.timestamp || new Date()).toLocaleDateString();
            const row = `
                <tr>
                    <td>${data.firstName} ${data.lastName}</td>
                    <td>${data.email}</td>
                    <td>${data.phone}</td>
                    <td>${data.city}</td>
                    <td>${data.membershipType}</td>
                    <td>${dateStr}</td>
                    <td>
                        <button class="action-btn" onclick="openEditModal('${data.email}')">Edit</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        if (registrationsSnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No registrations found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading registrations:', error);
    }
}

// Open Edit Modal
async function openEditModal(email) {
    try {
        const userSnapshot = await db.collection('users').where('email', '==', email).get();
        
        if (userSnapshot.empty) {
            alert('User not found');
            return;
        }

        const userData = userSnapshot.docs[0].data();
        currentEditingMemberEmail = email;

        document.getElementById('editFirstName').value = userData.firstName || '';
        document.getElementById('editLastName').value = userData.lastName || '';
        document.getElementById('editEmail').value = userData.email || '';
        document.getElementById('editPhone').value = userData.phone || '';
        document.getElementById('editCity').value = userData.city || '';
        document.getElementById('editMembershipType').value = userData.membershipType || 'free';
        document.getElementById('editPassword').value = '';
        document.getElementById('editConfirmPassword').value = '';

        document.querySelectorAll('#editMemberModal .error-message').forEach(el => el.textContent = '');

        document.getElementById('editMemberModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error opening edit modal:', error);
        alert('Error loading member data: ' + error.message);
    }
}

// Close Edit Modal
function closeEditModal() {
    document.getElementById('editMemberModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.getElementById('editMemberForm').reset();
    currentEditingMemberEmail = null;
    document.querySelectorAll('#editMemberModal .error-message').forEach(el => el.textContent = '');
}

// Validate Edit Form
function validateEditForm() {
    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const city = document.getElementById('editCity').value.trim();
    const membershipType = document.getElementById('editMembershipType').value;
    const password = document.getElementById('editPassword').value;
    const confirmPassword = document.getElementById('editConfirmPassword').value;

    let isValid = true;
    const errors = {
        editFirstName: '',
        editLastName: '',
        editEmail: '',
        editPhone: '',
        editCity: '',
        editMembershipType: '',
        editPassword: '',
        editConfirmPassword: ''
    };

    if (!firstName) errors.editFirstName = 'First name is required';
    if (!lastName) errors.editLastName = 'Last name is required';
    if (!email) {
        errors.editEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.editEmail = 'Invalid email format';
    }
    if (!phone) errors.editPhone = 'Phone is required';
    if (!city) errors.editCity = 'City is required';
    if (!membershipType) errors.editMembershipType = 'Membership type is required';

    if (password || confirmPassword) {
        if (password.length < 6) {
            errors.editPassword = 'Password must be at least 6 characters';
        }
        if (password !== confirmPassword) {
            errors.editConfirmPassword = 'Passwords do not match';
        }
    }

    Object.keys(errors).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        const errorElement = field.parentElement.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = errors[fieldId];
        }
        if (errors[fieldId]) isValid = false;
    });

    return isValid;
}

// Save Edited Member
async function saveEditedMember(event) {
    event.preventDefault();

    if (!validateEditForm()) {
        return;
    }

    const submitBtn = event.target.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const firstName = document.getElementById('editFirstName').value.trim();
        const lastName = document.getElementById('editLastName').value.trim();
        const newEmail = document.getElementById('editEmail').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        const city = document.getElementById('editCity').value.trim();
        const membershipType = document.getElementById('editMembershipType').value;
        const password = document.getElementById('editPassword').value;

        if (newEmail !== currentEditingMemberEmail) {
            const emailSnapshot = await db.collection('users').where('email', '==', newEmail).get();
            if (!emailSnapshot.empty) {
                document.getElementById('editEmail').parentElement.querySelector('.error-message').textContent = 'This email is already in use';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Changes';
                return;
            }
        }

        const userSnapshot = await db.collection('users').where('email', '==', currentEditingMemberEmail).get();
        
        if (userSnapshot.empty) {
            alert('User not found');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
            return;
        }

        const userRef = userSnapshot.docs[0].ref;
        const updateData = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            city: city,
            membershipType: membershipType
        };

        if (newEmail !== currentEditingMemberEmail) {
            updateData.email = newEmail;
        }

        if (password) {
            const hashedPassword = btoa(newEmail + password + 'salt123');
            updateData.password = hashedPassword;
        }

        updateData.updatedAt = new Date();

        await userRef.update(updateData);

        if (newEmail !== currentEditingMemberEmail) {
            const registrationsSnapshot = await db.collection('registrations').where('email', '==', currentEditingMemberEmail).get();
            for (let doc of registrationsSnapshot.docs) {
                await doc.ref.update({
                    email: newEmail
                });
            }
        }

        showSuccessMessage('✓ Member information updated successfully!');
        closeEditModal();
        await loadRegistrations();
        await loadMembers();
        await loadStatistics();

    } catch (error) {
        console.error('Error saving member:', error);
        alert('Error saving changes: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
}

// Load Announcements
async function loadAnnouncements() {
    try {
        const announcementsSnapshot = await db.collection('announcements').orderBy('createdAt', 'desc').get();
        allAnnouncements = [];
        const tableBody = document.getElementById('announcementsTableBody');
        tableBody.innerHTML = '';

        announcementsSnapshot.forEach(doc => {
            const data = doc.data();
            allAnnouncements.push(data);
            const row = `
                <tr>
                    <td><strong>${data.title}</strong></td>
                    <td>${data.sendTo}</td>
                    <td>${new Date(data.createdAt?.toDate?.() || new Date()).toLocaleDateString()}</td>
                    <td><button class="action-btn danger" onclick="deleteAnnouncement('${doc.id}')">Delete</button></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        if (announcementsSnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No announcements saved yet</td></tr>';
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

// Load Prayer Requests with Smart Status (Real-time)
async function loadPrayerRequests() {
    try {
        const prayerSnapshot = await db.collection('prayerRequests').orderBy('createdAt', 'desc').get();
        allPrayerRequests = [];
        const prayerContainer = document.getElementById('prayerRequestsContainer');
        prayerContainer.innerHTML = '';

        if (prayerSnapshot.empty) {
            prayerContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📿</div>
                    <p>No prayer requests yet</p>
                </div>
            `;
            return;
        }

        const pendingPrayers = [];
        const approvedPrayers = [];
        const declinedPrayers = [];

        prayerSnapshot.forEach(doc => {
            const data = doc.data();
            
            if (!data.status || data.status === 'pending') {
                const validation = ContentModerator.validateContent(data.title, data.message);
                
                if (validation.shouldApprove) {
                    approveAndStore(doc.id, data, true);
                    approvedPrayers.push({ id: doc.id, ...data, status: 'approved', autoApproved: true });
                } else {
                    pendingPrayers.push({ id: doc.id, ...data, validation });
                }
            } else if (data.status === 'approved') {
                approvedPrayers.push({ id: doc.id, ...data });
            } else if (data.status === 'declined') {
                declinedPrayers.push({ id: doc.id, ...data });
            }
        });

        // Display pending prayers
        if (pendingPrayers.length > 0) {
            const pendingTitle = document.createElement('h3');
            pendingTitle.style.cssText = `
                color: var(--text-dark);
                margin-top: 20px;
                margin-bottom: 15px;
                border-bottom: 2px solid var(--secondary-navy);
                padding-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            pendingTitle.innerHTML = `
                <span>⏳ Pending Review (${pendingPrayers.length}) - Requires Manual Approval</span>
                <span style="background: #fbbf24; color: #78350f; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">🔴 LIVE</span>
            `;
            prayerContainer.appendChild(pendingTitle);

            pendingPrayers.forEach((prayer, index) => {
                const submitterName = prayer.isAnonymous ? '🔒 Anonymous' : `👤 ${prayer.submitterName}`;
                
                const prayerCard = document.createElement('div');
                prayerCard.className = 'prayer-request-card';
                prayerCard.style.animationDelay = `${index * 0.1}s`;
                prayerCard.innerHTML = `
                    <div class="prayer-request-header">
                        <div class="prayer-title">${prayer.title}</div>
                        <div class="prayer-status-badge">
                            <span class="badge pending">⏳ Pending Review</span>
                            <span class="review-reason" style="
                                background: #fef3c7;
                                color: #92400e;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-size: 11px;
                                margin-left: 8px;
                            ">${prayer.validation.reason}</span>
                        </div>
                    </div>
                    <div class="prayer-content">${prayer.message}</div>
                    <div class="prayer-meta">
                        ${submitterName} • 📅 ${new Date(prayer.createdAt?.toDate?.() || new Date()).toLocaleDateString()}
                    </div>
                    <div class="prayer-actions">
                        <button class="action-btn success" onclick="approvePrayerRequest('${prayer.id}')">✓ Approve</button>
                        <button class="action-btn warning" onclick="declinePrayerRequest('${prayer.id}')">✗ Decline</button>
                        <button class="action-btn danger" onclick="deletePrayerRequest('${prayer.id}')">🗑️ Delete</button>
                    </div>
                </div>
                `;
                prayerContainer.appendChild(prayerCard);
            });
        }

        // Display approved prayers
        if (approvedPrayers.length > 0) {
            const approvedTitle = document.createElement('h3');
            approvedTitle.style.cssText = `
                color: #065f46;
                margin-top: 30px;
                margin-bottom: 15px;
                border-bottom: 2px solid var(--success-green);
                padding-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            const autoCount = approvedPrayers.filter(p => p.autoApproved).length;
            const manualCount = approvedPrayers.filter(p => !p.autoApproved).length;
            approvedTitle.innerHTML = `
                <span>✓ Approved (${approvedPrayers.length}) ${autoCount > 0 ? `- ${autoCount} auto-approved, ${manualCount} manual` : ''}</span>
                <span style="background: #d1f5f0; color: #047857; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">🟢 LIVE</span>
            `;
            prayerContainer.appendChild(approvedTitle);

            approvedPrayers.forEach((prayer, index) => {
                const submitterName = prayer.isAnonymous ? '🔒 Anonymous' : `👤 ${prayer.submitterName}`;
                const autoApprovedBadge = prayer.autoApproved 
                    ? `<span class="auto-approved-badge" style="
                        background: #d1f5f0;
                        color: #047857;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 11px;
                        margin-left: 8px;
                    ">🤖 Auto-Approved</span>`
                    : '';
                
                const prayerCard = document.createElement('div');
                prayerCard.className = 'prayer-request-card approved';
                prayerCard.style.animationDelay = `${index * 0.1}s`;
                prayerCard.innerHTML = `
                    <div class="prayer-request-header">
                        <div class="prayer-title">${prayer.title}</div>
                        <div class="prayer-status-badge">
                            <span class="badge approved">✓ Approved</span>
                            ${autoApprovedBadge}
                        </div>
                    </div>
                    <div class="prayer-content">${prayer.message}</div>
                    <div class="prayer-meta">
                        ${submitterName} • 📅 ${new Date(prayer.createdAt?.toDate?.() || new Date()).toLocaleDateString()}
                    </div>
                    <div class="prayer-actions">
                        <button class="action-btn" disabled style="background: #d1d5db; color: #6b7280; cursor: not-allowed;">✓ Already Approved</button>
                        <button class="action-btn warning" onclick="declinePrayerRequest('${prayer.id}')">✗ Decline</button>
                        <button class="action-btn danger" onclick="deletePrayerRequest('${prayer.id}')">🗑️ Delete</button>
                    </div>
                </div>
                `;
                prayerContainer.appendChild(prayerCard);
            });
        }

        // Display declined prayers
        if (declinedPrayers.length > 0) {
            const declinedTitle = document.createElement('h3');
            declinedTitle.style.cssText = `
                color: #7f1d1d;
                margin-top: 30px;
                margin-bottom: 15px;
                border-bottom: 2px solid #ef4444;
                padding-bottom: 10px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            declinedTitle.innerHTML = `
                <span>✗ Declined (${declinedPrayers.length}) - Click to expand</span>
                <span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">🔴 LIVE</span>
            `;
            
            const declinedContainer = document.createElement('div');
            declinedContainer.style.display = 'none';
            
            declinedPrayers.forEach((prayer, index) => {
                const submitterName = prayer.isAnonymous ? '🔒 Anonymous' : `👤 ${prayer.submitterName}`;
                
                const prayerCard = document.createElement('div');
                prayerCard.className = 'prayer-request-card';
                prayerCard.style.animationDelay = `${index * 0.1}s`;
                prayerCard.innerHTML = `
                    <div class="prayer-request-header">
                        <div class="prayer-title">${prayer.title}</div>
                        <span class="badge declined">✗ Declined</span>
                    </div>
                    <div class="prayer-content">${prayer.message}</div>
                    <div class="prayer-meta">
                        ${submitterName} • 📅 ${new Date(prayer.createdAt?.toDate?.() || new Date()).toLocaleDateString()}
                        ${prayer.declineReason ? `<br>Reason: ${prayer.declineReason}` : ''}
                    </div>
                    <div class="prayer-actions">
                        <button class="action-btn success" onclick="approvePrayerRequest('${prayer.id}')">↩️ Re-approve</button>
                        <button class="action-btn danger" onclick="deletePrayerRequest('${prayer.id}')">🗑️ Delete</button>
                    </div>
                </div>
                `;
                declinedContainer.appendChild(prayerCard);
            });

            declinedTitle.addEventListener('click', () => {
                const isHidden = declinedContainer.style.display === 'none';
                declinedContainer.style.display = isHidden ? 'block' : 'none';
                declinedTitle.innerHTML = isHidden 
                    ? `
                        <span>✗ Declined (${declinedPrayers.length}) - Click to collapse</span>
                        <span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">🔴 LIVE</span>
                    `
                    : `
                        <span>✗ Declined (${declinedPrayers.length}) - Click to expand</span>
                        <span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">🔴 LIVE</span>
                    `;
            });

            prayerContainer.appendChild(declinedTitle);
            prayerContainer.appendChild(declinedContainer);
        }

    } catch (error) {
        console.error('Error loading prayer requests:', error);
        document.getElementById('prayerRequestsContainer').innerHTML = '<p style="color: red;">Error loading prayer requests</p>';
    }
}

// Auto-approve and store approval status
async function approveAndStore(id, data, isAutoApproved = false) {
    try {
        if (data.status !== 'approved') {
            await db.collection('prayerRequests').doc(id).update({
                status: 'approved',
                approvedAt: new Date(),
                approvedBy: isAutoApproved ? 'SYSTEM' : currentAdminEmail,
                isAutoApproved: isAutoApproved
            });
        }
    } catch (error) {
        console.error('Error in approveAndStore:', error);
    }
}

// Approve Prayer Request (Manual)
async function approvePrayerRequest(id) {
    try {
        await db.collection('prayerRequests').doc(id).update({
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: currentAdminEmail,
            isAutoApproved: false
        });
        // Real-time listener will handle the update
    } catch (error) {
        console.error('Error approving prayer request:', error);
        alert('Error approving prayer request: ' + error.message);
    }
}

// Decline Prayer Request
async function declinePrayerRequest(id) {
    const reason = prompt('Enter reason for declining (optional):');
    if (reason === null) return;

    try {
        await db.collection('prayerRequests').doc(id).update({
            status: 'declined',
            declinedAt: new Date(),
            declinedBy: currentAdminEmail,
            declineReason: reason || ''
        });
        // Real-time listener will handle the update
    } catch (error) {
        console.error('Error declining prayer request:', error);
        alert('Error declining prayer request: ' + error.message);
    }
}

// Delete Prayer Request
async function deletePrayerRequest(id) {
    if (!confirm('Delete this prayer request? This cannot be undone.')) return;

    try {
        await db.collection('prayerRequests').doc(id).delete();
        // Real-time listener will handle the update
    } catch (error) {
        console.error('Error deleting prayer request:', error);
        alert('Error deleting prayer request: ' + error.message);
    }
}

// Show Success Message
function showSuccessMessage(message) {
    const msg = document.createElement('div');
    msg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d1fae5;
        border-left: 4px solid var(--success-green);
        color: #065f46;
        padding: 15px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: 600;
    `;
    msg.textContent = message;
    document.body.appendChild(msg);
    
    setTimeout(() => {
        msg.remove();
    }, 3000);
}

// Load Links
async function loadLinks() {
    try {
        const linksSnapshot = await db.collection('links').orderBy('createdAt', 'desc').get();
        allLinks = [];
        const linksContainer = document.getElementById('linksContainer');
        linksContainer.innerHTML = '';

        if (linksSnapshot.empty) {
            linksContainer.innerHTML = '<p style="text-align: center; color: var(--text-light);">No links saved yet</p>';
            return;
        }

        linksSnapshot.forEach(doc => {
            const data = doc.data();
            allLinks.push({ id: doc.id, ...data });
            
            const linkCard = `
                <div class="link-card">
                    <div class="link-info">
                        <div class="link-title">${data.title}</div>
                        <div class="link-url">${data.url}</div>
                        ${data.description ? `<div style="color: var(--text-light); font-size: 12px; margin-top: 5px;">${data.description}</div>` : ''}
                    </div>
                    <div class="link-actions">
                        <button class="link-copy-btn" onclick="copyToClipboard('${data.url}')">Copy Link</button>
                        <button class="link-delete-btn" onclick="deleteLink('${doc.id}')">Delete</button>
                    </div>
                </div>
            `;
            linksContainer.innerHTML += linkCard;
        });
    } catch (error) {
        console.error('Error loading links:', error);
    }
}

// Load Member Checkboxes
function loadMemberCheckboxes() {
    const memberCheckboxes = document.getElementById('memberCheckboxes');
    memberCheckboxes.innerHTML = '';

    allMembers.forEach(member => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '10px';
        label.style.padding = '8px 0';
        label.style.cursor = 'pointer';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = member.email;
        input.onchange = function() {
            if (this.checked) {
                if (!selectedMembers.includes(member.email)) {
                    selectedMembers.push(member.email);
                }
            } else {
                selectedMembers = selectedMembers.filter(e => e !== member.email);
            }
        };

        label.appendChild(input);
        label.appendChild(document.createTextNode(`${member.firstName} ${member.lastName} (${member.email})`));
        memberCheckboxes.appendChild(label);
    });
}

// Toggle Send To dropdown
document.addEventListener('change', function(e) {
    if (e.target.id === 'sendTo') {
        const selectedDiv = document.getElementById('selectedMembersDiv');
        selectedDiv.style.display = e.target.value === 'selected' ? 'block' : 'none';
    }
});

// Toggle Select All
function toggleSelectAll(checkbox) {
    document.querySelectorAll('.memberCheckbox').forEach(cb => {
        cb.checked = checkbox.checked;
        cb.dispatchEvent(new Event('change'));
    });
}

// Make Admin
async function makeAdminSelected() {
    const checkedBoxes = document.querySelectorAll('.memberCheckbox:checked');
    if (checkedBoxes.length === 0) {
        alert('Please select at least one member');
        return;
    }

    for (let checkbox of checkedBoxes) {
        const email = checkbox.value;
        const userRef = await db.collection('users').where('email', '==', email).get();
        
        if (!userRef.empty) {
            await userRef.docs[0].ref.update({
                isAdmin: true
            });
        }
    }

    alert(`${checkedBoxes.length} member(s) promoted to admin`);
    document.getElementById('selectAllCheckbox').checked = false;
    await loadMembers();
}

// Delete Selected
async function deleteSelected() {
    const checkedBoxes = document.querySelectorAll('.memberCheckbox:checked');
    if (checkedBoxes.length === 0) {
        alert('Please select at least one member');
        return;
    }

    if (!confirm(`Delete ${checkedBoxes.length} member(s)?`)) return;

    for (let checkbox of checkedBoxes) {
        const email = checkbox.value;
        const userRef = await db.collection('users').where('email', '==', email).get();
        
        if (!userRef.empty) {
            await userRef.docs[0].ref.delete();
        }
    }

    alert(`${checkedBoxes.length} member(s) deleted`);
    document.getElementById('selectAllCheckbox').checked = false;
    await loadMembers();
}

let currentAdminEmail = '';

// Send Announcement
async function sendAnnouncement(e) {
    e.preventDefault();

    const title = document.getElementById('announcementTitle').value;
    const message = document.getElementById('announcementMessage').value;
    const sendTo = document.getElementById('sendTo').value;

    if (!title || !message || !sendTo) {
        alert('Please fill in all fields');
        return;
    }

    let recipients = [];

    if (sendTo === 'all') {
        recipients = allMembers.map(m => m.email);
    } else if (sendTo === 'active') {
        recipients = allMembers.filter(m => m.membershipType === 'active').map(m => m.email);
    } else if (sendTo === 'selected') {
        recipients = selectedMembers;
        if (recipients.length === 0) {
            alert('Please select at least one member');
            return;
        }
    }

    try {
        await db.collection('announcements').add({
            title: title,
            message: message,
            sendTo: sendTo,
            recipientCount: recipients.length,
            recipients: recipients,
            createdAt: new Date(),
            createdBy: currentAdminEmail,
            senderEmail: currentAdminEmail
        });

        const successMsg = document.getElementById('successMessage');
        successMsg.textContent = `✓ Announcement saved successfully!`;
        successMsg.classList.add('show');

        document.getElementById('announcementTitle').value = '';
        document.getElementById('announcementMessage').value = '';
        document.getElementById('sendTo').value = '';
        selectedMembers = [];
        document.querySelectorAll('#memberCheckboxes input').forEach(cb => cb.checked = false);

        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 5000);

        await loadAnnouncements();
    } catch (error) {
        console.error('Error saving announcement:', error);
        alert('Error saving announcement: ' + error.message);
    }
}

// Add Link
async function addLink(e) {
    e.preventDefault();

    const title = document.getElementById('linkTitle').value;
    const url = document.getElementById('linkUrl').value;
    const description = document.getElementById('linkDescription').value;

    if (!title || !url) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        new URL(url);

        await db.collection('links').add({
            title: title,
            url: url,
            description: description || '',
            createdAt: new Date(),
            createdBy: currentAdminEmail
        });

        const successMsg = document.getElementById('linkSuccessMessage');
        successMsg.textContent = `✓ Link added successfully!`;
        successMsg.classList.add('show');

        document.getElementById('linkTitle').value = '';
        document.getElementById('linkUrl').value = '';
        document.getElementById('linkDescription').value = '';

        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 5000);

        await loadLinks();
    } catch (error) {
        if (error instanceof TypeError) {
            alert('Please enter a valid URL');
        } else {
            console.error('Error adding link:', error);
            alert('Error adding link: ' + error.message);
        }
    }
}

// Delete Link
async function deleteLink(id) {
    if (!confirm('Delete this link?')) return;

    try {
        await db.collection('links').doc(id).delete();
        await loadLinks();
    } catch (error) {
        console.error('Error deleting link:', error);
        alert('Error deleting link: ' + error.message);
    }
}

// Copy to Clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy link');
    });
}

// Delete Announcement
async function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement?')) return;

    try {
        await db.collection('announcements').doc(id).delete();
        await loadAnnouncements();
    } catch (error) {
        console.error('Error deleting announcement:', error);
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clean up real-time listener
        if (prayerRequestListener) {
            prayerRequestListener();
        }
        StorageManager.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}