// Global styles + Bootstrap JS
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/main.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';

import { clearAuth } from './js/api/httpClient.js';
import { initHeader } from './js/ui/header.js';

initHeader();

const page = document.body.dataset.page || '';

// Page-specific JS
if (page === 'index') {
  import('./js/pages/index.js');
}

if (page === 'listing') {
  import('./js/pages/listing.js');
}

if (page === 'auth' || page === 'login' || page === 'register') {
  import('./js/pages/auth.js');
}

if (page === 'profile') {
  import('./js/pages/profile.js');
}

if (page === 'listing-edit') {
  import('./js/pages/listingEdit.js');
}

// Global logout handler
const logoutButtons = document.querySelectorAll('[data-auth="logout"]');

if (logoutButtons && logoutButtons.length > 0) {
  logoutButtons.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();

      clearAuth();

      // Store a one-time alert payload to be shown on the next page (login)
      try {
        const payload = {
          type: 'success',
          title: 'Logged out',
          message: 'You have been logged out of StudioBid.',
        };
        window.localStorage.setItem('sbAuthAlert', JSON.stringify(payload));
      } catch {
        // Ignore storage errors, just continue redirect
      }

      window.location.href = 'login.html';
    });
  });
}

export default {};
