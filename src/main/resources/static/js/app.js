/* =============================================================
   coRide Java Web – Frontend Application Script
   Connects to Spring Boot REST API at /api/*
   ============================================================= */

'use strict';

// ── API base ─────────────────────────────────────────────────
const API = {
  verify:     '/api/auth/verify',
  barcode:    '/api/auth/verify-barcode',
  validate:   '/api/auth/validate-admission',
  rides:      '/api/rides',
  requests:   '/api/requests',
};

// ── State ─────────────────────────────────────────────────────
let currentUser = JSON.parse(sessionStorage.getItem('corideUser') || 'null');
let allRides    = [];
let allRequests = [];

// ── Admission regex (mirrors Java service) ────────────────────
const ADMISSION_NO_REGEX = /^(\d{2})\/(\d{3})\/([A-Za-z]{2,3})$/;

/* =============================================================
   UTILITY: TOAST NOTIFICATIONS
============================================================= */
function showToast(message, type = 'success', duration = 3500) {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info} toast-icon"></i><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'toast-in 0.3s ease reverse'; setTimeout(() => toast.remove(), 280); }, duration);
}

/* =============================================================
   UTILITY: API FETCH WRAPPER
============================================================= */
async function apiRequest(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/* =============================================================
   TAB NAVIGATION
============================================================= */
function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const pane = document.getElementById(tabId);
  if (pane) pane.classList.add('active');
  const btn = document.querySelector(`[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');
}

document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    if ((tabId === 'offer-tab' || tabId === 'requests-tab') && !currentUser) {
      showToast('Please verify your identity first!', 'warning');
      openModal('manual-modal');
      return;
    }
    if (tabId === 'activity-tab') renderMyActivity();
    switchTab(tabId);
  });
});

/* =============================================================
   MODAL MANAGEMENT
============================================================= */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

// Close buttons
document.querySelectorAll('.close-modal-btn[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-backdrop').forEach(modal => {
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); });
});

// Open verify modals from banner
document.getElementById('open-scan-btn')?.addEventListener('click', () => openModal('scan-modal'));
document.getElementById('open-manual-btn')?.addEventListener('click', () => openModal('manual-modal'));
document.getElementById('open-post-need-btn')?.addEventListener('click', () => {
  if (!currentUser) { showToast('Please verify your identity first!', 'warning'); openModal('manual-modal'); return; }
  openModal('post-need-modal');
});

/* =============================================================
   USER MENU RENDERING
============================================================= */
function renderUserMenu() {
  const menu = document.getElementById('user-menu');
  const banner = document.getElementById('verify-banner');
  const mobileArea = document.getElementById('mobile-user-area');

  if (!menu) return;

  if (currentUser) {
    banner.style.display = 'none';
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    menu.innerHTML = `
      <div class="user-badge">
        <div class="user-avatar">${initials}</div>
        <div>
          <div class="user-name">${currentUser.name}</div>
          <div class="user-dept">${currentUser.branchCode} · ${currentUser.role}</div>
        </div>
      </div>
      <button class="btn btn-danger" id="logout-btn" style="padding:0.45rem 0.9rem;font-size:0.82rem;">
        <i class="fa-solid fa-right-from-bracket"></i> Logout
      </button>`;
    document.getElementById('logout-btn')?.addEventListener('click', logout);

    // Mobile top bar — show avatar + name
    if (mobileArea) {
      mobileArea.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <div class="user-avatar" style="width:30px;height:30px;font-size:0.75rem;">${initials}</div>
          <span style="font-size:0.8rem;font-weight:700;color:var(--text-main);">${currentUser.name.split(' ')[0]}</span>
        </div>
        <button class="btn btn-danger" id="mobile-logout-btn" style="padding:0.35rem 0.75rem;font-size:0.75rem;">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>`;
      document.getElementById('mobile-logout-btn')?.addEventListener('click', logout);
    }
  } else {
    banner.style.display = '';
    menu.innerHTML = `
      <button class="btn btn-primary" id="hdr-verify-btn">
        <i class="fa-solid fa-shield-check"></i> Verify Identity
      </button>`;
    document.getElementById('hdr-verify-btn')?.addEventListener('click', () => openModal('manual-modal'));

    // Mobile top bar — show verify button
    if (mobileArea) {
      mobileArea.innerHTML = `
        <button class="btn btn-primary" id="mobile-verify-btn" style="padding:0.4rem 0.85rem;font-size:0.8rem;">
          <i class="fa-solid fa-shield-check"></i> Verify
        </button>`;
      document.getElementById('mobile-verify-btn')?.addEventListener('click', () => openModal('manual-modal'));
    }
  }
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('corideUser');
  renderUserMenu();
  showToast('You have been logged out.', 'info');
  switchTab('rides-tab');
  loadRides();
}

/* =============================================================
   RIDES: LOAD & RENDER
============================================================= */
async function loadRides(searchQuery = '') {
  const container = document.getElementById('rides-container');
  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);"><div class="spinner" style="border-top-color:var(--accent-primary);width:36px;height:36px;border-width:3px;margin:0 auto 1rem;"></div><p>Loading rides…</p></div>';

  let url = API.rides;
  if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;

  const { ok, data } = await apiRequest(url);
  if (!ok) { container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h3>Failed to load rides</h3><p>Please refresh the page.</p></div>'; return; }

  allRides = data || [];
  renderRides(allRides);
}

// Helper: normalize name for safe comparison (case-insensitive and trimmed)
function sameName(a, b) {
  if (!a || !b) return false;
  return a.toString().trim().toLowerCase() === b.toString().trim().toLowerCase();
}

function updateDriverNotifications() {
  if (!currentUser) return;
  const myRides = allRides.filter(r => sameName(r.creatorName, currentUser.name));
  let totalPending = 0;
  myRides.forEach(r => {
    if (r.pendingRequests) {
      totalPending += r.pendingRequests.split(',').filter(p => p.trim().length > 0).length;
    }
  });

  const tabBadge = document.getElementById('activity-tab-badge');
  if (tabBadge) {
    if (totalPending > 0) {
      tabBadge.textContent = totalPending;
      tabBadge.style.display = 'inline-block';
    } else {
      tabBadge.style.display = 'none';
    }
  }

  const actCount = document.getElementById('activity-pending-count');
  if (actCount) actCount.textContent = totalPending;
}

function renderRides(rides) {
  const container = document.getElementById('rides-container');
  const vehicleFilter = document.getElementById('filter-vehicle')?.value || 'all';
  const roleFilter    = document.getElementById('filter-role')?.value    || 'all';

  let filtered = rides;
  if (vehicleFilter !== 'all') filtered = filtered.filter(r => r.vehicle?.toLowerCase().includes(vehicleFilter.toLowerCase()));
  if (roleFilter !== 'all')    filtered = filtered.filter(r => r.creatorRole === roleFilter);

  updateDriverNotifications();

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-car-side"></i><h3>No rides found</h3><p>Be the first to offer a ride!</p></div>';
    return;
  }

  container.innerHTML = filtered.map(r => rideCardHTML(r)).join('');
  // Bind delete and join buttons
  container.querySelectorAll('.delete-ride-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRide(btn.dataset.id));
  });
  container.querySelectorAll('.join-ride-btn').forEach(btn => {
    btn.addEventListener('click', () => openJoinRideModal(btn.dataset.id));
  });
}

