import { getListingById, placeBid } from '../api/listingsApi.js';
import { getAuth } from '../api/httpClient.js';
import { getProfile } from '../api/profilesApi.js';
import { showAlert } from '../ui/alerts.js';
import { refreshHeaderFromProfile } from '../ui/header.js';

import { clearElement, isAuctionEnded } from './listingUtils.js';
import { renderListing } from './listingRender.js';

// =========================
// Bid form
// =========================

/**
 * Set up the bid form for a listing.
 *
 * - Requires the user to be logged in
 * - Loads and shows the user's credits
 * - Prevents the seller from bidding on their own listing
 * - Prevents bids if the auction has ended
 * - Handles form submit and calls the place bid API
 *
 * @param {Object} listing - Listing data from the API.
 * @returns {void}
 */
export function setupBidForm(listing) {
  const auth = getAuth();
  const form = document.querySelector('[data-bid-form]');
  const input = document.querySelector('[data-bid-input]');
  const submitBtn = document.querySelector('[data-bid-submit]');
  const userCreditsEl = document.querySelector('[data-user-credits]');

  if (!form || !input || !submitBtn) {
    return;
  }

  if (!auth || !auth.name) {
    if (userCreditsEl) {
      userCreditsEl.textContent = '-';
    }

    disableBidForm('Login to place a bid.');
    showAlert('error', 'Login required', 'Log in with your student account to place a bid.');
    return;
  }

  if (userCreditsEl) {
    userCreditsEl.textContent = '-';

    (async () => {
      try {
        const profile = await getProfile(auth.name);
        if (profile && typeof profile.credits === 'number') {
          userCreditsEl.textContent = String(profile.credits);
        }
      } catch {
        // keep '-'
      }
    })();
  }

  const sellerName = listing && listing.seller && listing.seller.name ? listing.seller.name : null;
  if (sellerName && auth.name === sellerName) {
    disableBidForm('You cannot bid on your own listing.');
    showAlert('error', 'You are the seller', 'You can’t place bids on your own listing.');
    return;
  }

  if (isAuctionEnded(listing)) {
    disableBidForm('This auction has ended.');
    showAlert(
      'error',
      'Auction ended',
      'This auction has already ended and no new bids can be placed.',
    );
    return;
  }

  if (form.dataset.boundSubmit === '1') return;
  form.dataset.boundSubmit = '1';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const rawValue = input.value.trim();
    const amount = Number(rawValue);
    const errorEl = getOrCreateBidErrorElement(form);

    if (!rawValue || Number.isNaN(amount) || amount <= 0) {
      errorEl.textContent = 'Please enter a valid bid amount.';
      showAlert('error', 'Invalid bid', 'Please enter a valid positive bid amount.');
      return;
    }

    errorEl.textContent = '';

    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing bid…';

    try {
      await placeBid(listing.id, amount);

      const updatedListing = await getListingById(listing.id, '?_seller=true&_bids=true');
      if (updatedListing) {
        renderListing(updatedListing);
        // Re-check seller/ended state after refresh
        setupBidForm(updatedListing);
      }

      if (userCreditsEl && auth && auth.name) {
        try {
          const profile = await getProfile(auth.name);
          if (profile && typeof profile.credits === 'number') {
            userCreditsEl.textContent = String(profile.credits);
          }
        } catch {
          // ignore
        }
      }

      await refreshHeaderFromProfile();

      input.value = '';
      showAlert('success', 'Bid placed', 'Your bid has been placed successfully.');

      submitBtn.disabled = false;
      submitBtn.textContent = 'Place a bid';
    } catch (error) {
      const message = extractBidErrorMessage(error);

      errorEl.textContent = message;
      showAlert('error', 'Bid not accepted', message);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Place a bid';
    }
  });
}

// =========================
// Error message helper
// =========================

/**
 * Convert a raw error object from the API into a friendly message
 * that is easier for users to understand.
 *
 * @param {unknown} error - Error thrown when placing a bid.
 * @returns {string} Human readable error message.
 */
function extractBidErrorMessage(error) {
  let rawMessage = '';

  if (error && typeof error === 'object') {
    // @ts-ignore - runtime check only
    if (typeof error.message === 'string') {
      // @ts-ignore
      rawMessage = error.message;
      // @ts-ignore
    } else if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].message) {
      // @ts-ignore
      rawMessage = error.errors[0].message;
    }
  }

  const lower = rawMessage.toLowerCase();

  if (
    lower.indexOf('higher') !== -1 ||
    lower.indexOf('too low') !== -1 ||
    lower.indexOf('maximum bid') !== -1
  ) {
    return 'Your bid is too low. Please place a higher bid than the current highest bid.';
  }

  if (lower.indexOf('credit') !== -1) {
    return 'You do not have enough credits to place this bid.';
  }

  if (lower) {
    return rawMessage;
  }

  return 'Failed to place bid. Please try again.';
}

// =========================
// Small helpers
// =========================

/**
 * Replace the bid form with a simple message, effectively disabling it.
 *
 * @param {string} message - Message to show instead of the form.
 * @returns {void}
 */
function disableBidForm(message) {
  const form = document.querySelector('[data-bid-form]');
  if (!form) return;

  clearElement(form);

  const p = document.createElement('p');
  p.className = 'text-muted mb-0';
  p.textContent = message;
  form.appendChild(p);
}

/**
 * Get or create a small inline error element for the bid form.
 *
 * @param {HTMLFormElement} form - The bid form element.
 * @returns {HTMLElement} The error element.
 */
function getOrCreateBidErrorElement(form) {
  let errorEl = form.querySelector('[data-bid-error]');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.className = 'text-danger mt-2 small';
    errorEl.setAttribute('data-bid-error', '');
    form.appendChild(errorEl);
  }
  return errorEl;
}
