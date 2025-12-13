// =========================
// Query parsing (no URLSearchParams)
// =========================

/**
 * Get the listing ID from the URL query string.
 *
 * Example: for `?id=123`, this returns `"123"`.
 *
 * @returns {string|null} Listing ID, or null if not present.
 */
export function getListingIdFromQuery() {
  const search = window.location.search || '';
  const withoutQuestionMark = search.startsWith('?') ? search.slice(1) : search;
  const pairs = withoutQuestionMark.split('&').filter(Boolean);

  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i];
    const parts = pair.split('=');
    const key = parts[0];
    const value = parts[1];

    if (key === 'id') {
      return decodeURIComponent(value || '');
    }
  }

  return null;
}

// =========================
// Small DOM helpers
// =========================

/**
 * Set the textContent of an element if it exists.
 *
 * @param {HTMLElement|null} el - Element whose text should be updated.
 * @param {string} text - Text to set.
 * @returns {void}
 */
export function setText(el, text) {
  if (el) {
    el.textContent = text;
  }
}

/**
 * Remove all child nodes from an element.
 *
 * @param {HTMLElement|null} element - Element to clear.
 * @returns {void}
 */
export function clearElement(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

// =========================
// Generic listing helpers
// =========================

/**
 * Check if an auction has ended based on the listing's `endsAt` field.
 *
 * @param {Object} listing - Listing object from the API.
 * @returns {boolean} True if the auction has ended.
 */
export function isAuctionEnded(listing) {
  if (!listing || !listing.endsAt) return false;
  const endsAt = new Date(listing.endsAt);
  if (Number.isNaN(endsAt.getTime())) return false;
  return endsAt <= new Date();
}

/**
 * Get bids sorted from highest amount to lowest.
 *
 * @param {Object} listing - Listing object with a `bids` array.
 * @returns {Object[]} Sorted array of bid objects.
 */
export function getSortedBids(listing) {
  const bidsRaw = listing && Array.isArray(listing.bids) ? listing.bids : [];
  return bidsRaw.slice().sort((a, b) => {
    const aAmount = a && typeof a.amount === 'number' ? a.amount : 0;
    const bAmount = b && typeof b.amount === 'number' ? b.amount : 0;
    return bAmount - aAmount;
  });
}

/**
 * Format the time left until an auction ends.
 *
 * Example: "Ends in 1d 3h 20m", "Auction ended", "Unknown end time".
 *
 * @param {Object} listing - Listing object with an `endsAt` field.
 * @returns {string} Human readable text.
 */
export function formatTimeLeft(listing) {
  if (!listing || !listing.endsAt) {
    return 'Unknown end time';
  }

  const endsAt = new Date(listing.endsAt);
  if (Number.isNaN(endsAt.getTime())) {
    return 'Unknown end time';
  }

  const now = new Date();
  if (endsAt <= now) {
    return 'Auction ended';
  }

  const diffMs = endsAt.getTime() - now.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `Ends in ${days}d ${hours}h ${minutes}m`;
}

/**
 * Normalize a media item into an object with url and alt.
 *
 * The API may return media items either as strings or as objects.
 *
 * @param {string|Object|null} item - Raw media item from the API.
 * @param {string} fallbackAlt - Fallback alt text.
 * @returns {{url:string, alt:string}|null} Normalized media object or null if invalid.
 */
export function normaliseMediaItem(item, fallbackAlt) {
  if (!item) return null;

  if (typeof item === 'string') {
    return { url: item, alt: fallbackAlt };
  }

  if (item && typeof item === 'object') {
    const url = item.url || '';
    if (!url) return null;

    return {
      url,
      alt: item.alt || fallbackAlt,
    };
  }

  return null;
}
