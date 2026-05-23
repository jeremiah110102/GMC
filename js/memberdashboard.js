let currentUserEmail = '';
let currentUserData = {};
let allApprovedPrayers = [];
let previousAnnouncementCount = 0;
let previousPrayerCount = 0;
let previousResourceCount = 0;

// ===== NOTIFICATION SYSTEM - REAL TIME =====
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.maxNotifications = 3; // Show max 3 notifications at once
        this.recentTitles = {}; // Track recently shown titles to avoid duplicates
        this.recentTitleTimeout = 2000; // 2 second timeout for duplicate prevention
    }

    ensureContainer() {
        if (!this.container) {
            this.container = document.getElementById('notificationContainer');
        }
        return this.container;
    }

    show(title, message, type = 'info', duration = 5000) {
        const container = this.ensureContainer();
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = {
            'success': '✓',
            'info': 'ℹ',
            'warning': '⚠'
        }[type] || 'ℹ';

        // Truncate long messages
        let displayMessage = message;
        if (displayMessage.length > 150) {
            displayMessage = displayMessage.substring(0, 150) + '...';
        }

        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${displayMessage}</div>
            </div>
            <button class="notification-close" onclick="notificationManager.closeNotification(this)">×</button>
        `;

        // Add to top of container
        if (container.firstChild) {
            container.insertBefore(notification, container.firstChild);
        } else {
            container.appendChild(notification);
        }

        // Add to tracking array
        this.notifications.push({
            element: notification,
            type: type,
            title: title,
            createdAt: Date.now()
        });

        // Remove oldest notification if max reached
        if (this.notifications.length > this.maxNotifications) {
            const oldest = this.notifications.shift();
            if (oldest.element && oldest.element.parentElement) {
                oldest.element.classList.add('fade-out');
                setTimeout(() => {
                    if (oldest.element.parentElement) {
                        oldest.element.remove();
                    }
                }, 300);
            }
        }

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    this.closeNotification(notification);
                }
            }, duration);
        }

        return notification;
    }

    closeNotification(element) {
        const notif = element instanceof HTMLElement ? element : element.parentElement;
        if (!notif || !notif.parentElement) return;
        
        notif.classList.add('fade-out');
        setTimeout(() => {
            if (notif.parentElement) {
                notif.remove();
            }
            this.notifications = this.notifications.filter(n => n.element !== notif);
        }, 300);
    }

    // Check if title was recently shown (within timeout period)
    isDuplicateRecent(title) {
        if (this.recentTitles[title]) {
            const timeSince = Date.now() - this.recentTitles[title];
            if (timeSince < this.recentTitleTimeout) {
                return true;
            }
        }
        return false;
    }

    // Show notification avoiding near-duplicates
    showOnce(title, message, type = 'info', duration = 5000) {
        if (this.isDuplicateRecent(title)) {
            return null; // Skip duplicate
        }

        // Mark this title as recently shown
        this.recentTitles[title] = Date.now();

        // Clean up old recent title records
        Object.keys(this.recentTitles).forEach(key => {
            if (Date.now() - this.recentTitles[key] > this.recentTitleTimeout * 2) {
                delete this.recentTitles[key];
            }
        });

        return this.show(title, message, type, duration);
    }
}

// Initialize notification manager globally
let notificationManager;
document.addEventListener('DOMContentLoaded', function() {
    notificationManager = new NotificationManager();
});

// ===== MOBILE MENU INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeMobileMenu();
});

// Initialize Mobile Menu
function initializeMobileMenu() {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');

    if (!hamburgerMenu || !sidebar) {
        console.log('Mobile menu elements found, proceeding...');
        return;
    }

    /**
     * Toggle hamburger menu active state and show/hide sidebar
     */
    function toggleMenu() {
        hamburgerMenu.classList.toggle('active');
        sidebar.classList.toggle('active');
        
        if (sidebarOverlay) {
            sidebarOverlay.classList.toggle('active');
        }

        // Prevent body scroll when menu is open
        if (hamburgerMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * Close the menu and reset states
     */
    function closeMenu() {
        hamburgerMenu.classList.remove('active');
        sidebar.classList.remove('active');
        
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }

        document.body.style.overflow = 'auto';
    }

    // Hamburger menu click handler
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });
    }

    // Overlay click handler - close menu when clicking outside
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            closeMenu();
        });
    }

    // Sidebar links click handler - close menu when navigating
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Close menu when a link is clicked
            closeMenu();
        });
    });

    // Close menu on Escape key press
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && hamburgerMenu.classList.contains('active')) {
            closeMenu();
        }
    });

    // Close menu when window is resized to larger screen
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth > 768 && hamburgerMenu.classList.contains('active')) {
                closeMenu();
            }
        }, 250);
    });

    // Handle orientation change
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            if (window.innerWidth > 768) {
                closeMenu();
            }
        }, 100);
    });

    // Prevent menu close when clicking inside sidebar
    sidebar.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    console.log('✅ Mobile menu initialized successfully');
}

// ===== AUTHENTICATION & INITIALIZATION =====
// Check if user is logged in (non-admin)
document.addEventListener('DOMContentLoaded', async function() {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    const userData = JSON.parse(currentUser);
    
    // If admin, redirect to admin dashboard
    if (userData.isAdmin) {
        window.location.href = 'admin-dashboard.html';
        return;
    }

    currentUserEmail = userData.email;
    currentUserData = userData;

    // Display user info
    document.getElementById('userName').textContent = userData.firstName + ' ' + userData.lastName;
    document.getElementById('firstName').textContent = userData.firstName;
    
    const initials = (userData.firstName.charAt(0) + userData.lastName.charAt(0)).toUpperCase();
    document.getElementById('userAvatar').textContent = initials;

    // Load member profile
    await loadMemberProfile(userData.email);
    
    // Load initial data
    await loadAnnouncements(userData.email);
    await loadActiveRequests();
    await loadPrayerRequests();
    await loadResources();

    // Set up auto-refresh with notifications
    setUpAutoRefresh();
});

// ===== AUTO-REFRESH SYSTEM =====
// Auto-refresh with real-time notifications (check every 3 seconds)
function setUpAutoRefresh() {
    setInterval(async () => {
        await checkForNewAnnouncements();
        await checkForNewPrayers();
        await checkForNewResources();
    }, 3000); // Check every 3 seconds for real-time updates
}

// Check for new announcements and show real-time notification
async function checkForNewAnnouncements() {
    try {
        const snapshot = await db.collection('announcements').orderBy('createdAt', 'desc').get();
        const count = snapshot.size;
        
        if (previousAnnouncementCount > 0 && count > previousAnnouncementCount) {
            // Get new announcements (those added since last check)
            const newCount = count - previousAnnouncementCount;
            const newAnnouncements = [];
            
            snapshot.docs.slice(0, newCount).forEach(doc => {
                newAnnouncements.push(doc.data());
            });

            // Show notification for each new announcement
            newAnnouncements.reverse().forEach((announcement, idx) => {
                setTimeout(() => {
                    const shortMessage = announcement.message.substring(0, 100);
                    notificationManager.show(
                        '📢 ' + announcement.title,
                        shortMessage + (announcement.message.length > 100 ? '...' : ''),
                        'info',
                        5000
                    );
                }, idx * 400); // Stagger notifications
            });
            
            // Reload announcements if on that section
            const announcementsSection = document.getElementById('announcementsSection');
            if (announcementsSection && announcementsSection.classList.contains('active')) {
                await loadAnnouncements(currentUserEmail);
            }
            
            previousAnnouncementCount = count;
        } else if (previousAnnouncementCount === 0) {
            previousAnnouncementCount = count;
        }
    } catch (error) {
        console.error('Error checking for new announcements:', error);
    }
}

// Check for new accepted prayer requests and show real-time notification
async function checkForNewPrayers() {
    try {
        const snapshot = await db.collection('prayerRequests')
            .where('status', '==', 'approved')
            .orderBy('approvedAt', 'desc')
            .get();
        const count = snapshot.size;
        
        if (previousPrayerCount > 0 && count > previousPrayerCount) {
            const newPrayerCount = count - previousPrayerCount;
            const newPrayers = [];
            
            snapshot.docs.slice(0, newPrayerCount).forEach(doc => {
                newPrayers.push(doc.data());
            });

            // Show notification for each new approved prayer
            newPrayers.reverse().forEach((prayer, idx) => {
                setTimeout(() => {
                    const submitterDisplay = prayer.isAnonymous ? '🔒 Anonymous' : `👤 ${prayer.submitterName}`;
                    const shortMessage = prayer.message.substring(0, 80);
                    notificationManager.show(
                        '🙏 ' + prayer.title,
                        `${submitterDisplay} • ${shortMessage}${prayer.message.length > 80 ? '...' : ''}`,
                        'success',
                        5000
                    );
                }, idx * 400); // Stagger notifications
            });
            
            // Reload active requests if on that section
            const activeSection = document.getElementById('activeRequestsSection');
            if (activeSection && activeSection.classList.contains('active')) {
                await loadActiveRequests();
            }
            
            previousPrayerCount = count;
        } else if (previousPrayerCount === 0) {
            previousPrayerCount = count;
        }
    } catch (error) {
        console.error('Error checking for new prayers:', error);
    }
}

// Check for new resources and show real-time notification
async function checkForNewResources() {
    try {
        const snapshot = await db.collection('links').orderBy('createdAt', 'desc').get();
        const count = snapshot.size;
        
        if (previousResourceCount > 0 && count > previousResourceCount) {
            const newResourceCount = count - previousResourceCount;
            const newResources = [];
            
            snapshot.docs.slice(0, newResourceCount).forEach(doc => {
                newResources.push(doc.data());
            });

            // Show notification for each new resource
            newResources.reverse().forEach((resource, idx) => {
                setTimeout(() => {
                    const description = resource.description 
                        ? resource.description.substring(0, 85) 
                        : 'New church resource added';
                    notificationManager.show(
                        '🔗 ' + resource.title,
                        description + (description.length >= 85 ? '...' : ''),
                        'success',
                        5000
                    );
                }, idx * 400); // Stagger notifications
            });
            
            // Reload resources if on that section
            const linksSection = document.getElementById('linksSection');
            if (linksSection && linksSection.classList.contains('active')) {
                await loadResources();
            }
            
            previousResourceCount = count;
        } else if (previousResourceCount === 0) {
            previousResourceCount = count;
        }
    } catch (error) {
        console.error('Error checking for new resources:', error);
    }
}

// ===== SECTION NAVIGATION =====
// Show/Hide Sections
function showSection(sectionId) {
    // Close mobile menu when navigating
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    if (hamburgerMenu && hamburgerMenu.classList.contains('active')) {
        hamburgerMenu.classList.remove('active');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    // Show the selected section
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }

    // Update active navigation link
    document.querySelectorAll('.sidebar-nav a').forEach(el => el.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-nav a[onclick="showSection('${sectionId}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Update section title
    const sectionTitles = {
        'homeSection': 'Member Portal',
        'dashboardSection': 'Dashboard',
        'announcementsSection': 'Announcements',
        'activeRequestsSection': 'Active Requests',
        'prayerSection': 'Prayer Requests',
        'profileSection': 'My Profile',
        'editProfileSection': 'Edit Profile',
        'linksSection': 'Church Resources'
    };
    const currentSectionEl = document.getElementById('currentSection');
    if (currentSectionEl) {
        currentSectionEl.textContent = sectionTitles[sectionId] || 'Member Portal';
    }

    // Load section-specific data
    if (sectionId === 'announcementsSection') {
        loadAnnouncements(currentUserEmail);
    } else if (sectionId === 'activeRequestsSection') {
        loadActiveRequests();
    } else if (sectionId === 'prayerSection') {
        loadPrayerRequests();
    } else if (sectionId === 'editProfileSection') {
        populateEditForm();
    } else if (sectionId === 'profileSection') {
        populateProfileView();
    } else if (sectionId === 'dashboardSection') {
        populateDashboard();
    } else if (sectionId === 'linksSection') {
        loadResources();
    }
}

// ===== PROFILE MANAGEMENT =====
// Load Member Profile
async function loadMemberProfile(email) {
    try {
        const userSnapshot = await db.collection('users').where('email', '==', email).get();
        if (!userSnapshot.empty) {
            const data = userSnapshot.docs[0].data();
            currentUserData = { id: userSnapshot.docs[0].id, ...data };
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Populate Profile View
function populateProfileView() {
    document.getElementById('profFirstName').textContent = currentUserData.firstName || '-';
    document.getElementById('profLastName').textContent = currentUserData.lastName || '-';
    document.getElementById('profEmail').textContent = currentUserData.email || '-';
    document.getElementById('profPhone').textContent = currentUserData.phone || '-';
    document.getElementById('profCity').textContent = currentUserData.city || '-';
    document.getElementById('profMembershipType').textContent = currentUserData.membershipType || '-';
    document.getElementById('profJoinDate').textContent = currentUserData.createdAt ? new Date(currentUserData.createdAt.toDate()).toLocaleDateString() : '-';
}

// Populate Dashboard
function populateDashboard() {
    document.getElementById('dashMembershipType').textContent = currentUserData.membershipType || '-';
    document.getElementById('dashJoinDate').textContent = currentUserData.createdAt ? new Date(currentUserData.createdAt.toDate()).toLocaleDateString() : '-';
    document.getElementById('dashEmail').textContent = currentUserData.email || '-';
    document.getElementById('dashPhone').textContent = currentUserData.phone || '-';
    document.getElementById('dashCity').textContent = currentUserData.city || '-';
}

// Populate Edit Form
function populateEditForm() {
    document.getElementById('editFirstName').value = currentUserData.firstName || '';
    document.getElementById('editLastName').value = currentUserData.lastName || '';
    document.getElementById('editEmail').value = currentUserData.email || '';
    document.getElementById('editPhone').value = currentUserData.phone || '';
    document.getElementById('editCity').value = currentUserData.city || '';
    document.getElementById('editMembershipType').value = currentUserData.membershipType || '';
}

// Update Profile
async function updateProfile(e) {
    e.preventDefault();

    const firstName = document.getElementById('editFirstName').value;
    const lastName = document.getElementById('editLastName').value;
    const phone = document.getElementById('editPhone').value;
    const city = document.getElementById('editCity').value;

    try {
        await db.collection('users').doc(currentUserData.id).update({
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            city: city
        });

        const updatedUser = {
            ...currentUserData,
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            city: city
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        currentUserData = updatedUser;

        document.getElementById('userName').textContent = firstName + ' ' + lastName;
        document.getElementById('firstName').textContent = firstName;

        notificationManager.show('✓ Success', 'Profile updated successfully!', 'success', 4000);

        const successMsg = document.getElementById('editSuccessMessage');
        successMsg.textContent = '✓ Profile updated successfully!';
        successMsg.classList.add('show');

        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 5000);

        await loadMemberProfile(currentUserEmail);
        populateProfileView();
    } catch (error) {
        console.error('Error updating profile:', error);
        notificationManager.show('✗ Error', 'Failed to update profile: ' + error.message, 'warning', 5000);
    }
}

// ===== ANNOUNCEMENTS =====
// Load Announcements - Card Style
async function loadAnnouncements(userEmail) {
    try {
        const announcementsSnapshot = await db.collection('announcements').orderBy('createdAt', 'desc').get();
        const announcementsContainer = document.getElementById('announcementsContainer');
        announcementsContainer.innerHTML = '';

        let visibleAnnouncements = [];

        announcementsSnapshot.forEach(doc => {
            const data = doc.data();
            let canSee = false;
            
            if (data.sendTo === 'all') {
                canSee = true;
            } else if (data.sendTo === 'active') {
                if (currentUserData.membershipType === 'active') {
                    canSee = true;
                }
            } else if (data.sendTo === 'selected') {
                if (data.recipients && Array.isArray(data.recipients) && data.recipients.includes(userEmail)) {
                    canSee = true;
                }
            }

            if (canSee) {
                visibleAnnouncements.push(data);
            }
        });

        if (visibleAnnouncements.length === 0) {
            announcementsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p>No announcements available for you.</p>
                </div>
            `;
            return;
        }

        visibleAnnouncements.forEach((announcement, index) => {
            const createdDate = new Date(announcement.createdAt?.toDate?.() || new Date());
            const formattedDate = createdDate.toLocaleDateString();
            
            const sendToLabel = announcement.sendTo === 'all' ? 'Everyone' : 
                               announcement.sendTo === 'active' ? 'Active Members Only' : 
                               'Selected Members Only';

            const announcementCard = `
                <div class="announcement-card" style="animation-delay: ${index * 0.1}s;">
                    <div class="card-header">
                        <h3 class="card-title">${announcement.title}</h3>
                        <span class="card-badge">${sendToLabel}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-content">${announcement.message}</div>
                        <div class="card-meta">
                            <div class="card-meta-item">📅 ${formattedDate}</div>
                            <div class="card-meta-item">👥 ${sendToLabel}</div>
                        </div>
                    </div>
                </div>
            `;
            announcementsContainer.innerHTML += announcementCard;
        });
    } catch (error) {
        console.error('Error loading announcements:', error);
        document.getElementById('announcementsContainer').innerHTML = '<p style="color: red;">Error loading announcements</p>';
    }
}