function rideCardHTML(ride, showDelete = false) {
  const isMine = currentUser && sameName(ride.creatorName, currentUser.name);
  const initials = ride.creatorName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const isShown  = isMine || showDelete;
  const roleClass = ride.creatorRole === 'Faculty' ? ' faculty' : '';
  const isFull = ride.seats <= 0 || ride.status === 'FULL';
  const isJoined = currentUser && ride.passengers && ride.passengers.split(',').map(p=>p.trim().toLowerCase()).includes(currentUser.name.trim().toLowerCase());
  const isPending = currentUser && ride.pendingRequests && ride.pendingRequests.split(',').map(p=>p.trim().toLowerCase()).includes(currentUser.name.trim().toLowerCase());
  const pendingCount = ride.pendingRequests ? ride.pendingRequests.split(',').filter(p=>p.trim().length > 0).length : 0;

  let actionBtnHTML = '';
  if (isMine) {
    actionBtnHTML = `<button class="btn btn-secondary join-ride-btn" data-id="${ride.id}" style="flex:1;justify-content:center;font-size:0.82rem;position:relative;${pendingCount > 0 ? 'border-color:var(--accent-amber);color:var(--accent-amber);font-weight:700;' : ''}">
      <i class="fa-solid fa-users-viewfinder"></i> Manage Requests (${ride.seats} seat${ride.seats !== 1 ? 's' : ''} left)
      ${pendingCount > 0 ? `<span style="background:var(--accent-amber);color:#000;font-size:0.65rem;font-weight:800;padding:2px 7px;border-radius:10px;margin-left:6px;animation:pulse-dot 1.5s infinite;">${pendingCount} NEW</span>` : ''}
    </button>`;
  } else if (isJoined) {
    actionBtnHTML = `<button class="btn btn-emerald join-ride-btn" data-id="${ride.id}" style="flex:1;justify-content:center;font-size:0.82rem;">
      <i class="fa-solid fa-circle-check"></i> Seat Confirmed (View)
    </button>`;
  } else if (isPending) {
    actionBtnHTML = `<button class="btn btn-secondary join-ride-btn" data-id="${ride.id}" style="flex:1;justify-content:center;font-size:0.82rem;color:var(--accent-amber);border-color:rgba(245,158,11,0.5);">
      <i class="fa-solid fa-clock"></i> Request Pending (View)
    </button>`;
  } else if (isFull) {
    actionBtnHTML = `<button class="btn btn-secondary" disabled style="flex:1;justify-content:center;font-size:0.82rem;opacity:0.6;cursor:not-allowed;">
      <i class="fa-solid fa-user-slash"></i> Ride Fully Booked
    </button>`;
  } else {
    actionBtnHTML = `<button class="btn btn-emerald join-ride-btn" data-id="${ride.id}" style="flex:1;justify-content:center;font-size:0.82rem;">
      <i class="fa-solid fa-user-plus"></i> Request to Join (${ride.seats} seat${ride.seats !== 1 ? 's' : ''} left)
    </button>`;
  }

  return `<div class="ride-card" data-id="${ride.id}">
    <div class="ride-card-header">
      <div class="creator-info">
        <div class="creator-avatar">${initials}</div>
        <div>
          <div class="creator-name">${escHtml(ride.creatorName)}</div>
          <span class="creator-role-badge${roleClass}">${escHtml(ride.creatorRole || 'Student')}</span>
        </div>
      </div>
      <div class="vehicle-badge"><i class="fa-solid fa-${ride.vehicle?.toLowerCase() === 'bike' ? 'motorcycle' : 'car'}"></i> ${escHtml(ride.vehicle || 'Car')}</div>
    </div>
    <div class="route-display">
      <div class="route-point">
        <span class="route-label">From</span>
        <span class="route-value">${escHtml(ride.fromLocation)}</span>
      </div>
      <div class="route-arrow"><i class="fa-solid fa-arrow-right"></i></div>
      <div class="route-point">
        <span class="route-label">To</span>
        <span class="route-value">${escHtml(ride.destination)}</span>
      </div>
    </div>
    <div class="ride-meta">
      ${ride.dateTime ? `<span class="meta-chip time"><i class="fa-solid fa-clock"></i>${escHtml(ride.dateTime)}</span>` : ''}
      <span class="meta-chip seats"><i class="fa-solid fa-users"></i>${ride.seats} seat${ride.seats !== 1 ? 's' : ''} remaining</span>
      ${ride.fuelCost > 0 ? `<span class="meta-chip" style="background:rgba(245,158,11,0.15);color:var(--accent-amber);border:1px solid rgba(245,158,11,0.3);"><i class="fa-solid fa-indian-rupee-sign"></i>${Math.round(ride.fuelCost / (ride.seats + 1))}/person</span>` : ''}
    </div>
    ${ride.notes ? `<div class="ride-notes"><i class="fa-solid fa-note-sticky"></i> ${escHtml(ride.notes)}</div>` : ''}
    <div class="ride-card-actions">
      ${actionBtnHTML}
      ${isShown ? `<button class="delete-ride-btn delete-btn" data-id="${ride.id}" title="Delete this ride"><i class="fa-solid fa-trash"></i></button>` : ''}
    </div>
  </div>`;
}

