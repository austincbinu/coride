/* ==========================================================================
   coRide Rides, Requests & Automatic Cost-Splitting Engine (Real Student Names)
   ========================================================================== */

const RideManager = {
  activeMap: null,
  activeMarkerGroup: null,

  getRides() {
    const rides = JSON.parse(localStorage.getItem('cc_rides')) || [];
    // Only display verified rides created by real verified users
    return rides.filter(r => r && r.driverName && r.destination && r.isVerified);
  },

  saveRides(rides) {
    localStorage.setItem('cc_rides', JSON.stringify(rides));
  },

  getRequests() {
    const requests = JSON.parse(localStorage.getItem('cc_requests')) || [];
    // Only display verified rider requests created by real verified users
    return requests.filter(req => req && req.riderName && req.destination && req.isVerified);
  },

  saveRequests(requests) {
    localStorage.setItem('cc_requests', JSON.stringify(requests));
  },

  // Automatic Fuel & Trip Cost Splitting Calculator
  calculateCostSplit(totalFuelCost, totalSeats, filledPassengersCount = 0) {
    const currentCommuters = 1 + filledPassengersCount;
    const maxCapacity = 1 + parseInt(totalSeats);
    
    const currentPerPerson = Math.round(totalFuelCost / Math.max(1, currentCommuters));
    const fullCapacityPerPerson = Math.round(totalFuelCost / Math.max(1, maxCapacity));

    return {
      currentPerPerson,
      fullCapacityPerPerson,
      commutersCount: currentCommuters
    };
  },

  // Render All Available Rides (Tab 1)
  renderRidesList(filterDest = '', filterVehicle = 'all', filterRole = 'all') {
    const container = document.getElementById('rides-container');
    if (!container) return;

    // ── Auth Gate: only verified users can see rides ─────────────────────────
    if (!AuthManager.isVerified()) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1.5rem; background: var(--bg-glass-card); border-radius: var(--radius-lg); border:1px solid var(--border-color);">
          <div style="width:72px; height:72px; background:linear-gradient(135deg,rgba(99,102,241,0.18),rgba(16,185,129,0.12)); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1.25rem auto; border:2px solid rgba(99,102,241,0.35);">
            <i class="fa-solid fa-lock" style="font-size:2rem; color:var(--accent-primary);"></i>
          </div>
          <h3 style="font-size:1.5rem; margin-bottom:0.6rem; color:var(--text-main);">Login Required to View Rides</h3>
          <p style="color:var(--text-muted); max-width:440px; margin:0 auto 1.75rem auto; font-size:0.95rem; line-height:1.6;">
            coRide is an exclusive campus community. Verify your identity with your Register Number to browse and join available rides.
          </p>
          <button class="btn btn-primary btn-lg shine-effect" onclick="document.getElementById('manual-modal').classList.add('active')">
            <i class="fa-solid fa-shield-check"></i> Verify &amp; Login Now
          </button>
        </div>
      `;
      return;
    }

    let rides = this.getRides();

    // Filtering logic
    rides = rides.filter(ride => {
      const matchDest = !filterDest || 
        ride.destination.toLowerCase().includes(filterDest.toLowerCase()) || 
        ride.origin.toLowerCase().includes(filterDest.toLowerCase());
      const matchVehicle = filterVehicle === 'all' || ride.vehicleType === filterVehicle;
      const matchRole = filterRole === 'all' || ride.driverRole === filterRole;

      return matchDest && matchVehicle && matchRole;
    });

    if (rides.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 3.5rem 1.5rem; background: var(--bg-glass-card); border-radius: var(--radius-lg); border:1px solid var(--border-color);">
          <i class="fa-solid fa-car-side" style="font-size: 3.5rem; color: var(--accent-primary); margin-bottom: 1.25rem; opacity:0.8;"></i>
          <h3 style="font-size:1.4rem; margin-bottom:0.5rem;">No Active Rides Offered Yet</h3>
          <p style="color: var(--text-muted); max-width:500px; margin:0 auto 1.5rem auto; font-size:0.95rem;">
            Be the first verified student or faculty member to offer a ride on coRide!
          </p>
          <button class="btn btn-primary shine-effect" onclick="document.querySelector('[data-tab=offer-tab]').click();">
            <i class="fa-solid fa-plus-circle"></i> Offer a Ride Now
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = rides.map(ride => {
      const costInfo = this.calculateCostSplit(ride.totalFuelCost, ride.totalSeats, ride.passengers.length);
      const vehicleIcon = ride.vehicleType === 'Car' ? 'fa-car' : 'fa-motorcycle';

      return `
        <div class="ride-card" data-id="${ride.id}">
          <div class="card-top">
            <div class="driver-profile">
              <div class="driver-avatar">${ride.driverAvatar}</div>
              <div class="driver-meta">
                <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-main);">${ride.driverName}</h4>
                <span class="verified-tag"><i class="fa-solid fa-circle-check"></i> ${ride.driverRole} • ${ride.registerNumber || 'Verified'}</span>
              </div>
            </div>
            <div class="vehicle-type-badge">
              <i class="fa-solid ${vehicleIcon}"></i> ${ride.vehicleType}
            </div>
          </div>

          <div class="route-info">
            <div class="route-point origin">
              <i class="fa-solid fa-circle-dot"></i>
              <span><strong>From:</strong> ${ride.origin}</span>
            </div>
            <div class="route-point destination">
              <i class="fa-solid fa-location-dot"></i>
              <span><strong>To:</strong> ${ride.destination}</span>
            </div>
          </div>

          <div class="card-metrics">
            <div class="metric-item">
              <span>DEPARTURE</span>
              <strong>${ride.departureTime}</strong>
            </div>
            <div class="metric-item">
              <span>VACANT SEATS</span>
              <strong style="color: ${ride.availableSeats > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">
                ${ride.availableSeats} of ${ride.totalSeats}
              </strong>
            </div>
            <div class="metric-item">
              <span>PER PERSON</span>
              <strong class="price-tag">₹${costInfo.fullCapacityPerPerson}</strong>
            </div>
          </div>

          <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.4;">
            <i class="fa-solid fa-car-side"></i> <strong>${ride.vehicleModel}</strong> (${ride.vehiclePlate})
          </div>

          <div class="card-footer">
            <button class="btn btn-secondary btn-sm view-ride-details-btn" data-id="${ride.id}">
              <i class="fa-solid fa-circle-info"></i> View Details & Route
            </button>
            <button class="btn btn-primary btn-sm book-ride-btn shine-effect" data-id="${ride.id}" ${ride.availableSeats <= 0 ? 'disabled' : ''}>
              <i class="fa-solid fa-user-plus"></i> ${ride.availableSeats > 0 ? 'Join Ride' : 'Full'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach Event Listeners to cards
    document.querySelectorAll('.view-ride-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.openRideDetailsModal(e.currentTarget.dataset.id));
    });

    document.querySelectorAll('.book-ride-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!AuthManager.isVerified()) {
          window.appShowToast('Verification required! Please scan ID card or enter Register Number first.', 'warning');
          document.getElementById('manual-modal')?.classList.add('active');
          return;
        }
        this.openRideDetailsModal(e.currentTarget.dataset.id, true);
      });
    });
  },

  // Render All Rider Needs (Tab 2)
  renderRequestsList() {
    const container = document.getElementById('requests-container');
    const badge = document.getElementById('requests-count-badge');
    if (!container) return;

    // ── Auth Gate: only verified users can see requests ───────────────────────
    if (!AuthManager.isVerified()) {
      if (badge) badge.textContent = '🔒';
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1.5rem; background: var(--bg-glass-card); border-radius: var(--radius-lg); border:1px solid var(--border-color);">
          <div style="width:72px; height:72px; background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(99,102,241,0.12)); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1.25rem auto; border:2px solid rgba(245,158,11,0.3);">
            <i class="fa-solid fa-lock" style="font-size:2rem; color:var(--accent-amber);"></i>
          </div>
          <h3 style="font-size:1.5rem; margin-bottom:0.6rem; color:var(--text-main);">Login Required to View Requests</h3>
          <p style="color:var(--text-muted); max-width:440px; margin:0 auto 1.75rem auto; font-size:0.95rem; line-height:1.6;">
            Verify your campus identity to view and respond to rider travel requests.
          </p>
          <button class="btn btn-primary btn-lg shine-effect" onclick="document.getElementById('manual-modal').classList.add('active')">
            <i class="fa-solid fa-shield-check"></i> Verify &amp; Login Now
          </button>
        </div>
      `;
      return;
    }

    const requests = this.getRequests();
    if (badge) badge.textContent = requests.length;

    if (requests.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 3.5rem 1.5rem; background: var(--bg-glass-card); border-radius: var(--radius-lg); border:1px solid var(--border-color);">
          <i class="fa-solid fa-hand-holding-hand" style="font-size: 3.5rem; color: var(--accent-amber); margin-bottom: 1.25rem; opacity:0.8;"></i>
          <h3 style="font-size:1.4rem; margin-bottom:0.5rem;">No Pending Rider Needs</h3>
          <p style="color: var(--text-muted); max-width:500px; margin:0 auto 1.5rem auto; font-size:0.95rem;">
            Need a ride? Verify your identity and click "Post Your Travel Need" to broadcast your request!
          </p>
          <button class="btn btn-primary pulse-btn" onclick="document.getElementById('open-post-need-btn')?.click();">
            <i class="fa-solid fa-bullhorn"></i> Post Travel Request
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = requests.map(req => `
      <div class="request-card" data-id="${req.id}">
        <div class="card-top">
          <div class="driver-profile">
            <div class="driver-avatar" style="background: linear-gradient(135deg, var(--accent-amber), #d97706);">${req.riderAvatar}</div>
            <div class="driver-meta">
              <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-main);">${req.riderName}</h4>
              <span class="verified-tag"><i class="fa-solid fa-circle-check"></i> ${req.riderRole} • ${req.registerNumber || req.riderDept}</span>
            </div>
          </div>
          <div class="need-badge"><i class="fa-solid fa-bullhorn"></i> Needs Ride</div>
        </div>

        <div class="route-info">
          <div class="route-point origin">
            <i class="fa-solid fa-circle-dot"></i>
            <span><strong>Pickup:</strong> ${req.origin}</span>
          </div>
          <div class="route-point destination">
            <i class="fa-solid fa-location-dot"></i>
            <span><strong>Heading To:</strong> ${req.destination}</span>
          </div>
        </div>

        <div class="card-metrics">
          <div class="metric-item">
            <span>TIME NEEDED</span>
            <strong>${req.preferredTime}</strong>
          </div>
          <div class="metric-item">
            <span>SEATS NEEDED</span>
            <strong style="color:var(--accent-amber)">${req.seatsNeeded} Seat(s)</strong>
          </div>
          <div class="metric-item">
            <span>CONTACT</span>
            <strong style="font-size:0.75rem; color:var(--text-muted);">${req.phone}</strong>
          </div>
        </div>

        ${req.notes ? `<div style="font-size:0.85rem; color:var(--text-muted); background:rgba(0,0,0,0.2); padding:0.6rem; border-radius:8px;"><i class="fa-solid fa-comment-dots"></i> "${req.notes}"</div>` : ''}

        <div class="card-footer">
          <a href="tel:${req.phone}" class="btn btn-secondary btn-sm">
            <i class="fa-solid fa-phone"></i> Call
          </a>
          <button class="btn btn-emerald btn-sm invite-rider-btn" data-id="${req.id}">
            <i class="fa-solid fa-paper-plane"></i> Invite to My Ride
          </button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.invite-rider-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!AuthManager.isVerified()) {
          window.appShowToast('Verification required! Please verify identity to invite riders.', 'warning');
          document.getElementById('manual-modal')?.classList.add('active');
          return;
        }
        this.openInviteModal(e.currentTarget.dataset.id);
      });
    });
  },

  // Open Detailed Ride Modal
  openRideDetailsModal(rideId, focusBooking = false) {
    const modal = document.getElementById('ride-details-modal');
    const infoCol = document.getElementById('ride-modal-info');
    const bookingCol = document.getElementById('booking-box-container');
    const rides = this.getRides();
    const ride = rides.find(r => r.id === rideId);

    if (!ride || !modal) return;

    const currentUser = AuthManager.getCurrentUser();
    const costInfo = this.calculateCostSplit(ride.totalFuelCost, ride.totalSeats, ride.passengers.length);
    const isAlreadyBooked = ride.passengers.some(p => p.name === currentUser?.name);

    infoCol.innerHTML = `
      <div class="driver-profile" style="margin-bottom: 1.2rem;">
        <div class="driver-avatar" style="width:56px; height:56px; font-size:1.3rem;">${ride.driverAvatar}</div>
        <div>
          <h3 style="font-size:1.25rem; font-weight:700; color:var(--text-main);">${ride.driverName}</h3>
          <span class="verified-tag"><i class="fa-solid fa-shield-check"></i> ${ride.driverRole} • Register: ${ride.registerNumber || 'Verified'}</span>
        </div>
      </div>

      <div class="route-info" style="margin-bottom:1.2rem;">
        <div class="route-point origin">
          <i class="fa-solid fa-circle-dot"></i>
          <span><strong>Pickup Location:</strong> ${ride.origin}</span>
        </div>
        <div class="route-point destination">
          <i class="fa-solid fa-location-dot"></i>
          <span><strong>Destination:</strong> ${ride.destination}</span>
        </div>
      </div>

      <div style="background:rgba(0,0,0,0.3); padding:1rem; border-radius:12px; margin-bottom:1.2rem; display:flex; flex-direction:column; gap:0.6rem;">
        <div><i class="fa-solid fa-car"></i> <strong>Vehicle:</strong> ${ride.vehicleModel} (${ride.vehicleType})</div>
        <div><i class="fa-solid fa-id-badge"></i> <strong>Plate #:</strong> ${ride.vehiclePlate}</div>
        <div><i class="fa-solid fa-clock"></i> <strong>Departure Time:</strong> ${ride.departureTime}</div>
        <div><i class="fa-solid fa-phone"></i> <strong>Driver Mobile:</strong> <a href="tel:${ride.phone}" style="color:var(--accent-primary); font-weight:700;">${ride.phone}</a></div>
        ${ride.notes ? `<div><i class="fa-solid fa-note-sticky"></i> <strong>Trip Notes:</strong> ${ride.notes}</div>` : ''}
      </div>

      <div class="cost-split-preview-card">
        <div class="preview-title"><i class="fa-solid fa-calculator"></i> Transparent Cost Breakdown</div>
        <div class="preview-row">
          <span>Estimated Total Trip Fuel Cost:</span>
          <strong>₹${ride.totalFuelCost}</strong>
        </div>
        <div class="preview-row">
          <span>Split Among Full Capacity (${1 + parseInt(ride.totalSeats)} commuters):</span>
          <strong class="highlight-price">₹${costInfo.fullCapacityPerPerson} / person</strong>
        </div>
        <div class="preview-row" style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">
          <span>Current filled commuters (${costInfo.commutersCount}): ₹${costInfo.currentPerPerson} per person</span>
        </div>
      </div>

      <div style="margin-top:1.2rem;">
        <h4 style="font-size:0.95rem; margin-bottom:0.6rem;"><i class="fa-solid fa-users"></i> Confirmed Passengers (${ride.passengers.length}/${ride.totalSeats}):</h4>
        ${ride.passengers.length === 0 ? '<p style="font-size:0.85rem; color:var(--text-muted);">No passengers joined yet. Be the first!</p>' : 
          ride.passengers.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:0.5rem 0.75rem; border-radius:8px; margin-bottom:0.4rem; font-size:0.85rem;">
              <span><i class="fa-solid fa-user-check" style="color:var(--accent-emerald);"></i> <strong>${p.name}</strong> (${p.registerNumber || p.role})</span>
              <a href="tel:${p.phone}" style="color:var(--text-muted); font-size:0.75rem;"><i class="fa-solid fa-phone"></i> ${p.phone}</a>
            </div>
          `).join('')
        }
      </div>
    `;

    // Render Booking Action Box
    if (isAlreadyBooked) {
      bookingCol.innerHTML = `
        <div style="text-align:center; padding:1rem; color:var(--accent-emerald);">
          <i class="fa-solid fa-circle-check" style="font-size:2.5rem; margin-bottom:0.5rem;"></i>
          <h4>You've Joined This Ride!</h4>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">Contact driver at ${ride.phone} or via WhatsApp when ready for pickup.</p>
        </div>
        <a href="https://wa.me/${ride.phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(ride.driverName)},%20I've%20joined%20your%20coRide%20pool%20to%20${encodeURIComponent(ride.destination)}." target="_blank" class="btn btn-emerald block-btn">
          <i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp
        </a>
      `;
    } else if (ride.availableSeats <= 0) {
      bookingCol.innerHTML = `
        <div style="text-align:center; padding:1rem; color:var(--accent-rose);">
          <i class="fa-solid fa-ban" style="font-size:2rem; margin-bottom:0.5rem;"></i>
          <h4>Ride Full</h4>
          <p style="font-size:0.85rem; color:var(--text-muted);">All ${ride.totalSeats} seats have been reserved.</p>
        </div>
      `;
    } else {
      bookingCol.innerHTML = `
        <h4 style="font-size:1rem;"><i class="fa-solid fa-ticket"></i> Reserve Your Seat</h4>
        <div class="form-group">
          <label>Your Contact Phone</label>
          <input type="tel" id="booking-phone-input" value="${currentUser?.phone || ''}" required>
        </div>
        <div class="form-group">
          <label>Note to Driver (Optional)</label>
          <input type="text" id="booking-note-input" placeholder="e.g. Waiting near Library entrance">
        </div>
        <button class="btn btn-primary block-btn shine-effect" id="confirm-join-ride-btn">
          <i class="fa-solid fa-check"></i> Confirm Booking (₹${costInfo.fullCapacityPerPerson})
        </button>
      `;

      setTimeout(() => {
        document.getElementById('confirm-join-ride-btn')?.addEventListener('click', () => {
          this.executeBooking(ride.id);
        });
      }, 50);
    }

    modal.classList.add('active');

    // Initialize Map inside modal
    setTimeout(() => {
      this.initModalMap(ride.coords || { origin: [28.625, 77.375], destination: [28.628, 77.360] }, ride.origin, ride.destination);
    }, 200);
  },

  // Execute Seat Booking Logic
  executeBooking(rideId) {
    const phoneInput = document.getElementById('booking-phone-input');
    const rides = this.getRides();
    const ride = rides.find(r => r.id === rideId);
    const currentUser = AuthManager.getCurrentUser();

    if (!currentUser || !currentUser.isVerified) {
      window.appShowToast('Verification required before joining a ride!', 'warning');
      document.getElementById('manual-modal')?.classList.add('active');
      return;
    }

    if (!ride) return;

    const phone = phoneInput ? phoneInput.value : currentUser.phone;

    ride.availableSeats -= 1;
    ride.passengers.push({
      name: currentUser.name,
      role: currentUser.role,
      registerNumber: currentUser.registerNumber,
      phone: phone
    });

    this.saveRides(rides);
    window.appShowToast(`Successfully reserved a seat on coRide with ${ride.driverName}!`, 'success');

    this.renderRidesList();
    this.renderMyTrips();
    document.getElementById('ride-details-modal')?.classList.remove('active');
  },

  // Driver Invites a Rider Request to join their pool
  openInviteModal(requestId) {
    const modal = document.getElementById('invite-modal');
    const modalBody = document.getElementById('invite-modal-body');
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    const rides = this.getRides();
    const currentUser = AuthManager.getCurrentUser();

    const myOffers = rides.filter(r => r.driverName === currentUser?.name && r.availableSeats > 0);

    if (!req || !modalBody) return;

    if (myOffers.length === 0) {
      modalBody.innerHTML = `
        <div style="text-align:center; padding:1.5rem;">
          <i class="fa-solid fa-car-on" style="font-size:2.5rem; color:var(--accent-amber); margin-bottom:1rem;"></i>
          <h4>No Active Ride Offers Found</h4>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem;">You need to offer a ride with available seats before inviting riders.</p>
          <button class="btn btn-primary block-btn" style="margin-top:1.25rem;" onclick="document.getElementById('invite-modal').classList.remove('active'); document.querySelector('[data-tab=offer-tab]').click();">
            <i class="fa-solid fa-plus-circle"></i> Offer a Ride Now
          </button>
        </div>
      `;
    } else {
      modalBody.innerHTML = `
        <p style="margin-bottom:1rem; font-size:0.9rem;">Select one of your ride offers to invite <strong>${req.riderName}</strong> (${req.destination}):</p>
        <div style="display:flex; flex-direction:column; gap:0.75rem;">
          ${myOffers.map(offer => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding:0.85rem; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="font-size:0.95rem;">To: ${offer.destination}</strong>
                <div style="font-size:0.78rem; color:var(--text-muted);">Departs at ${offer.departureTime} • ${offer.availableSeats} seats left</div>
              </div>
              <button class="btn btn-emerald btn-sm send-invite-btn" data-offerid="${offer.id}" data-reqid="${req.id}">
                <i class="fa-solid fa-paper-plane"></i> Send Invite
              </button>
            </div>
          `).join('')}
        </div>
      `;

      setTimeout(() => {
        document.querySelectorAll('.send-invite-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const offerId = e.currentTarget.dataset.offerid;
            const reqId = e.currentTarget.dataset.reqid;
            this.sendDriverInvite(offerId, reqId);
          });
        });
      }, 50);
    }

    modal.classList.add('active');
  },

  sendDriverInvite(offerId, reqId) {
    window.appShowToast('Invitation sent to rider via SMS/Notification simulation!', 'success');
    document.getElementById('invite-modal')?.classList.remove('active');
  },

  // Interactive Leaflet Map initialization
  initModalMap(coords, originName, destName) {
    const mapContainer = document.getElementById('modal-map');
    if (!mapContainer) return;

    if (this.activeMap) {
      this.activeMap.remove();
      this.activeMap = null;
    }

    const defaultCenter = coords.origin || [28.625, 77.375];
    this.activeMap = L.map('modal-map').setView(defaultCenter, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.activeMap);

    const orig = coords.origin || [28.625, 77.375];
    const dest = coords.destination || [28.635, 77.360];

    L.marker(orig).addTo(this.activeMap).bindPopup(`<b>Pickup:</b> ${originName}`).openPopup();
    L.marker(dest).addTo(this.activeMap).bindPopup(`<b>Drop-off:</b> ${destName}`);

    const polyline = L.polyline([orig, dest], { color: '#6366f1', weight: 4, opacity: 0.8 }).addTo(this.activeMap);
    this.activeMap.fitBounds(polyline.getBounds(), { padding: [30, 30] });
  },

  // Render Dashboard User Activity (Tab 4)
  renderMyTrips() {
    const myOffersContainer = document.getElementById('my-offers-container');
    const myBookingsContainer = document.getElementById('my-bookings-container');
    const myRequestsContainer = document.getElementById('my-requests-container');

    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser || !currentUser.isVerified) {
      const msg = '<p style="color:var(--text-muted); font-size:0.9rem;"><i class="fa-solid fa-lock"></i> Please verify your campus identity to view personal commute activity.</p>';
      if (myOffersContainer) myOffersContainer.innerHTML = msg;
      if (myBookingsContainer) myBookingsContainer.innerHTML = msg;
      if (myRequestsContainer) myRequestsContainer.innerHTML = msg;
      return;
    }

    const rides = this.getRides();
    const requests = this.getRequests();

    const myOffers = rides.filter(r => r.driverName === currentUser.name);
    const myBookings = rides.filter(r => r.passengers.some(p => p.name === currentUser.name));
    const myRequests = requests.filter(r => r.riderName === currentUser.name);

    if (myOffersContainer) {
      myOffersContainer.innerHTML = myOffers.length === 0 ? 
        '<p style="color:var(--text-muted); font-size:0.9rem;">You have not published any ride offers yet.</p>' :
        myOffers.map(r => `
          <div class="ride-card">
            <h4><i class="fa-solid fa-car"></i> ${r.destination}</h4>
            <div style="font-size:0.85rem; color:var(--text-muted);">From: ${r.origin} • Time: ${r.departureTime}</div>
            <div style="font-size:0.85rem; color:var(--accent-emerald); font-weight:700;">${r.availableSeats} of ${r.totalSeats} seats remaining</div>
          </div>
        `).join('');
    }

    if (myBookingsContainer) {
      myBookingsContainer.innerHTML = myBookings.length === 0 ? 
        '<p style="color:var(--text-muted); font-size:0.9rem;">You have not joined any carpool rides yet.</p>' :
        myBookings.map(r => `
          <div class="ride-card">
            <h4><i class="fa-solid fa-route"></i> Ride to ${r.destination}</h4>
            <div style="font-size:0.85rem; color:var(--text-muted);">Driver: ${r.driverName} (${r.phone})</div>
            <div style="font-size:0.85rem; color:var(--accent-emerald); font-weight:700;">Departure: ${r.departureTime}</div>
          </div>
        `).join('');
    }

    if (myRequestsContainer) {
      myRequestsContainer.innerHTML = myRequests.length === 0 ? 
        '<p style="color:var(--text-muted); font-size:0.9rem;">No active travel requests posted.</p>' :
        myRequests.map(req => `
          <div class="request-card">
            <h4><i class="fa-solid fa-bullhorn"></i> Heading to ${req.destination}</h4>
            <div style="font-size:0.85rem; color:var(--text-muted);">Pickup: ${req.origin} • Preferred Time: ${req.preferredTime}</div>
          </div>
        `).join('');
    }
  }
};