// ===== PRAYER REQUESTS - ACTIVE =====
// Load Active Requests - Card Style
async function loadActiveRequests() {
    try {
        const prayerSnapshot = await db.collection('prayerRequests')
            .where('status', '==', 'approved')
            .get();
        
        allApprovedPrayers = [];
        const activeContainer = document.getElementById('activeRequestsContainer');
        activeContainer.innerHTML = '';

        prayerSnapshot.forEach(doc => {
            const data = doc.data();
            allApprovedPrayers.push({ ...data, id: doc.id });
        });

        allApprovedPrayers.sort((a, b) => {
            const dateA = a.approvedAt ? new Date(a.approvedAt.toDate()) : new Date(0);
            const dateB = b.approvedAt ? new Date(b.approvedAt.toDate()) : new Date(0);
            return dateB - dateA;
        });

        displayApprovedPrayers(allApprovedPrayers);
    } catch (error) {
        console.error('Error loading active requests:', error);
        document.getElementById('activeRequestsContainer').innerHTML = '<p style="color: red;">Error loading approved prayer requests. Please refresh the page.</p>';
    }
}

// Display Approved Prayers - Card Style
function displayApprovedPrayers(prayers) {
    const activeContainer = document.getElementById('activeRequestsContainer');
    activeContainer.innerHTML = '';

    if (prayers.length === 0) {
        activeContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <p>No approved prayer requests available.</p>
            </div>
        `;
        return;
    }

    prayers.forEach((prayer, index) => {
        const submitterName = prayer.isAnonymous ? '🔒 Anonymous' : `👤 ${prayer.submitterName}`;
        const approvedDate = prayer.approvedAt ? new Date(prayer.approvedAt.toDate()).toLocaleDateString() : 'Unknown';
        const createdDate = new Date(prayer.createdAt?.toDate?.() || new Date()).toLocaleDateString();
        
        const prayerCard = `
            <div class="prayer-card approved" style="animation-delay: ${index * 0.1}s;">
                <div class="card-header">
                    <h3 class="card-title">${prayer.title}</h3>
                    <span class="card-badge approved">✓ Approved</span>
                </div>
                <div class="card-body">
                    <div class="card-content">${prayer.message}</div>
                    <div class="card-meta">
                        <div class="card-meta-item">${submitterName}</div>
                        <div class="card-meta-item">📅 Submitted: ${createdDate}</div>
                        <div class="card-meta-item">✅ Approved: ${approvedDate}</div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="prayer-status">✓ Approved & Community Shared</span>
                </div>
            </div>
        `;
        activeContainer.innerHTML += prayerCard;
    });
}

// Apply Date Filter
function applyDateFilter() {
    const fromDate = document.getElementById('filterFromDate').value;
    const toDate = document.getElementById('filterToDate').value;

    if (!fromDate && !toDate) {
        alert('Please select at least one date');
        return;
    }

    let filtered = allApprovedPrayers;

    if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        filtered = filtered.filter(prayer => {
            if (!prayer.approvedAt) return false;
            const prayerDate = new Date(prayer.approvedAt.toDate());
            return prayerDate >= from;
        });
    }

    if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter(prayer => {
            if (!prayer.approvedAt) return false;
            const prayerDate = new Date(prayer.approvedAt.toDate());
            return prayerDate <= to;
        });
    }

    displayApprovedPrayers(filtered);

    const filterMessage = document.getElementById('filterMessage');
    if (filterMessage) {
        filterMessage.remove();
    }

    const activeContainer = document.getElementById('activeRequestsContainer');
    const newFilterMessage = document.createElement('div');
    newFilterMessage.id = 'filterMessage';
    newFilterMessage.style.cssText = `
        background: #dbeafe;
        border-left: 4px solid var(--secondary-navy);
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        color: #001f3f;
        font-weight: 600;
        font-size: 14px;
    `;
    newFilterMessage.textContent = `🔍 Showing ${filtered.length} prayer(s) between ${fromDate || 'start'} and ${toDate || 'today'}`;
    activeContainer.insertAdjacentElement('beforebegin', newFilterMessage);
}

// Reset Date Filter
function resetDateFilter() {
    document.getElementById('filterFromDate').value = '';
    document.getElementById('filterToDate').value = '';
    loadActiveRequests();
    
    const filterMessage = document.getElementById('filterMessage');
    if (filterMessage) {
        filterMessage.remove();
    }
}

// ===== PRAYER REQUESTS - USER SUBMISSIONS =====
// Load Prayer Requests - Card Style
async function loadPrayerRequests() {
    try {
        const prayerSnapshot = await db.collection('prayerRequests').orderBy('createdAt', 'desc').get();
        const prayerContainer = document.getElementById('prayerRequestsContainer');
        prayerContainer.innerHTML = '';

        let visiblePrayers = [];

        prayerSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.submitterEmail === currentUserEmail || !data.isAnonymous) {
                visiblePrayers.push({ ...data, id: doc.id });
            }
        });

        if (visiblePrayers.length === 0) {
            prayerContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📿</div>
                    <p>No prayer requests yet. Be the first to share!</p>
                </div>
            `;
            return;
        }

        visiblePrayers.forEach((prayer, index) => {
            const isOwnPrayer = prayer.submitterEmail === currentUserEmail;
            const submitterName = prayer.isAnonymous ? '🔒 Anonymous' : `👤 ${prayer.submitterName}`;
            const createdDate = new Date(prayer.createdAt?.toDate?.() || new Date());
            const formattedDate = createdDate.toLocaleDateString();
            
            const yourBadge = isOwnPrayer ? '<span class="card-badge your-prayer">Your Prayer</span>' : '';
            const statusBadge = prayer.status === 'approved' ? '<span class="card-badge approved">✓ Approved</span>' : '';
            
            const prayerCard = `
                <div class="prayer-card ${prayer.status === 'approved' ? 'approved' : ''}" style="animation-delay: ${index * 0.1}s;">
                    <div class="card-header">
                        <h3 class="card-title">${prayer.title}</h3>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            ${yourBadge}
                            ${statusBadge}
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="card-content">${prayer.message}</div>
                        <div class="card-meta">
                            <div class="card-meta-item">${submitterName}</div>
                            <div class="card-meta-item">📅 ${formattedDate}</div>
                            <div class="card-meta-item">📊 Status: ${prayer.status.charAt(0).toUpperCase() + prayer.status.slice(1)}</div>
                        </div>
                    </div>
                </div>
            `;
            prayerContainer.innerHTML += prayerCard;
        });
    } catch (error) {
        console.error('Error loading prayer requests:', error);
        document.getElementById('prayerRequestsContainer').innerHTML = '<p style="color: red;">Error loading prayer requests</p>';
    }
}

