/**
 * Application entry point.
 *
 * - Loads global styles and Bootstrap JS.
 * - Initializes the header.
 * - Dynamically imports page-specific scripts based on `data-page` on <body>.
 * - Sets up a global logout handler for elements with `data-auth="logout"`.
 */

// Global styles + Bootstrap JS
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/main.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';

import { clearAuth } from './js/api/httpClient.js';
import { initHeader } from './js/ui/header.js';

/**
 * Initialize global header (logged-in / logged-out state, credits, avatar).
 */
initHeader();

/**
 * Current page identifier taken from the <body> element.
 * Expected values: "index", "listing", "auth", "login", "register", "profile", "listing-edit".
 * @type {string}
 */
const page = document.body.dataset.page || '';

/**
 * Dynamically import JS for the current page.
 * This keeps the main bundle smaller and only loads what is needed.
 */
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

/**
 * All logout buttons that should log the user out when clicked.
 * @type {NodeListOf<HTMLButtonElement|HTMLAnchorElement>}
 */
const logoutButtons = document.querySelectorAll('[data-auth="logout"]');

if (logoutButtons && logoutButtons.length > 0) {
  logoutButtons.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();

      // Clear stored auth data
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

/**
 * Default export is an empty object so the module has a default export.
 * (Not used directly, but kept for tooling compatibility.)
 */
export default {};
