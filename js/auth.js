/* ==========================================================================
   coRide Auth Manager — Login & Register System
   ========================================================================== */

const AuthManager = {
  currentUser: null,

  REGISTER_NO_REGEX: /^TLY\d{2}[A-Za-z]{2}\d{3}$/i,

  BRANCH_ALIASES: {
    'CSE': 'CS', 'CS': 'CS',
    'ECE': 'EC', 'EC': 'EC',
    'EEE': 'EE', 'EE': 'EE',
    'ME':  'ME', 'CE': 'CE',
    'ES':  'ES', 'IT': 'IT'
  },

  ALLOWED_BRANCHES: ['CS', 'ME', 'CE', 'EC', 'EE', 'ES', 'IT'],

  BRANCH_MAP: {
    'CS': 'Computer Science & Engg (CSE)',
    'ME': 'Mechanical Engineering (ME)',
    'CE': 'Civil Engineering (CE)',
    'EC': 'Electronics & Communication Engg (ECE)',
    'EE': 'Electrical & Electronics Engg (EEE)',
    'ES': 'Electronic & Computer Science (ES)',
    'IT': 'Information Technology (IT)'
  },

  validateRegisterNumber(regNo) {
    if (!regNo) return { isValid: false, error: 'Register Number cannot be empty.' };
    const trimmed = regNo.trim().toUpperCase();
    if (!this.REGISTER_NO_REGEX.test(trimmed)) {
      return { isValid: false, error: 'Invalid format. Must be: TLY + 2-digit Year + 2-letter Branch + 3-digit No (e.g. TLY25CS123).' };
    }
    const branchCode = trimmed.substring(5, 7);
    if (!this.ALLOWED_BRANCHES.includes(branchCode)) {
      return { isValid: false, error: `Branch "${branchCode}" not valid. Allowed: ${this.ALLOWED_BRANCHES.join(', ')}.` };
    }
    return { isValid: true, branchCode, deptName: this.BRANCH_MAP[branchCode], registerNumber: trimmed };
  },

  getUsers() {
    return JSON.parse(localStorage.getItem('cc_users')) || [];
  },

  saveUsers(users) {
    localStorage.setItem('cc_users', JSON.stringify(users));
  },

  register(name, username, password, registerNumber, role) {
    const users = this.getUsers();

    if (users.find(u => u.username.toLowerCase() === username.toLowerCase().trim())) {
      return { success: false, error: 'Username already taken. Please choose another.' };
    }

    let department = role;
    let regNoFormatted = registerNumber.toUpperCase();
    if (role === 'Student') {
      const v = this.validateRegisterNumber(registerNumber);
      if (!v.isValid) return { success: false, error: v.error };
      department = v.deptName;
      regNoFormatted = v.registerNumber;
    }

    const newUser = {
      name: name.trim(),
      username: username.toLowerCase().trim(),
      password,
      role,
      registerNumber: regNoFormatted,
      department,
      isVerified: true,
      createdAt: Date.now()
    };

    users.push(newUser);
    this.saveUsers(users);
    this._startSession(newUser);
    return { success: true, user: newUser };
  },

  login(username, password) {
    const users = this.getUsers();
    const user  = users.find(u => u.username === username.toLowerCase().trim());
    if (!user)               return { success: false, error: 'No account found with that username.' };
    if (user.password !== password) return { success: false, error: 'Incorrect password. Please try again.' };
    this._startSession(user);
    return { success: true, user };
  },

  _startSession(user) {
    this.currentUser = { ...user, isVerified: true };
    localStorage.setItem('cc_user', JSON.stringify(this.currentUser));
    this.renderUserNav();
    this.updateBannerVisibility();
    if (typeof RideManager !== 'undefined') {
      RideManager.renderRidesList();
      RideManager.renderRequestsList();
      RideManager.renderMyTrips();
    }
  },

  init() {
    const saved = localStorage.getItem('cc_user');
    this.currentUser = saved ? JSON.parse(saved) : null;
    this.renderUserNav();
    this.updateBannerVisibility();
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('cc_user');
    this.renderUserNav();
    this.updateBannerVisibility();
    if (typeof RideManager !== 'undefined') {
      RideManager.renderRidesList();
      RideManager.renderRequestsList();
      RideManager.renderMyTrips();
    }
    window.appShowToast('Logged out successfully. See you soon!', 'info');
  },

  getCurrentUser() { return this.currentUser; },
  isVerified()     { return !!(this.currentUser && this.currentUser.isVerified); },

  getInitials(name) {
    if (!name) return 'CR';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  },

  updateBannerVisibility() {
    const banner = document.getElementById('verification-banner');
    if (banner) banner.style.display = this.isVerified() ? 'none' : 'grid';
  },

  renderUserNav() {
    const container = document.getElementById('user-menu-container');
    if (!container) return;

    if (this.isVerified()) {
      const u = this.currentUser;
      container.innerHTML = `
        <div class="user-status-card">
          <div class="user-avatar-circle">${this.getInitials(u.name)}</div>
          <div class="user-info-text">
            <span class="user-name-title">${u.name}</span>
            <span class="user-role-badge">
              <i class="fa-solid fa-circle-check"></i> ${u.role} &bull; ${u.registerNumber || u.username}
            </span>
          </div>
          <button class="btn btn-secondary btn-sm" id="logout-user-btn" title="Sign Out" style="padding:0.35rem 0.6rem;">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      `;
      document.getElementById('logout-user-btn')?.addEventListener('click', () => this.logout());
    } else {
      container.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <button class="btn btn-secondary btn-sm" id="nav-login-btn">
            <i class="fa-solid fa-right-to-bracket"></i> Login
          </button>
          <button class="btn btn-emerald shine-effect btn-sm" id="nav-register-btn">
            <i class="fa-solid fa-user-plus"></i> Register
          </button>
        </div>
      `;
      document.getElementById('nav-login-btn')?.addEventListener('click', () => {
        document.getElementById('login-modal')?.classList.add('active');
      });
      document.getElementById('nav-register-btn')?.addEventListener('click', () => {
        document.getElementById('register-modal')?.classList.add('active');
      });
    }
  }
};