function openJoinRideModal(rideId) {
  const ride = allRides.find(r => r.id == rideId);
  if (!ride) return;

  const modalBody = document.getElementById('join-ride-modal-body');
  const isMine = currentUser && sameName(ride.creatorName, currentUser.name);
  const isJoined = currentUser && ride.passengers && ride.passengers.split(',').map(p=>p.trim().toLowerCase()).includes(currentUser.name.trim().toLowerCase());
  const isPending = currentUser && ride.pendingRequests && ride.pendingRequests.split(',').map(p=>p.trim().toLowerCase()).includes(currentUser.name.trim().toLowerCase());

  // Parse confirmed passengers
  const confirmedPassengers = ride.passengers ? ride.passengers.split(',').map(p=>p.trim()).filter(p=>p.length > 0) : [];
  // Parse pending requests
  const pendingList = ride.pendingRequests ? ride.pendingRequests.split(',').map(p=>p.trim()).filter(p=>p.length > 0) : [];

  let passengersListHTML = '';
  if (confirmedPassengers.length > 0) {
    passengersListHTML = confirmedPassengers.map(p => {
      let removeBtn = '';
      if (isMine) {
        removeBtn = `<button class="btn btn-danger remove-confirmed-btn" data-ride-id="${ride.id}" data-passenger="${escHtml(p)}" style="padding:0.15rem 0.4rem;font-size:0.65rem;border-radius:4px;margin-left:0.3rem;" title="Remove Passenger"><i class="fa-solid fa-xmark"></i></button>`;
      }
      return `<span class="meta-chip" style="background:rgba(16,185,129,0.15);color:var(--accent-emerald);border:1px solid rgba(16,185,129,0.3);margin:0.2rem;display:inline-flex;align-items:center;">
        <i class="fa-solid fa-user-check"></i> ${escHtml(p)} ${removeBtn}
      </span>`;
    }).join(' ');
  } else {
    passengersListHTML = '<span style="color:var(--text-muted);font-style:italic;font-size:0.85rem;">No confirmed co-passengers yet.</span>';
  }

  // Pending requests section (visible to driver or showing note)
  let pendingSectionHTML = '';
  if (isMine) {
    if (pendingList.length > 0) {
      pendingSectionHTML = `
      <div style="background:rgba(245,158,11,0.08);border:1px dashed rgba(245,158,11,0.3);border-radius:10px;padding:0.85rem;margin-bottom:1rem;">
        <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:0.5rem;color:var(--accent-amber);">
          <i class="fa-solid fa-user-clock"></i> Pending Join Requests (${pendingList.length})
        </label>
        <div style="display:flex;flex-direction:column;gap:0.5rem;">
          ${pendingList.map(p => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-card);padding:0.5rem 0.75rem;border-radius:8px;border:1px solid var(--border-subtle);">
              <span style="font-size:0.85rem;font-weight:600;color:var(--text-main);"><i class="fa-solid fa-user"></i> ${escHtml(p)}</span>
              <div style="display:flex;gap:0.4rem;">
                <button class="btn btn-emerald accept-passenger-btn" data-ride-id="${ride.id}" data-passenger="${escHtml(p)}" style="padding:0.35rem 0.65rem;font-size:0.75rem;">
                  <i class="fa-solid fa-check"></i> Accept
                </button>
                <button class="btn btn-danger decline-passenger-btn" data-ride-id="${ride.id}" data-passenger="${escHtml(p)}" style="padding:0.35rem 0.65rem;font-size:0.75rem;">
                  <i class="fa-solid fa-xmark"></i> Decline
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
    } else {
      pendingSectionHTML = `
      <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:0.75rem;margin-bottom:1rem;font-size:0.82rem;color:var(--text-muted);text-align:center;">
        <i class="fa-solid fa-circle-info"></i> No pending join requests from students right now.
      </div>`;
    }
  }

  const phone = ride.contactPhone?.trim() || '';
  const hasPhone = phone.length > 0;
  const rawDigits = phone.replace(/[^0-9]/g, '');
  const whatsappUrl = hasPhone ? `https://wa.me/${rawDigits}?text=${encodeURIComponent(`Hi ${ride.creatorName}, I joined your coRide offer from ${ride.fromLocation} to ${ride.destination}!`)}` : '#';
  const telUrl = hasPhone ? `tel:${phone}` : '#';

  modalBody.innerHTML = `
    <div style="background:var(--bg-card2);padding:1rem;border-radius:12px;border:1px solid var(--border-card);margin-bottom:1rem;">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
        <div class="creator-avatar">${ride.creatorName.slice(0,2).toUpperCase()}</div>
        <div>
          <div style="font-weight:700;font-size:1.1rem;">${escHtml(ride.creatorName)}</div>
          <div style="font-size:0.8rem;color:var(--accent-primary);"><i class="fa-solid fa-shield-check"></i> Verified Campus ${escHtml(ride.creatorRole || 'Driver')}</div>
        </div>
      </div>
      <div class="route-display" style="margin-bottom:0.75rem;">
        <div class="route-point">
          <span class="route-label">Pickup</span>
          <span class="route-value">${escHtml(ride.fromLocation)}</span>
        </div>
        <div class="route-arrow"><i class="fa-solid fa-arrow-right"></i></div>
        <div class="route-point">
          <span class="route-label">Destination</span>
          <span class="route-value">${escHtml(ride.destination)}</span>
        </div>
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;font-size:0.85rem;color:var(--text-secondary);">
        <span><i class="fa-solid fa-clock" style="color:var(--accent-primary);"></i> ${escHtml(ride.dateTime)}</span>
        <span>•</span>
        <span><i class="fa-solid fa-car" style="color:var(--accent-emerald);"></i> ${escHtml(ride.vehicle || 'Car')}</span>
        <span>•</span>
        <span><i class="fa-solid fa-chair" style="color:var(--accent-amber);"></i> ${ride.seats} seat${ride.seats !== 1 ? 's' : ''} left</span>
        ${ride.fuelCost > 0 ? `<span>•</span><span style="color:var(--accent-amber);font-weight:700;"><i class="fa-solid fa-indian-rupee-sign"></i> ${Math.round(ride.fuelCost / (ride.seats + 1))}/person (Total: ₹${ride.fuelCost})</span>` : ''}
      </div>
    </div>

    ${pendingSectionHTML}

    <div style="margin-bottom:1rem;">
      <label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:0.4rem;color:var(--text-secondary);">
        <i class="fa-solid fa-users"></i> Confirmed Passengers
      </label>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">
        ${passengersListHTML}
      </div>
    </div>

    <div style="background:rgba(99,102,241,0.08);padding:0.85rem;border-radius:10px;border:1px dashed var(--border-card);margin-bottom:1.25rem;">
      <div style="font-weight:700;font-size:0.85rem;color:var(--accent-primary);margin-bottom:0.4rem;">
        <i class="fa-solid fa-address-book"></i> Driver Direct Contact Info
      </div>
      <div style="font-size:0.85rem;color:var(--text-main);display:flex;flex-direction:column;gap:0.3rem;">
        <div><strong>Driver:</strong> ${escHtml(ride.creatorName)} (${escHtml(ride.creatorRole || 'Faculty/Student')})</div>
        <div><strong>Contact Phone / WhatsApp:</strong> ${hasPhone ? `<strong style="color:var(--accent-emerald);">${escHtml(phone)}</strong>` : '<span style="color:var(--accent-amber);font-style:italic;">Not provided by driver</span>'}</div>
      </div>
    </div>

    <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
      ${!isMine && !isJoined && !isPending && ride.seats > 0 ? `
        <button class="btn btn-emerald shine-effect" style="flex:1;" id="confirm-join-btn">
          <i class="fa-solid fa-paper-plane"></i> Send Join Request to Driver
        </button>
      ` : ''}
      ${isPending ? `
        <div style="flex:1;text-align:center;padding:0.6rem;background:rgba(245,158,11,0.15);color:var(--accent-amber);border-radius:8px;font-weight:600;">
          <i class="fa-solid fa-hourglass-half"></i> Request Pending Driver Approval
        </div>
        <button class="btn btn-danger shine-effect" style="flex:1;" id="cancel-join-btn">
          <i class="fa-solid fa-xmark-circle"></i> Cancel Join Request
        </button>
      ` : ''}
      ${isJoined ? `
        <div style="flex:1;text-align:center;padding:0.6rem;background:rgba(16,185,129,0.15);color:var(--accent-emerald);border-radius:8px;font-weight:600;">
          <i class="fa-solid fa-circle-check"></i> Driver Accepted! Your Seat is Confirmed
        </div>
        <button class="btn btn-danger shine-effect" style="flex:1;" id="cancel-join-btn">
          <i class="fa-solid fa-xmark-circle"></i> Cancel Confirmed Seat
        </button>
      ` : ''}
      ${hasPhone && (isMine || isJoined) ? `
        <a href="${whatsappUrl}" target="_blank" class="btn btn-secondary" style="justify-content:center;text-decoration:none;">
          <i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> WhatsApp Driver
        </a>
        <a href="${telUrl}" class="btn btn-secondary" style="justify-content:center;text-decoration:none;">
          <i class="fa-solid fa-phone" style="color:var(--accent-primary);"></i> Call
        </a>
      ` : ''}
    </div>
  `;

  openModal('modal-join-ride');

  const confirmBtn = document.getElementById('confirm-join-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => confirmJoinRide(ride.id));
  }
  const cancelBtn = document.getElementById('cancel-join-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => cancelRide(ride.id));
  }

  // Driver action listeners for accepting/declining requests
  modalBody.querySelectorAll('.accept-passenger-btn').forEach(btn => {
    btn.addEventListener('click', () => acceptPassenger(btn.dataset.rideId, btn.dataset.passenger));
  });
  modalBody.querySelectorAll('.decline-passenger-btn').forEach(btn => {
    btn.addEventListener('click', () => declinePassenger(btn.dataset.rideId, btn.dataset.passenger));
  });
  modalBody.querySelectorAll('.remove-confirmed-btn').forEach(btn => {
    btn.addEventListener('click', () => removePassengerByDriver(btn.dataset.rideId, btn.dataset.passenger));
  });
}

async function acceptPassenger(rideId, passengerName) {
  const { ok, data, error } = await apiRequest(`${API.rides}/${rideId}/accept-passenger`, 'POST', {
    passengerName: passengerName
  });
  if (ok) {
    showToast(data.message || `Accepted ${passengerName}!`, 'success');
    await loadRides();
    openJoinRideModal(rideId);
  } else {
    showToast(data?.error || error || 'Failed to accept passenger.', 'error');
  }
}

async function declinePassenger(rideId, passengerName) {
  if (!confirm(`Decline join request from ${passengerName}?`)) return;
  const { ok, data, error } = await apiRequest(`${API.rides}/${rideId}/decline-passenger`, 'POST', {
    passengerName: passengerName
  });
  if (ok) {
    showToast(data.message || `Declined request from ${passengerName}.`, 'info');
    await loadRides();
    openJoinRideModal(rideId);
  } else {
    showToast(data?.error || error || 'Failed to decline request.', 'error');
  }
}

async function removePassengerByDriver(rideId, passengerName) {
  if (!confirm(`Remove ${passengerName} from your ride?`)) return;
  const { ok, data, error } = await apiRequest(`${API.rides}/${rideId}/cancel`, 'POST', {
    passengerName: passengerName
  });
  if (ok) {
    showToast(`${passengerName} removed from ride.`, 'info');
    await loadRides();
    openJoinRideModal(rideId);
  } else {
    showToast(data?.error || error || 'Failed to remove passenger.', 'error');
  }
}

async function cancelRide(rideId) {
  if (!currentUser) {
    closeModal('modal-join-ride');
    showToast('Please verify first.', 'warning');
    openModal('modal-verify');
    return;
  }
  const { ok, data, error } = await apiRequest(`${API.rides}/${rideId}/cancel`, 'POST', {
    passengerName: currentUser.name
  });
  if (ok) {
    showToast(data.message || 'Request cancelled.', 'success');
    closeModal('modal-join-ride');
    loadRides();
  } else {
    showToast(data?.error || error || 'Failed to cancel.', 'error');
  }
}

async function confirmJoinRide(rideId) {
  if (!currentUser) {
    closeModal('modal-join-ride');
    showToast('Please complete verification first!', 'warning');
    openModal('manual-modal');
    return;
  }

  const { ok, data, error } = await apiRequest(`${API.rides}/${rideId}/join`, 'POST', {
    passengerName: currentUser.name
  });

  if (ok) {
    showToast(data.message || 'Join request submitted! Awaiting driver approval.', 'success');
    closeModal('modal-join-ride');
    loadRides();
  } else {
    showToast(data?.error || error || 'Failed to send join request.', 'error');
  }
}

async function deleteRide(id) {
  if (!confirm('Delete this ride offer?')) return;
  const { ok } = await apiRequest(`${API.rides}/${id}`, 'DELETE');
  if (ok) { showToast('Ride deleted.', 'success'); loadRides(); renderMyActivity(); }
  else showToast('Failed to delete ride.', 'error');
}

/* =============================================================
   REQUESTS: LOAD & RENDER
============================================================= */
async function loadRequests() {
  const container = document.getElementById('requests-container');
  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);"><div class="spinner" style="border-top-color:var(--accent-emerald);width:36px;height:36px;border-width:3px;margin:0 auto 1rem;"></div><p>Loading requests…</p></div>';

  const { ok, data } = await apiRequest(API.requests);
  allRequests = ok ? (data || []) : [];

  const badge = document.getElementById('requests-count-badge');
  if (badge) badge.textContent = allRequests.length;

  renderRequests(allRequests);
}

function renderRequests(requests) {
  const container = document.getElementById('requests-container');
  if (!container) return;
  if (!requests.length) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-hands-holding"></i><h3>No ride requests yet</h3><p>Post your travel need to find a driver!</p></div>';
    return;
  }
  container.innerHTML = requests.map(r => requestCardHTML(r)).join('');
  container.querySelectorAll('.delete-req-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRequest(btn.dataset.id));
  });
  container.querySelectorAll('.accept-req-btn').forEach(btn => {
    btn.addEventListener('click', () => handleRequestAction(btn.dataset.id, btn.dataset.action));
  });
}

