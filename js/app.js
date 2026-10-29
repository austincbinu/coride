/* ==========================================================================
   coRide Main Application Orchestrator & UI Router
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Auth & Storage
  AuthManager.init();

  // Global Toast Handler
  window.appShowToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  };

  // Render initial list views
  RideManager.renderRidesList();
  RideManager.renderRequestsList();
  RideManager.renderMyTrips();

  // Tab Navigation Handling
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.dataset.tab;

      // Login required for Offer Ride tab
      if (targetTab === 'offer-tab' && !AuthManager.isVerified()) {
        window.appShowToast('Please login first to offer a ride.', 'warning');
        document.getElementById('login-modal')?.classList.add('active');
        return;
      }

      navButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      e.currentTarget.classList.add('active');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active');

      if (targetTab === 'my-trips-tab') {
        RideManager.renderMyTrips();
      }
    });
  });

  // Banner buttons
  document.getElementById('open-login-btn')?.addEventListener('click', () => {
    document.getElementById('login-modal')?.classList.add('active');
  });
  document.getElementById('open-register-btn')?.addEventListener('click', () => {
    document.getElementById('register-modal')?.classList.add('active');
  });

  // Switch between login and register modals
  document.getElementById('switch-to-register')?.addEventListener('click', () => {
    document.getElementById('login-modal')?.classList.remove('active');
    document.getElementById('register-modal')?.classList.add('active');
  });
  document.getElementById('switch-to-login')?.addEventListener('click', () => {
    document.getElementById('register-modal')?.classList.remove('active');
    document.getElementById('login-modal')?.classList.add('active');
  });

  // Modal Close Buttons
  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal-backdrop')?.classList.remove('active');
    });
  });

  // Close modals when clicking backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
      }
    });
  });

  // Register Number auto-fill department in Register modal
  const regInput = document.getElementById('reg-register-no');
  const deptDisplay = document.getElementById('reg-dept-display');
  const regRoleStudent = document.getElementById('reg-role-student');

  regInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    const isStudent = regRoleStudent?.checked;
    if (isStudent && val.length >= 7) {
      const v = AuthManager.validateRegisterNumber(val);
      if (v.isValid && deptDisplay) deptDisplay.textContent = v.deptName;
      else if (deptDisplay) deptDisplay.textContent = '';
    } else if (deptDisplay) {
      deptDisplay.textContent = '';
    }
  });

  document.getElementById('reg-role-student')?.addEventListener('change', () => { if (deptDisplay) deptDisplay.textContent = ''; });
  document.getElementById('reg-role-faculty')?.addEventListener('change', () => { if (deptDisplay) deptDisplay.textContent = ''; });

  // Search & Filters Input Listeners
  const searchInput = document.getElementById('search-destination');
  const vehicleFilter = document.getElementById('filter-vehicle');
  const roleFilter = document.getElementById('filter-role');

  const triggerFilter = () => {
    RideManager.renderRidesList(
      searchInput?.value || '',
      vehicleFilter?.value || 'all',
      roleFilter?.value || 'all'
    );
  };

  searchInput?.addEventListener('input', triggerFilter);
  vehicleFilter?.addEventListener('change', triggerFilter);
  roleFilter?.addEventListener('change', triggerFilter);

  // Reset & Purge Junk Data Button Listener
  document.getElementById('reset-junk-data-btn')?.addEventListener('click', () => {
    resetBoardToCleanData();
    RideManager.renderRidesList();
    RideManager.renderRequestsList();
    RideManager.renderMyTrips();
    window.appShowToast('Board reset. Ready for new verified campus listings!', 'info');
  });

  // Live Cost Split Calculation Input Listeners in Offer Ride Form
  const fuelInput = document.getElementById('offer-fuel-cost');
  const seatsInput = document.getElementById('offer-seats');
  const totalCostDisplay = document.getElementById('calc-total-cost');
  const seatCountDisplay = document.getElementById('calc-seats-count');
  const perPersonDisplay = document.getElementById('calc-per-person');

  const updateCostSplitPreview = () => {
    const totalCost = parseFloat(fuelInput?.value || 0);
    const seats = parseInt(seatsInput?.value || 1);

    if (totalCostDisplay) totalCostDisplay.textContent = `₹${totalCost}`;
    if (seatCountDisplay) seatCountDisplay.textContent = `${seats} passengers + Driver`;

    const splitInfo = RideManager.calculateCostSplit(totalCost, seats, 0);
    if (perPersonDisplay) perPersonDisplay.textContent = `₹${splitInfo.fullCapacityPerPerson} / person`;
  };

  fuelInput?.addEventListener('input', updateCostSplitPreview);
  seatsInput?.addEventListener('input', updateCostSplitPreview);

  // Handle Offer a Ride Form Submission
  const offerForm = document.getElementById('offer-ride-form');
  if (offerForm) {
    offerForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const currentUser = AuthManager.getCurrentUser();
      if (!currentUser || !currentUser.isVerified) {
        window.appShowToast('Please login first before offering a ride!', 'warning');
        document.getElementById('login-modal')?.classList.add('active');
        return;
      }

      const vehicleType = document.querySelector('input[name="vehicleType"]:checked')?.value || 'Car';
      const vehicleModel = document.getElementById('offer-vehicle-model').value;
      const vehiclePlate = document.getElementById('offer-vehicle-plate').value;
      const origin = document.getElementById('offer-origin').value;
      const destination = document.getElementById('offer-destination').value;
      const departureTime = document.getElementById('offer-time').value;
      const seats = parseInt(document.getElementById('offer-seats').value);
      const fuelCost = parseFloat(document.getElementById('offer-fuel-cost').value);
      const phone = document.getElementById('offer-phone').value;
      const notes = document.getElementById('offer-notes').value;

      const newRide = {
        id: `ride-${Date.now()}`,
        driverName: currentUser.name,
        driverRole: currentUser.role,
        registerNumber: currentUser.registerNumber,
        driverDept: currentUser.department,
        driverAvatar: AuthManager.getInitials(currentUser.name),
        isVerified: true,
        vehicleType,
        vehicleModel,
        vehiclePlate,
        origin,
        destination,
        departureTime,
        totalSeats: seats,
        availableSeats: seats,
        totalFuelCost: fuelCost,
        phone,
        notes,
        passengers: [],
        coords: { origin: [28.625, 77.375], destination: [28.638, 77.365] }
      };

      const rides = RideManager.getRides();
      rides.unshift(newRide);
      RideManager.saveRides(rides);

      window.appShowToast('Your ride offer has been published to coRide campus feed!', 'success');
      offerForm.reset();

      // Switch to Available Rides Tab
      document.querySelector('[data-tab="rides-tab"]')?.click();
      RideManager.renderRidesList();
      RideManager.renderMyTrips();
    });
  }

  // ── LOGIN FORM ─────────────────────────────────────────────────────────────
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const errorEl  = document.getElementById('login-error');

      const result = AuthManager.login(username, password);
      if (!result.success) {
        if (errorEl) { errorEl.textContent = result.error; errorEl.style.display = 'block'; }
        return;
      }
      if (errorEl) errorEl.style.display = 'none';
      document.getElementById('login-modal')?.classList.remove('active');
      loginForm.reset();
      window.appShowToast(`Welcome back, ${result.user.name}!`, 'success');
    });
  }

  // ── REGISTER FORM ──────────────────────────────────────────────────────────
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name     = document.getElementById('reg-name').value.trim();
      const username = document.getElementById('reg-username').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirm  = document.getElementById('reg-confirm-password').value;
      const regNo    = document.getElementById('reg-register-no').value.trim();
      const role     = document.querySelector('input[name="reg-role"]:checked')?.value || 'Student';
      const errorEl  = document.getElementById('register-error');

      if (password !== confirm) {
        if (errorEl) { errorEl.textContent = 'Passwords do not match.'; errorEl.style.display = 'block'; }
        return;
      }
      if (password.length < 6) {
        if (errorEl) { errorEl.textContent = 'Password must be at least 6 characters.'; errorEl.style.display = 'block'; }
        return;
      }

      const result = AuthManager.register(name, username, password, regNo, role);
      if (!result.success) {
        if (errorEl) { errorEl.textContent = result.error; errorEl.style.display = 'block'; }
        return;
      }
      if (errorEl) errorEl.style.display = 'none';
      document.getElementById('register-modal')?.classList.remove('active');
      registerForm.reset();
      if (document.getElementById('reg-dept-display')) document.getElementById('reg-dept-display').textContent = '';
      window.appShowToast(`Account created! Welcome to coRide, ${result.user.name}!`, 'success');
    });
  }

  // Handle Post Rider Need Form Trigger & Submission
  document.getElementById('open-post-need-btn')?.addEventListener('click', () => {
    if (!AuthManager.isVerified()) {
      window.appShowToast('Please login first to post a travel request!', 'warning');
      document.getElementById('login-modal')?.classList.add('active');
      return;
    }
    document.getElementById('post-need-modal')?.classList.add('active');
  });

  const needForm = document.getElementById('post-need-form');
  if (needForm) {
    needForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const currentUser = AuthManager.getCurrentUser();
      if (!currentUser || !currentUser.isVerified) {
        window.appShowToast('Please login first!', 'warning');
        document.getElementById('login-modal')?.classList.add('active');
        return;
      }

      const destination = document.getElementById('need-destination').value;
      const origin = document.getElementById('need-origin').value;
      const time = document.getElementById('need-time').value;
      const seats = parseInt(document.getElementById('need-seats').value);
      const phone = document.getElementById('need-phone').value;
      const notes = document.getElementById('need-notes').value;

      const newRequest = {
        id: `req-${Date.now()}`,
        riderName: currentUser.name,
        riderRole: currentUser.role,
        registerNumber: currentUser.registerNumber,
        riderDept: currentUser.department,
        riderAvatar: AuthManager.getInitials(currentUser.name),
        isVerified: true,
        origin,
        destination,
        preferredTime: time,
        seatsNeeded: seats,
        phone,
        notes
      };

      const requests = RideManager.getRequests();
      requests.unshift(newRequest);
      RideManager.saveRequests(requests);

      window.appShowToast('Your travel request has been posted! Drivers can now invite you.', 'success');
      needForm.reset();

      document.getElementById('post-need-modal')?.classList.remove('active');
      RideManager.renderRequestsList();
      RideManager.renderMyTrips();
    });
  }
});
