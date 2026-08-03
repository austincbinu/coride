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
  } else {
    banner.style.display = '';
    menu.innerHTML = `
      <button class="btn btn-primary" id="hdr-verify-btn">
        <i class="fa-solid fa-shield-check"></i> Verify Identity
      </button>`;
    document.getElementById('hdr-verify-btn')?.addEventListener('click', () => openModal('manual-modal'));
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

function renderRides(rides) {
  const container = document.getElementById('rides-container');
  const vehicleFilter = document.getElementById('filter-vehicle')?.value || 'all';
  const roleFilter    = document.getElementById('filter-role')?.value    || 'all';

  let filtered = rides;
  if (vehicleFilter !== 'all') filtered = filtered.filter(r => r.vehicle?.toLowerCase().includes(vehicleFilter.toLowerCase()));
  if (roleFilter !== 'all')    filtered = filtered.filter(r => r.creatorRole === roleFilter);

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
  const isMine = currentUser && ride.creatorName === currentUser.name;
  const initials = ride.creatorName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const isShown  = isMine || showDelete;
  const roleClass = ride.creatorRole === 'Faculty' ? ' faculty' : '';
  const isFull = ride.seats <= 0 || ride.status === 'FULL';

  let actionBtnHTML = '';
  if (isMine) {
    actionBtnHTML = `<button class="btn btn-secondary join-ride-btn" data-id="${ride.id}" style="flex:1;justify-content:center;font-size:0.82rem;">
      <i class="fa-solid fa-users-viewfinder"></i> Manage Passengers (${ride.seats} seat${ride.seats !== 1 ? 's' : ''} left)
    </button>`;
  } else if (isFull) {
    actionBtnHTML = `<button class="btn btn-secondary" disabled style="flex:1;justify-content:center;font-size:0.82rem;opacity:0.6;cursor:not-allowed;">
      <i class="fa-solid fa-user-slash"></i> Ride Fully Booked
    </button>`;
  } else {
    actionBtnHTML = `<button class="btn btn-emerald join-ride-btn" data-id="${ride.id}" style="flex:1;justify-content:center;font-size:0.82rem;">
      <i class="fa-solid fa-user-plus"></i> Join Ride (${ride.seats} seat${ride.seats !== 1 ? 's' : ''} left)
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
  const isMine = currentUser && ride.creatorName === currentUser.name;
  const isJoined = currentUser && ride.passengers && ride.passengers.includes(currentUser.name);

  let passengersListHTML = '';
  if (ride.passengers && ride.passengers.trim()) {
    passengersListHTML = ride.passengers.split(',').map(p => `<span class="meta-chip" style="background:rgba(16,185,129,0.15);color:var(--accent-emerald);border:1px solid rgba(16,185,129,0.3);margin:0.2rem;"><i class="fa-solid fa-user-check"></i> ${escHtml(p.trim())}</span>`).join(' ');
  } else {
    passengersListHTML = '<span style="color:var(--text-muted);font-style:italic;font-size:0.85rem;">No co-passengers joined yet.</span>';
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

    <div style="margin-bottom:1rem;">
      <label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:0.4rem;color:var(--text-secondary);">
        <i class="fa-solid fa-users"></i> Booked Passengers
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
      ${!isMine && !isJoined && ride.seats > 0 ? `
        <button class="btn btn-emerald shine-effect" style="flex:1;" id="confirm-join-btn">
          <i class="fa-solid fa-check-circle"></i> Confirm &amp; Reserve Seat
        </button>
      ` : ''}
      ${isJoined ? `
        <div style="flex:1;text-align:center;padding:0.6rem;background:rgba(16,185,129,0.15);color:var(--accent-emerald);border-radius:8px;font-weight:600;">
          <i class="fa-solid fa-circle-check"></i> You have joined this ride!
        </div>
        <button class="btn btn-danger shine-effect" style="flex:1;" id="cancel-join-btn">
          <i class="fa-solid fa-xmark-circle"></i> Cancel Seat
        </button>
      ` : ''}
      ${hasPhone ? `
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
    showToast(data.message || 'Seat cancelled.', 'success');
    closeModal('modal-join-ride');
    loadRides();
  } else {
    showToast(error || 'Failed to cancel.', 'error');
  }
}

async function confirmJoinRide(rideId) {
  if (!currentUser) {
    closeModal('modal-join-ride');
    showToast('Please complete verification first!', 'warning');
    openModal('modal-verify');
    return;
  }

  const { ok, data, error } = await apiRequest(`${API.rides}/${rideId}/join`, 'POST', {
    passengerName: currentUser.name
  });

  if (ok) {
    showToast(data.message || 'Seat reserved successfully!', 'success');
    closeModal('modal-join-ride');
    loadRides();
  } else {
    showToast(error || 'Failed to join ride.', 'error');
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

  if (!allRequests.length) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-hands-holding"></i><h3>No ride requests yet</h3><p>Post your travel need to find a driver!</p></div>';
    return;
  }
  container.innerHTML = allRequests.map(r => requestCardHTML(r)).join('');
  container.querySelectorAll('.delete-req-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRequest(btn.dataset.id));
  });
}