async function handleRequestAction(reqId, action) {
  if (!currentUser) {
    showToast('Please verify your identity first!', 'warning');
    openModal('manual-modal');
    return;
  }

  if (action === 'accept') {
    // Find the driver's own ride to prefill vehicle and contact
    const myRide = allRides.find(r => r.creatorName === currentUser.name);
    const driverContact = myRide?.contactPhone || currentUser.phone || '';
    const driverVehicle = myRide?.vehicle || '';

    const { ok, data } = await apiRequest(`${API.requests}/${reqId}/accept`, 'POST', {
      driverName:    currentUser.name,
      driverContact: driverContact,
      driverVehicle: driverVehicle
    });

    if (ok) {
      showToast(data.message || 'You accepted the ride request! 🤝', 'success');
      await loadRequests();
      renderMyActivity();
    } else {
      showToast(data?.error || 'Failed to accept request.', 'error');
    }

  } else if (action === 'decline') {
    if (!confirm('Revoke your acceptance? The request will go back to Open.')) return;

    const { ok, data } = await apiRequest(`${API.requests}/${reqId}/decline`, 'POST', {
      driverName: currentUser.name
    });

    if (ok) {
      showToast('Acceptance revoked. Request is open again.', 'info');
      await loadRequests();
      renderMyActivity();
    } else {
      showToast(data?.error || 'Failed to revoke.', 'error');
    }
  }
}