// Submit Prayer Request
async function submitPrayerRequest(e) {
    e.preventDefault();

    const title = document.getElementById('prayerTitle').value;
    const message = document.getElementById('prayerMessage').value;
    const isAnonymous = document.getElementById('prayerAnonymous').checked;

    try {
        await db.collection('prayerRequests').add({
            title: title,
            message: message,
            submitterEmail: currentUserEmail,
            submitterName: currentUserData.firstName + ' ' + currentUserData.lastName,
            isAnonymous: isAnonymous,
            createdAt: new Date(),
            status: 'pending'
        });

        notificationManager.show('🙏 Prayer Submitted', 'Your prayer request has been submitted!', 'success', 4000);

        const successMsg = document.getElementById('prayerSuccessMessage');
        successMsg.textContent = '✓ Prayer request submitted successfully!';
        successMsg.classList.add('show');

        document.getElementById('prayerTitle').value = '';
        document.getElementById('prayerMessage').value = '';
        document.getElementById('prayerAnonymous').checked = false;

        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 5000);

        await loadPrayerRequests();
    } catch (error) {
        console.error('Error submitting prayer request:', error);
        notificationManager.show('✗ Error', 'Failed to submit prayer request', 'warning', 5000);
    }
}

// ===== RESOURCES =====
// Load Resources - Card Style
async function loadResources() {
    try {
        const linksSnapshot = await db.collection('links').orderBy('createdAt', 'desc').get();
        const resourcesContainer = document.getElementById('resourcesContainer');
        resourcesContainer.innerHTML = '';

        if (linksSnapshot.empty) {
            resourcesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔗</div>
                    <p>No resources available yet.</p>
                </div>
            `;
            return;
        }

        linksSnapshot.forEach((doc, index) => {
            const data = doc.data();
            const createdDate = new Date(data.createdAt?.toDate?.() || new Date());
            const formattedDate = createdDate.toLocaleDateString();

            const resourceCard = `
                <div class="resource-card" style="animation-delay: ${index * 0.1}s;">
                    <div class="card-header">
                        <h3 class="card-title">${data.title}</h3>
                        <span class="card-badge">Resource</span>
                    </div>
                    <div class="card-body">
                        ${data.description ? `<div class="card-content">${data.description}</div>` : ''}
                        <div class="card-meta">
                            <div class="card-meta-item">📅 ${formattedDate}</div>
                            <div class="card-meta-item">🌐 External Link</div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <a href="${data.url}" target="_blank" class="resource-link-btn">
                            Open Link →
                        </a>
                    </div>
                </div>
            `;
            resourcesContainer.innerHTML += resourceCard;
        });
    } catch (error) {
        console.error('Error loading resources:', error);
        document.getElementById('resourcesContainer').innerHTML = '<p style="color: red;">Error loading resources</p>';
    }
}

// ===== LOGOUT =====
// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}