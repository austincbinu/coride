/* ==========================================================================
   coRide Clean Campus Storage Engine (Zero Pre-loaded Demo Posts)
   ========================================================================= */

const DATA_VERSION = 'coRide_v3_strict_empty';

// Start with completely empty boards - ONLY real verified users can post!
const CLEAN_VERIFIED_RIDES = [];
const CLEAN_VERIFIED_REQUESTS = [];

function initializeStorage() {
  const currentVersion = localStorage.getItem('cc_version');
  if (currentVersion !== DATA_VERSION) {
    // Purge old demo/junk posts & legacy pre-logged user
    localStorage.removeItem('cc_rides');
    localStorage.removeItem('cc_requests');
    localStorage.removeItem('cc_user');
    localStorage.setItem('cc_version', DATA_VERSION);
  }

  if (!localStorage.getItem('cc_rides')) {
    localStorage.setItem('cc_rides', JSON.stringify([]));
  }
  if (!localStorage.getItem('cc_requests')) {
    localStorage.setItem('cc_requests', JSON.stringify([]));
  }
}

function resetBoardToCleanData() {
  localStorage.setItem('cc_rides', JSON.stringify([]));
  localStorage.setItem('cc_requests', JSON.stringify([]));
  localStorage.setItem('cc_version', DATA_VERSION);
}

initializeStorage();