function requestCardHTML(req, showDelete = false) {
  const isMine = currentUser && req.requesterName === currentUser.name;
  const isDriver = currentUser && !isMine; // Any other verified user is a potential driver
  const initials = req.requesterName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const roleClass = req.requesterRole === 'Faculty' ? ' faculty' : '';
  const isShown = isMine || showDelete;
  const isAccepted = req.status === 'ACCEPTED';
  const iAccepted = isAccepted && currentUser && req.acceptedBy === currentUser.name;

  // Status badge
  let statusBadge = '';
  if (isAccepted) {
    statusBadge = `<span style="background:rgba(16,185,129,0.15);color:var(--accent-emerald);border:1px solid rgba(16,185,129,0.3);padding:0.2rem 0.65rem;border-radius:20px;font-size:0.7rem;font-weight:700;">
      <i class="fa-solid fa-circle-check"></i> Accepted by ${escHtml(req.acceptedBy)}
    </span>`;
  } else {
    statusBadge = `<span style="background:rgba(99,102,241,0.1);color:var(--accent-primary);border:1px solid rgba(99,102,241,0.25);padding:0.2rem 0.65rem;border-radius:20px;font-size:0.7rem;font-weight:700;">
      <i class="fa-solid fa-circle-dot"></i> Open
    </span>`;
  }

  // Driver contact section (visible to requester when accepted)
  let contactSection = '';
  if (isMine && isAccepted) {
    const phone = req.driverContact || '';
    const hasPhone = phone.length > 0;
    const rawDigits = phone.replace(/[^0-9]/g, '');
    const waUrl = hasPhone ? `https://wa.me/${rawDigits}?text=${encodeURIComponent(`Hi ${req.acceptedBy}, I'm ${req.requesterName}. You accepted my coRide request from ${req.fromLocation} to ${req.destination}!`)}` : '#';
    contactSection = `
    <div style="background:rgba(16,185,129,0.08);border:1px dashed rgba(16,185,129,0.3);border-radius:10px;padding:0.85rem;margin:0.75rem 0;">
      <div style="font-size:0.78rem;font-weight:700;color:var(--accent-emerald);margin-bottom:0.5rem;"><i class="fa-solid fa-circle-check"></i> Driver has accepted your request!</div>
      <div style="font-size:0.82rem;color:var(--text-main);margin-bottom:0.3rem;"><strong>Driver:</strong> ${escHtml(req.acceptedBy)}</div>
      ${req.driverVehicle ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.3rem;"><strong>Vehicle:</strong> ${escHtml(req.driverVehicle)}</div>` : ''}
      ${hasPhone ? `<div style="font-size:0.82rem;color:var(--accent-emerald);font-weight:700;"><i class="fa-solid fa-phone"></i> ${escHtml(phone)}</div>
      <div style="display:flex;gap:0.5rem;margin-top:0.65rem;">
        <a href="${waUrl}" target="_blank" class="btn btn-emerald" style="font-size:0.78rem;padding:0.4rem 0.85rem;text-decoration:none;justify-content:center;">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp Driver
        </a>
        <a href="tel:${phone}" class="btn btn-secondary" style="font-size:0.78rem;padding:0.4rem 0.85rem;text-decoration:none;justify-content:center;">
          <i class="fa-solid fa-phone"></i> Call
        </a>
      </div>` : '<div style="font-size:0.78rem;color:var(--accent-amber);">No contact number provided — reach out via campus directory.</div>'}
    </div>`;
  }

  // Action buttons
  let actionBtns = '';
  if (!currentUser) {
    actionBtns = `<button class="btn btn-secondary" style="flex:1;justify-content:center;font-size:0.82rem;" onclick="showToast('Verify your identity to offer a seat!','warning')">
      <i class="fa-solid fa-envelope"></i> Offer a Seat
    </button>`;
  } else if (isMine) {
    // Requester sees nothing extra (they see contact section above if accepted)
    actionBtns = '';
  } else if (isAccepted && !iAccepted) {
    // Another driver — already accepted by someone else
    actionBtns = `<button class="btn btn-secondary" disabled style="flex:1;justify-content:center;font-size:0.82rem;opacity:0.6;cursor:not-allowed;">
      <i class="fa-solid fa-user-check"></i> Already Accepted
    </button>`;
  } else if (iAccepted) {
    // I'm the driver who accepted — can revoke
    actionBtns = `<button class="btn btn-danger accept-req-btn" data-action="decline" data-id="${req.id}" style="flex:1;justify-content:center;font-size:0.82rem;">
      <i class="fa-solid fa-xmark-circle"></i> Revoke Acceptance
    </button>`;
  } else {
    // Open request — driver can accept
    actionBtns = `<button class="btn btn-emerald accept-req-btn shine-effect" data-action="accept" data-id="${req.id}" style="flex:1;justify-content:center;font-size:0.82rem;">
      <i class="fa-solid fa-handshake"></i> Accept & Offer Seat
    </button>`;
  }

  return `<div class="request-card" data-id="${req.id}" style="${isAccepted ? 'border-color:rgba(16,185,129,0.3);' : ''}">
    <div class="req-header">
      <div class="creator-info">
        <div class="creator-avatar" style="background:linear-gradient(135deg,var(--accent-emerald),#34d399)">${initials}</div>
        <div>
          <div class="creator-name">${escHtml(req.requesterName)}</div>
          <span class="creator-role-badge${roleClass}">${escHtml(req.requesterRole || 'Student')}</span>
        </div>
      </div>
      ${statusBadge}
    </div>
    <div class="req-route"><i class="fa-solid fa-route"></i> ${escHtml(req.fromLocation)} → ${escHtml(req.destination)}</div>
    <div class="req-meta">
      ${req.dateTime ? `<span class="meta-chip time"><i class="fa-solid fa-clock"></i>${escHtml(req.dateTime)}</span>` : ''}
    </div>
    ${req.notes ? `<div class="req-notes"><i class="fa-solid fa-note-sticky"></i> ${escHtml(req.notes)}</div>` : ''}
    ${contactSection}
    <div style="display:flex;gap:0.6rem;margin-top:1rem;">
      ${actionBtns}
      ${isShown ? `<button class="delete-req-btn delete-btn" data-id="${req.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>` : ''}
    </div>
  </div>`;
}


async function deleteRequest(id) {
  if (!confirm('Delete this travel request?')) return;
  const { ok } = await apiRequest(`${API.requests}/${id}`, 'DELETE');
  if (ok) { showToast('Request deleted.', 'success'); loadRequests(); renderMyActivity(); }
  else showToast('Failed to delete request.', 'error');
}

/* =============================================================
   MY ACTIVITY TAB
============================================================= */
function renderMyActivity() {
  const offersContainer   = document.getElementById('my-offers-container');
  const requestsContainer = document.getElementById('my-requests-container');
  const pendingBlock      = document.getElementById('driver-pending-block');
  const incomingContainer = document.getElementById('my-incoming-requests-container');
  if (!offersContainer || !requestsContainer) return;

  if (!currentUser) {
    const msg = '<div class="empty-state"><i class="fa-solid fa-user-lock"></i><h3>Verify first</h3><p>Login to view your activity.</p></div>';
    offersContainer.innerHTML = msg;
    requestsContainer.innerHTML = msg;
    if (pendingBlock) pendingBlock.style.display = 'none';
    return;
  }

  const myRides    = allRides.filter(r => sameName(r.creatorName, currentUser.name));
  const myRequests = allRequests.filter(r => sameName(r.requesterName, currentUser.name));

  // Render incoming requests across all of driver's rides
  if (pendingBlock && incomingContainer) {
    let pendingCardsHTML = '';
    let totalPending = 0;

    myRides.forEach(ride => {
      if (ride.pendingRequests) {
        const pList = ride.pendingRequests.split(',').map(p=>p.trim()).filter(p=>p.length > 0);
        totalPending += pList.length;
        pList.forEach(passenger => {
          pendingCardsHTML += `
            <div style="background:var(--bg-card2);border:1px solid var(--border-card);border-left:4px solid var(--accent-amber);border-radius:12px;padding:1rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
              <div>
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
                  <span style="font-weight:700;font-size:1rem;color:#fff;"><i class="fa-solid fa-user-clock" style="color:var(--accent-amber);margin-right:4px;"></i> ${escHtml(passenger)}</span>
                  <span style="font-size:0.72rem;background:rgba(245,158,11,0.15);color:var(--accent-amber);padding:2px 8px;border-radius:10px;font-weight:700;">Wants to Join</span>
                </div>
                <div style="font-size:0.82rem;color:var(--text-muted);">
                  <i class="fa-solid fa-route"></i> <strong>${escHtml(ride.fromLocation)}</strong> → <strong>${escHtml(ride.destination)}</strong> (${escHtml(ride.dateTime || 'Scheduled')})
                </div>
              </div>
              <div style="display:flex;gap:0.5rem;">
                <button class="btn btn-emerald accept-passenger-btn shine-effect" data-ride-id="${ride.id}" data-passenger="${escHtml(passenger)}" style="font-size:0.82rem;padding:0.5rem 1rem;">
                  <i class="fa-solid fa-check"></i> Accept Passenger
                </button>
                <button class="btn btn-danger decline-passenger-btn" data-ride-id="${ride.id}" data-passenger="${escHtml(passenger)}" style="font-size:0.82rem;padding:0.5rem 1rem;">
                  <i class="fa-solid fa-xmark"></i> Decline
                </button>
              </div>
            </div>
          `;
        });
      }
    });

    if (totalPending > 0) {
      pendingBlock.style.display = 'block';
      incomingContainer.innerHTML = pendingCardsHTML;
      // Attach listeners
      incomingContainer.querySelectorAll('.accept-passenger-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await acceptPassenger(btn.dataset.rideId, btn.dataset.passenger);
          renderMyActivity();
        });
      });
      incomingContainer.querySelectorAll('.decline-passenger-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await declinePassenger(btn.dataset.rideId, btn.dataset.passenger);
          renderMyActivity();
        });
      });
    } else {
      pendingBlock.style.display = 'none';
      incomingContainer.innerHTML = '';
    }
  }

  offersContainer.innerHTML = myRides.length
    ? myRides.map(r => rideCardHTML(r, true)).join('')
    : '<div class="empty-state"><i class="fa-solid fa-car-side"></i><h3>No ride offers yet</h3></div>';

  requestsContainer.innerHTML = myRequests.length
    ? myRequests.map(r => requestCardHTML(r, true)).join('')
    : '<div class="empty-state"><i class="fa-solid fa-hands-holding"></i><h3>No requests yet</h3></div>';

  // Bind delete and manage buttons in my-activity
  offersContainer.querySelectorAll('.delete-ride-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRide(btn.dataset.id));
  });
  offersContainer.querySelectorAll('.join-ride-btn').forEach(btn => {
    btn.addEventListener('click', () => openJoinRideModal(btn.dataset.id));
  });
  requestsContainer.querySelectorAll('.delete-req-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRequest(btn.dataset.id));
  });
}

/* =============================================================
   OFFER RIDE FORM
============================================================= */
// Live cost preview
function updateCostPreview() {
  const total = parseFloat(document.getElementById('offer-fuel-cost')?.value || 300);
  const seats = parseInt(document.getElementById('offer-seats')?.value || 3);
  const perPerson = Math.round(total / (seats + 1));
  const totalEl = document.getElementById('calc-total');
  const seatsEl = document.getElementById('calc-seats');
  const ppEl    = document.getElementById('calc-per-person');
  if (totalEl) totalEl.textContent = `₹${total}`;
  if (seatsEl) seatsEl.textContent = `${seats} passenger${seats !== 1 ? 's' : ''} + Driver`;
  if (ppEl)    ppEl.textContent    = `₹${perPerson}/person`;
}
document.getElementById('offer-fuel-cost')?.addEventListener('input', updateCostPreview);
document.getElementById('offer-seats')?.addEventListener('input', updateCostPreview);
updateCostPreview();

// Form submit
document.getElementById('offer-ride-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) { showToast('Please verify your identity first!', 'warning'); openModal('manual-modal'); return; }

  const submitBtn = document.getElementById('offer-submit-btn');
  submitBtn.innerHTML = '<div class="spinner"></div> Publishing…';
  submitBtn.disabled = true;

  const vehicleType  = document.querySelector('input[name="vehicleType"]:checked')?.value || 'Car';
  const vehicleModel = document.getElementById('offer-vehicle-model')?.value?.trim();
  const vehiclePlate = document.getElementById('offer-vehicle-plate')?.value?.trim();
  const vehicle      = `${vehicleType} – ${vehicleModel} (${vehiclePlate})`;

  const contactPhone = document.getElementById('offer-phone')?.value?.trim() || currentUser?.phone || '';

  const fuelCost = parseFloat(document.getElementById('offer-fuel-cost')?.value || 0);
  const totalSeats = parseInt(document.getElementById('offer-seats')?.value || 3);

  const body = {
    creatorName:  currentUser.name,
    creatorRole:  currentUser.role,
    fromLocation: document.getElementById('offer-origin')?.value?.trim(),
    destination:  document.getElementById('offer-destination')?.value?.trim(),
    dateTime:     document.getElementById('offer-time')?.value,
    vehicle,
    seats:        totalSeats,
    notes:        document.getElementById('offer-notes')?.value?.trim(),
    contactPhone,
    fuelCost
  };

  const { ok, data } = await apiRequest(API.rides, 'POST', body);
  submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish Ride Offer';
  submitBtn.disabled = false;

  if (ok) {
    showToast('Ride offer published successfully! 🚗', 'success');
    document.getElementById('offer-ride-form').reset();
    updateCostPreview();
    await loadRides();
    switchTab('rides-tab');
  } else {
    showToast(data?.error || 'Failed to publish ride.', 'error');
  }
});

/* =============================================================
   POST NEED FORM
============================================================= */
document.getElementById('post-need-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) { showToast('Please verify your identity first!', 'warning'); return; }

  const submitBtn = document.getElementById('need-submit-btn');
  submitBtn.innerHTML = '<div class="spinner"></div> Posting…';
  submitBtn.disabled = true;

  const body = {
    requesterName: currentUser.name,
    requesterRole: currentUser.role,
    fromLocation:  document.getElementById('need-origin')?.value?.trim(),
    destination:   document.getElementById('need-destination')?.value?.trim(),
    dateTime:      document.getElementById('need-time')?.value,
    notes:         document.getElementById('need-notes')?.value?.trim(),
  };

  const { ok, data } = await apiRequest(API.requests, 'POST', body);
  submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Broadcast Request to Drivers';
  submitBtn.disabled = false;

  if (ok) {
    showToast('Request posted! Drivers will reach out to you. 📣', 'success');
    document.getElementById('post-need-form').reset();
    closeModal('post-need-modal');
    await loadRequests();
    switchTab('requests-tab');
  } else {
    showToast(data?.error || 'Failed to post request.', 'error');
  }
});

/* =============================================================
   SEARCH & FILTER
============================================================= */
let searchDebounce;
document.getElementById('search-destination')?.addEventListener('input', e => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => loadRides(e.target.value.trim()), 400);
});
document.getElementById('filter-vehicle')?.addEventListener('change', () => renderRides(allRides));
document.getElementById('filter-role')?.addEventListener('change',    () => renderRides(allRides));

/* =============================================================
   MANUAL VERIFICATION
============================================================= */
// Auto-fill dept when register number changes
document.getElementById('verify-register')?.addEventListener('input', async e => {
  const val  = e.target.value.trim();
  const dept = document.getElementById('verify-dept');
  const errEl = document.getElementById('manual-error');
  if (!val || val.length < 6) { if (dept) dept.value = ''; return; }

  // Quick client-side check to avoid too many requests
  if (val.length >= 8) {
    const { ok, data } = await apiRequest(API.validate, 'POST', { input: val });
    if (ok && data.success) {
      if (dept) dept.value = data.department;
      if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    } else if (!ok) {
      if (dept) dept.value = '';
      if (errEl) { errEl.textContent = data?.error || 'Invalid format.'; errEl.style.display = 'block'; }
    }
  }
});

// Live phone validation — show real-time feedback
document.getElementById('verify-phone')?.addEventListener('input', e => {
  const val = e.target.value.replace(/[^0-9]/g, '');
  const hint = document.getElementById('phone-hint');
  const input = e.target;
  // Strip non-digits as user types
  if (e.target.value !== val) e.target.value = val;
  if (val.length === 10) {
    input.style.borderColor = 'var(--accent-emerald)';
    input.style.boxShadow = '0 0 0 2px rgba(16,185,129,0.25)';
    if (hint) { hint.textContent = '✅ Valid 10-digit number'; hint.style.color = 'var(--accent-emerald)'; }
  } else if (val.length > 0) {
    input.style.borderColor = 'var(--accent-rose)';
    input.style.boxShadow = '0 0 0 2px rgba(244,63,94,0.2)';
    if (hint) { hint.textContent = `❌ ${val.length}/10 digits entered`; hint.style.color = 'var(--accent-rose)'; }
  } else {
    input.style.borderColor = '';
    input.style.boxShadow = '';
    if (hint) { hint.textContent = 'Must be exactly 10 digits (no spaces or +91)'; hint.style.color = 'var(--text-muted)'; }
  }
});

document.getElementById('manual-verify-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const name     = document.getElementById('verify-name')?.value?.trim();
  const reg      = document.getElementById('verify-register')?.value?.trim();
  const phone    = document.getElementById('verify-phone')?.value?.trim();
  const role     = document.querySelector('input[name="userRole"]:checked')?.value || 'Student';
  const errEl    = document.getElementById('manual-error');
  const submitBtn = document.getElementById('manual-submit-btn');

  if (!name) { errEl.textContent = 'Please enter your full name.'; errEl.style.display = 'block'; return; }

  // Phone validation — must be exactly 10 digits
  const phoneDigits = phone.replace(/[^0-9]/g, '');
  if (!phone || phoneDigits.length !== 10) {
    errEl.textContent = '⚠️ Please enter a valid 10-digit mobile number.';
    errEl.style.display = 'block';
    document.getElementById('verify-phone')?.focus();
    return;
  }

  submitBtn.innerHTML = '<div class="spinner"></div> Verifying…';
  submitBtn.disabled = true;

  const { ok, data } = await apiRequest(API.verify, 'POST', { name, admissionNo: reg, role, phone: phoneDigits });

  submitBtn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Complete Verification &amp; Enter coRide';
  submitBtn.disabled = false;

  if (ok && data.success) {
    currentUser = data.user;
    currentUser.phone = phoneDigits; // store phone in session
    sessionStorage.setItem('corideUser', JSON.stringify(currentUser));
    closeModal('manual-modal');
    renderUserMenu();
    showToast(`Welcome to coRide, ${currentUser.name}! ✅`, 'success');
    document.getElementById('manual-verify-form')?.reset();
    document.getElementById('verify-dept').value = '';
  } else {
    errEl.textContent = data?.error || 'Verification failed.';
    errEl.style.display = 'block';
  }
});

/* =============================================================
   BARCODE SCANNER
============================================================= */
let cameraRunning = false;
let quaggaStarted = false;

function setScanStatus(text, type = '') {
  const dot  = document.getElementById('scan-dot');
  const span = document.getElementById('scan-status-text');
  if (dot)  { dot.className = 'status-dot'; if (type) dot.classList.add(type); }
  if (span) span.textContent = text;
}

function fillDecodedResult(admissionNo) {
  document.getElementById('scan-admission-input').value = admissionNo;
  document.getElementById('decoded-no').textContent = admissionNo;

  const match = admissionNo.match(/^(\d{2})\/(\d{3})\/([A-Za-z]{2,3})$/);
  if (match) {
    const chipsEl = document.getElementById('decoded-chips');
    chipsEl.style.display = 'flex';
    chipsEl.innerHTML = `
      <span class="d-chip year">Year: 20${match[1]}</span>
      <span class="d-chip no">No: ${match[2]}</span>
      <span class="d-chip branch">Branch: ${match[3].toUpperCase()}</span>`;
    document.getElementById('decoded-sub').textContent = 'Barcode decoded successfully!';
  }
}

// Toggle camera
document.getElementById('toggle-camera-btn')?.addEventListener('click', async () => {
  const btn   = document.getElementById('toggle-camera-btn');
  const video = document.getElementById('webcam-video');
  const port  = document.getElementById('scanner-viewport');

  if (!cameraRunning) {
    setScanStatus('Starting camera…', 'scanning');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      video.classList.remove('hidden');
      cameraRunning = true;
      btn.innerHTML = '<i class="fa-solid fa-video-slash"></i> Stop Camera';

      // Start Quagga live scanning if available
      if (window.Quagga) {
        Quagga.init({
          inputStream: { type: 'LiveStream', target: port, constraints: { facingMode: 'environment' } },
          decoder:     { readers: ['code_128_reader', 'code_39_reader', 'ean_reader'] },
        }, err => {
          if (!err) { Quagga.start(); quaggaStarted = true; }
        });
        Quagga.onDetected(result => {
          const code = result.codeResult.code;
          fillDecodedResult(code);
          setScanStatus('Barcode detected! ✅', 'success');
          showToast('Barcode scanned: ' + code, 'success');
          stopCamera();
        });
      }
      setScanStatus('Camera live – point at ID barcode', 'scanning');
    } catch (err) {
      setScanStatus('Camera access denied', 'error');
      showToast('Camera permission denied. Use file upload instead.', 'warning');
    }
  } else {
    stopCamera();
  }
});

function stopCamera() {
  const video = document.getElementById('webcam-video');
  const btn   = document.getElementById('toggle-camera-btn');
  if (video?.srcObject) { video.srcObject.getTracks().forEach(t => t.stop()); video.srcObject = null; }
  video?.classList.add('hidden');
  if (quaggaStarted) { try { Quagga.stop(); } catch(e){} quaggaStarted = false; }
  cameraRunning = false;
  if (btn) btn.innerHTML = '<i class="fa-solid fa-video"></i> Start Live Webcam';
  setScanStatus('Camera stopped');
}

// Stop camera when modal closes
document.getElementById('scan-modal')?.addEventListener('click', e => {
  if (e.target.id === 'scan-modal') stopCamera();
});
document.querySelector('[data-close="scan-modal"]')?.addEventListener('click', stopCamera);

// Drag & drop / file upload (simulate decode for image upload)
const dragZone = document.getElementById('drag-zone');
const fileInput = document.getElementById('id-file-input');

dragZone?.addEventListener('click', () => fileInput?.click());
dragZone?.addEventListener('dragover', e => { e.preventDefault(); dragZone.classList.add('dragover'); });
dragZone?.addEventListener('dragleave', () => dragZone.classList.remove('dragover'));
dragZone?.addEventListener('drop', e => { e.preventDefault(); dragZone.classList.remove('dragover'); handleImageFile(e.dataTransfer.files[0]); });
fileInput?.addEventListener('change', e => handleImageFile(e.target.files[0]));

function handleImageFile(file) {
  if (!file || !file.type.startsWith('image/')) { showToast('Please upload an image file.', 'error'); return; }
  setScanStatus('Scanning barcode from image…', 'scanning');

  if (window.Quagga) {
    Quagga.decodeSingle({
      src: URL.createObjectURL(file),
      numOfWorkers: 0,
      decoder: { readers: ['code_128_reader', 'code_39_reader', 'ean_reader'] },
    }, result => {
      if (result?.codeResult) {
        fillDecodedResult(result.codeResult.code);
        setScanStatus('Barcode decoded from image! ✅', 'success');
        showToast('Barcode: ' + result.codeResult.code, 'success');
      } else {
        setScanStatus('Could not decode barcode. Enter manually.', 'error');
        showToast('No barcode found in image. Please enter manually.', 'warning');
      }
    });
  } else {
    setScanStatus('Barcode library loading… Please enter manually.', 'error');
    showToast('Enter your admission number manually below.', 'info');
  }
}

// Scan verify button
document.getElementById('scan-verify-btn')?.addEventListener('click', async () => {
  const admNo    = document.getElementById('scan-admission-input')?.value?.trim();
  const name     = document.getElementById('scan-name-input')?.value?.trim();
  const errEl    = document.getElementById('scan-error');
  const btn      = document.getElementById('scan-verify-btn');

  if (!name)   { errEl.textContent = 'Please enter your full name.'; errEl.style.display = 'block'; return; }
  if (!admNo)  { errEl.textContent = 'Please enter or scan your admission number.'; errEl.style.display = 'block'; return; }

  errEl.style.display = 'none';
  btn.innerHTML = '<div class="spinner"></div> Verifying…';
  btn.disabled = true;

  const { ok, data } = await apiRequest(API.barcode, 'POST', { name, barcodeData: admNo, role: 'Student' });

  btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Scan &amp; Complete Verification';
  btn.disabled = false;

  if (ok && data.success) {
    currentUser = data.user;
    sessionStorage.setItem('corideUser', JSON.stringify(currentUser));
    closeModal('scan-modal');
    stopCamera();
    renderUserMenu();
    showToast(`Welcome, ${currentUser.name}! Identity verified ✅`, 'success');
  } else {
    errEl.textContent = data?.error || 'Verification failed.';
    errEl.style.display = 'block';
    setScanStatus('Verification failed', 'error');
  }
});

/* =============================================================
   UTILITY: Escape HTML
============================================================= */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* =============================================================
   INITIAL LOAD & LIVE SYNC
============================================================= */
(async function init() {
  renderUserMenu();
  await Promise.all([loadRides(), loadRequests()]);

  // Periodic background refresh every 6 seconds so requests update automatically in real-time
  setInterval(async () => {
    // Only refresh in background if modal is not open to avoid jarring input disruption
    const modalJoin = document.getElementById('modal-join-ride');
    const isModalOpen = modalJoin && modalJoin.classList.contains('open');

    const [ridesRes, reqsRes] = await Promise.all([
      apiRequest(API.rides),
      apiRequest(API.requests)
    ]);

    if (ridesRes.ok && ridesRes.data) {
      allRides = ridesRes.data;
      // Re-render rides tab if active
      const ridesTab = document.getElementById('rides-tab');
      if (ridesTab && ridesTab.classList.contains('active')) {
        renderRides(allRides);
      } else {
        updateDriverNotifications();
      }
      // Re-render activity tab if active
      const actTab = document.getElementById('activity-tab');
      if (actTab && actTab.classList.contains('active')) {
        renderMyActivity();
      }
    }

    if (reqsRes.ok && reqsRes.data) {
      allRequests = reqsRes.data;
      const badge = document.getElementById('requests-count-badge');
      if (badge) badge.textContent = allRequests.length;
      const reqsTab = document.getElementById('requests-tab');
      if (reqsTab && reqsTab.classList.contains('active')) {
        renderRequests(allRequests);
      }
    }
  }, 6000);
})();
