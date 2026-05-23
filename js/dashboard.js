let allMembers = [];
let selectedMembers = [];
let allAnnouncements = [];
let allLinks = [];
let allPrayerRequests = [];

// Check if user is admin on page load
document.addEventListener('DOMContentLoaded', async function() {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    const userData = JSON.parse(currentUser);
    const isAdmin = userData.isAdmin === true;
    
    console.log('User:', userData.email, 'Is Admin:', isAdmin);

    if (!isAdmin) {
        window.location.href = 'member-landing.html';
        return;
    }

    // Set current admin email for announcements
    currentAdminEmail = userData.email;
    console.log('Admin email for sending announcements:', currentAdminEmail);

    // Display user info
    document.getElementById('userName').textContent = userData.firstName + ' ' + userData.lastName;
    const initials = (userData.firstName.charAt(0) + userData.lastName.charAt(0)).toUpperCase();
    document.getElementById('userAvatar').textContent = initials;

    // Load data
    await loadStatistics();
    await loadMembers();
    await loadRegistrations();
    await loadAnnouncements();
    await loadPrayerRequests();
    await loadLinks();
});

// Show/Hide Sections
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    // Show selected section
    document.getElementById(sectionId).classList.add('active');

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    event.target.closest('a').classList.add('active');

    // Update header text
    const sectionTitles = {
        'dashboard': 'Dashboard Overview',
        'members': 'Members Management',
        'announcements': 'Announcements',
        'prayerRequests': 'Prayer Requests',
        'links': 'Manage Links',
        'registrations': 'New Registrations'
    };
    document.getElementById('currentSection').textContent = sectionTitles[sectionId] || 'Dashboard';

    // Refresh data when opening prayer requests
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
            if (data.email !== 'admin@gracemission.com') { // Exclude main admin
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

// Load Registrations
async function loadRegistrations() {
    try {
        const registrationsSnapshot = await db.collection('registrations').orderBy('createdAt', 'desc').get();
        const tableBody = document.getElementById('registrationsTableBody');
        tableBody.innerHTML = '';

        registrationsSnapshot.forEach(doc => {
            const data = doc.data();
            const row = `
                <tr>
                    <td>${data.firstName} ${data.lastName}</td>
                    <td>${data.email}</td>
                    <td>${data.phone}</td>
                    <td>${data.city}</td>
                    <td>${data.membershipType}</td>
                    <td>${new Date(data.createdAt?.toDate?.() || data.timestamp).toLocaleDateString()}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        if (registrationsSnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No registrations found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading registrations:', error);
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

// Load Prayer Requests
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

        prayerSnapshot.forEach(doc => {
            const data = doc.data();
            allPrayerRequests.push({ id: doc.id, ...data });
            
            const statusBadge = getStatusBadge(data.status || 'pending');
            const submitterName = data.isAnonymous ? '🔒 Anonymous' : `👤 ${data.submitterName}`;
            
            const prayerCard = `
                <div class="prayer-request-card">
                    <div class="prayer-request-header">
                        <div class="prayer-title">${data.title}</div>
                        <div class="prayer-status-badge">${statusBadge}</div>
                    </div>
                    <div class="prayer-content">${data.message}</div>
                    <div class="prayer-meta">
                        ${submitterName} • 📅 ${new Date(data.createdAt?.toDate?.() || new Date()).toLocaleDateString()}
                    </div>
                    <div class="prayer-actions">
                        <button class="action-btn success" onclick="approvePrayerRequest('${doc.id}')">✓ Approve</button>
                        <button class="action-btn warning" onclick="declinePrayerRequest('${doc.id}')">✗ Decline</button>
                        <button class="action-btn danger" onclick="deletePrayerRequest('${doc.id}')">🗑️ Delete</button>
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

// Get Status Badge
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge pending">⏳ Pending</span>',
        'approved': '<span class="badge approved">✓ Approved</span>',
        'declined': '<span class="badge declined">✗ Declined</span>'
    };
    return badges[status] || badges['pending'];
}

// Approve Prayer Request
async function approvePrayerRequest(id) {
    try {
        await db.collection('prayerRequests').doc(id).update({
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: currentAdminEmail
        });
        await loadPrayerRequests();
        showSuccessMessage('Prayer request approved!');
    } catch (error) {
        console.error('Error approving prayer request:', error);
        alert('Error approving prayer request: ' + error.message);
    }
}

// Decline Prayer Request
async function declinePrayerRequest(id) {
    const reason = prompt('Enter reason for declining (optional):');
    
    try {
        await db.collection('prayerRequests').doc(id).update({
            status: 'declined',
            declinedAt: new Date(),
            declinedBy: currentAdminEmail,
            declineReason: reason || ''
        });
        await loadPrayerRequests();
        showSuccessMessage('Prayer request declined!');
    } catch (error) {
        console.error('Error declining prayer request:', error);
        alert('Error declining prayer request: ' + error.message);
    }
}

// Delete Prayer Request
async function deletePrayerRequest(id) {
    if (!confirm('Delete this prayer request?')) return;

    try {
        await db.collection('prayerRequests').doc(id).delete();
        await loadPrayerRequests();
        showSuccessMessage('Prayer request deleted!');
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
    msg.textContent = '✓ ' + message;
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

// Get current admin user
let currentAdminEmail = '';

// Send Announcement - Store in Firestore Only
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
        // Save announcement to Firestore
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

        // Show success message
        const successMsg = document.getElementById('successMessage');
        successMsg.textContent = `✓ Announcement saved successfully!`;
        successMsg.classList.add('show');

        // Reset form
        document.getElementById('announcementTitle').value = '';
        document.getElementById('announcementMessage').value = '';
        document.getElementById('sendTo').value = '';
        selectedMembers = [];
        document.querySelectorAll('#memberCheckboxes input').forEach(cb => cb.checked = false);

        // Hide success message after 5 seconds
        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 5000);

        // Reload announcements
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
        // Validate URL
        new URL(url);

        // Save link to Firestore
        await db.collection('links').add({
            title: title,
            url: url,
            description: description || '',
            createdAt: new Date(),
            createdBy: currentAdminEmail
        });

        // Show success message
        const successMsg = document.getElementById('linkSuccessMessage');
        successMsg.textContent = `✓ Link added successfully!`;
        successMsg.classList.add('show');

        // Reset form
        document.getElementById('linkTitle').value = '';
        document.getElementById('linkUrl').value = '';
        document.getElementById('linkDescription').value = '';

        // Hide success message after 5 seconds
        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 5000);

        // Reload links
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
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}