function requestCardHTML(req, showDelete = false) {
  const isMine = currentUser && req.requesterName === currentUser.name;
  const initials = req.requesterName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const roleClass = req.requesterRole === 'Faculty' ? ' faculty' : '';
  const isShown = isMine || showDelete;

  return `<div class="request-card" data-id="${req.id}">
    <div class="req-header">
      <div class="creator-info">
        <div class="creator-avatar" style="background:linear-gradient(135deg,var(--accent-emerald),#34d399)">${initials}</div>
        <div>
          <div class="creator-name">${escHtml(req.requesterName)}</div>
          <span class="creator-role-badge${roleClass}">${escHtml(req.requesterRole || 'Student')}</span>
        </div>
      </div>
    </div>
    <div class="req-route"><i class="fa-solid fa-route"></i> ${escHtml(req.fromLocation)} → ${escHtml(req.destination)}</div>
    <div class="req-meta">
      ${req.dateTime ? `<span class="meta-chip time"><i class="fa-solid fa-clock"></i>${escHtml(req.dateTime)}</span>` : ''}
    </div>
    ${req.notes ? `<div class="req-notes"><i class="fa-solid fa-note-sticky"></i> ${escHtml(req.notes)}</div>` : ''}
    <div style="display:flex;gap:0.6rem;margin-top:1rem;">
      <button class="btn btn-emerald" style="flex:1;justify-content:center;font-size:0.82rem;" onclick="showToast('Message the requester to offer a seat!','info')">
        <i class="fa-solid fa-envelope"></i> Offer a Seat
      </button>
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
  if (!offersContainer || !requestsContainer) return;

  if (!currentUser) {
    const msg = '<div class="empty-state"><i class="fa-solid fa-user-lock"></i><h3>Verify first</h3><p>Login to view your activity.</p></div>';
    offersContainer.innerHTML = msg;
    requestsContainer.innerHTML = msg;
    return;
  }

  const myRides    = allRides.filter(r => r.creatorName === currentUser.name);
  const myRequests = allRequests.filter(r => r.requesterName === currentUser.name);

  offersContainer.innerHTML = myRides.length
    ? myRides.map(r => rideCardHTML(r, true)).join('')
    : '<div class="empty-state"><i class="fa-solid fa-car-side"></i><h3>No ride offers yet</h3></div>';

  requestsContainer.innerHTML = myRequests.length
    ? myRequests.map(r => requestCardHTML(r, true)).join('')
    : '<div class="empty-state"><i class="fa-solid fa-hands-holding"></i><h3>No requests yet</h3></div>';

  // Bind delete buttons in my-activity
  offersContainer.querySelectorAll('.delete-ride-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRide(btn.dataset.id));
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

document.getElementById('manual-verify-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const name     = document.getElementById('verify-name')?.value?.trim();
  const reg      = document.getElementById('verify-register')?.value?.trim();
  const role     = document.querySelector('input[name="userRole"]:checked')?.value || 'Student';
  const errEl    = document.getElementById('manual-error');
  const submitBtn = document.getElementById('manual-submit-btn');

  if (!name) { errEl.textContent = 'Please enter your full name.'; errEl.style.display = 'block'; return; }

  submitBtn.innerHTML = '<div class="spinner"></div> Verifying…';
  submitBtn.disabled = true;

  const { ok, data } = await apiRequest(API.verify, 'POST', { name, admissionNo: reg, role });

  submitBtn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Complete Verification &amp; Enter coRide';
  submitBtn.disabled = false;

  if (ok && data.success) {
    currentUser = data.user;
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
   INITIAL LOAD
============================================================= */
(async function init() {
  renderUserMenu();
  await Promise.all([loadRides(), loadRequests()]);
})();
