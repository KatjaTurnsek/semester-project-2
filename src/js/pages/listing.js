import { getListingById } from '../api/listingsApi.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';

import { getListingIdFromQuery } from './listingUtils.js';
import { renderListing } from './listingRender.js';
import { setupBidForm } from './listingBid.js';

// =========================
// Init
// =========================

/**
 * Initialize the listing details page.
 *
 * - Reads the listing ID from the URL query string
 * - Loads the listing from the API
 * - Renders listing details and bid history
 * - Sets up the bid form
 *
 * Shows an error alert if the ID is missing or the listing cannot be loaded.
 *
 * @returns {Promise<void>}
 */
export async function initListingDetailsPage() {
  const titleEl = document.querySelector('[data-listing-title]');
  const id = getListingIdFromQuery();

  if (!id) {
    if (titleEl) {
      titleEl.textContent = 'No listing ID provided';
    }
    showAlert(
      'error',
      'Something went wrong',
      'No listing ID was provided. Please go back and open a listing again.',
    );
    return;
  }

  showLoader();

  try {
    const listing = await getListingById(id, '?_seller=true&_bids=true');

    if (!listing) {
      if (titleEl) {
        titleEl.textContent = 'Listing not found';
      }
      showAlert(
        'error',
        'Listing not found',
        'We could not find this listing. It may have been removed.',
      );
      return;
    }

    renderListing(listing);
    setupBidForm(listing);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'We could not load this listing right now. Please try again.';

    if (titleEl) {
      titleEl.textContent = 'Failed to load listing';
    }

    showAlert('error', 'Something went wrong', message);
  } finally {
    hideLoader();
  }
}

// =========================
// Run on load
// =========================

initListingDetailsPage();
