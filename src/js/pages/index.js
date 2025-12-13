import { getAuth } from '../api/httpClient.js';
import { getListings, searchListings } from '../api/listingsApi.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';

const listingsContainer = document.querySelector('[data-listings]');
const listingTemplateCol = document.querySelector('[data-listing-template]');
const loadMoreBtn = document.querySelector('[data-listings="load-more"]');
const endOfResultsEl = document.querySelector('[data-listings-end]');
const searchForm = document.querySelector('.sb-search-form');
const searchInput = document.querySelector('#listingSearch');
const sortSelect = document.querySelector('#sortBy');
const errorEl = document.querySelector('[data-listings-error]');
const summaryEl = document.querySelector('[data-listings-summary]');

const auth = getAuth();
const isLoggedIn = !!(auth && auth.name);

/**
 * Number of listings to show per page.
 * @type {number}
 */
const PAGE_SIZE = 12;

let currentPage = 1;
let currentSearch = '';
let currentSort = 'newest';
let isLoading = false;

// Track which listings are already rendered so we do not duplicate them
const loadedListingIds = new Set();

/**
 * Sort configuration for the API request.
 * Maps the UI sort key to API sort and sortOrder.
 * @type {Object<string, {sort: string, sortOrder: string}>}
 */
const sortConfig = {
  newest: { sort: 'created', sortOrder: 'desc' },
  'ending-soon': { sort: 'endsAt', sortOrder: 'asc' },
  'highest-bid': { sort: 'created', sortOrder: 'desc' },
};

// =======================
// Helpers: errors & summary
// =======================

/**
 * Show an error message above the listings, and also as a floating alert.
 *
 * @param {string} message - Error message to display.
 * @returns {void}
 */
const showError = (message) => {
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('d-none');
  }

  showAlert('error', 'Could not load listings', message);
};

/**
 * Hide the inline error message above the listings.
 *
 * @returns {void}
 */
const clearError = () => {
  if (!errorEl) {
    return;
  }

  errorEl.textContent = '';
  errorEl.classList.add('d-none');
};

/**
 * Update the small summary text that shows how many results
 * were found for the current search term.
 *
 * @param {number} count - Number of listings currently shown.
 * @returns {void}
 */
const updateSummary = (count) => {
  if (!summaryEl) {
    return;
  }

  if (!currentSearch) {
    summaryEl.textContent = '';
    summaryEl.classList.add('d-none');
    return;
  }

  const term = currentSearch;
  let text = '';

  if (!count) {
    text = 'No listings match "' + term + '" yet.';
  } else {
    text = 'Showing ' + count + ' result(s) for "' + term + '".';
  }

  summaryEl.textContent = text;
  summaryEl.classList.remove('d-none');
};

/**
 * Show the "end of results" message under the load more button.
 *
 * @param {string} message - Message to display.
 * @returns {void}
 */
const showEndOfResults = (message) => {
  if (!endOfResultsEl) return;
  endOfResultsEl.textContent = message;
  endOfResultsEl.classList.remove('d-none');
};

/**
 * Hide the "end of results" message.
 *
 * @returns {void}
 */
const hideEndOfResults = () => {
  if (!endOfResultsEl) return;
  endOfResultsEl.textContent = '';
  endOfResultsEl.classList.add('d-none');
};

/**
 * Remove all rendered listings except the hidden template column.
 * Also clears the set of loaded listing IDs.
 *
 * @returns {void}
 */
const clearListings = () => {
  if (!listingsContainer || !listingTemplateCol) {
    return;
  }

  const cols = listingsContainer.querySelectorAll('.col');
  cols.forEach((col) => {
    if (col !== listingTemplateCol) {
      col.remove();
    }
  });

  loadedListingIds.clear();
  hideEndOfResults();
};

// =======================
// Query builders
// =======================

/**
 * Add sort query parameters based on the current sort selection.
 *
 * @param {string[]} parts - Array of query string parts to push into.
 * @returns {void}
 */
const addSortParams = (parts) => {
  const cfg = sortConfig[currentSort];
  if (!cfg) return;

  if (cfg.sort) {
    parts.push('sort=' + cfg.sort);
  }
  if (cfg.sortOrder) {
    parts.push('sortOrder=' + cfg.sortOrder);
  }
};

/**
 * Add base listing parameters that should always be sent:
 * active listings, include seller and bids, and paging info.
 *
 * @param {string[]} parts - Array of query string parts.
 * @returns {void}
 */
const addBaseListingParams = (parts) => {
  parts.push('_active=true');
  parts.push('_seller=true');
  parts.push('_bids=true');
  parts.push('limit=' + PAGE_SIZE);
  parts.push('page=' + currentPage);
  addSortParams(parts);
};

/**
 * Build the query string for the main listings endpoint.
 *
 * @returns {string} Query string starting with "?".
 */
const buildListingsQueryString = () => {
  const parts = [];
  addBaseListingParams(parts);
  return '?' + parts.join('&');
};

/**
 * Build the query string for the search endpoint `/auction/listings/search`.
 *
 * @returns {string} Query string starting with "?".
 */
const buildSearchQueryString = () => {
  const parts = [];
  const trimmedSearch = currentSearch ? currentSearch.trim() : '';
  const encoded = encodeURIComponent(trimmedSearch);

  parts.push('q=' + encoded);
  addBaseListingParams(parts);

  return '?' + parts.join('&');
};

/**
 * Build the query string for tag fallback search on `/auction/listings`.
 *
 * @returns {string} Query string starting with "?".
 */
const buildTagQueryString = () => {
  const parts = [];
  const trimmedSearch = currentSearch ? currentSearch.trim() : '';
  const encoded = encodeURIComponent(trimmedSearch);

  parts.push('_tag=' + encoded);
  addBaseListingParams(parts);

  return '?' + parts.join('&');
};

// =======================
// Helpers: bids, time, new
// =======================

/**
 * Get the highest bid amount for a listing.
 *
 * @param {Object} listing - Listing object with a `bids` array.
 * @returns {number} Highest bid amount, or 0 if no bids.
 */
const getHighestBidAmount = (listing) => {
  const bids = listing && Array.isArray(listing.bids) ? listing.bids : [];
  if (!bids.length) return 0;

  return bids.reduce((max, bid) => {
    const amount = bid && typeof bid.amount === 'number' ? bid.amount : 0;
    return amount > max ? amount : max;
  }, 0);
};

/**
 * Format how much time is left until a given end date.
 *
 * Examples: "2d 4h", "3h 20m", "10m", "Ended", "Unknown".
 *
 * @param {string|null} endsAt - ISO timestamp string.
 * @returns {string} Human readable remaining time.
 */
const formatEndsIn = (endsAt) => {
  if (!endsAt) {
    return 'Unknown';
  }

  const endDate = new Date(endsAt);
  if (Number.isNaN(endDate.getTime())) {
    return 'Unknown';
  }

  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Ended';
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

  if (days > 0) {
    return days + 'd ' + hours + 'h';
  }

  if (hours > 0) {
    return hours + 'h ' + minutes + 'm';
  }

  return minutes + 'm';
};

/**
 * Check if a listing is considered "new".
 * A listing is "new" if it was created within the last 24 hours.
 *
 * @param {Object} listing - Listing object with a `created` timestamp.
 * @returns {boolean} True if the listing is new.
 */
const isNewListing = (listing) => {
  if (!listing || !listing.created) {
    return false;
  }

  const createdDate = new Date(listing.created);
  if (Number.isNaN(createdDate.getTime())) {
    return false;
  }

  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours <= 24;
};

/**
 * Check if a listing has already ended.
 *
 * @param {Object} listing - Listing object with an `endsAt` timestamp.
 * @returns {boolean} True if the listing has ended.
 */
const isListingEnded = (listing) => {
  if (!listing || !listing.endsAt) return false;
  const endDate = new Date(listing.endsAt);
  if (Number.isNaN(endDate.getTime())) return false;
  return endDate.getTime() <= Date.now();
};

/**
 * Calculate a simple relevance score for a listing based on a search query.
 * The score is based on matches in title, tags, description, and seller name.
 *
 * @param {Object} listing - Listing to score.
 * @param {string} query - Search query string.
 * @returns {number} Relevance score (higher is better).
 */
const getRelevanceScore = (listing, query) => {
  if (!query) {
    return 0;
  }

  const q = String(query).toLowerCase();

  const title = listing && listing.title ? String(listing.title).toLowerCase() : '';
  const description =
    listing && listing.description ? String(listing.description).toLowerCase() : '';
  const sellerName =
    listing && listing.seller && listing.seller.name
      ? String(listing.seller.name).toLowerCase()
      : '';
  const tags = listing && listing.tags && listing.tags.length ? listing.tags : [];

  let score = 0;

  if (title === q) {
    score = score + 100;
  } else if (title.indexOf(q) !== -1) {
    score = score + 60;
  }

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const tagStr = tag ? String(tag).toLowerCase() : '';
    if (!tagStr) {
      continue;
    }

    if (tagStr === q) {
      score = score + 40;
    } else if (tagStr.indexOf(q) !== -1) {
      score = score + 20;
    }
  }

  if (description && description.indexOf(q) !== -1) {
    score = score + 20;
  }

  if (sellerName && sellerName.indexOf(q) !== -1) {
    score = score + 10;
  }

  return score;
};

// =======================
// Sorting helpers
// =======================

/**
 * Comparator functions used for sorting listings.
 * @type {Object<string, function(Object, Object): number>}
 */
const sortComparators = {
  'highest-bid': function (a, b) {
    const aMax = getHighestBidAmount(a);
    const bMax = getHighestBidAmount(b);
    return bMax - aMax;
  },
  newest: function (a, b) {
    const aTime = a && a.created ? new Date(a.created).getTime() : NaN;
    const bTime = b && b.created ? new Date(b.created).getTime() : NaN;

    if (Number.isNaN(aTime) || Number.isNaN(bTime) || aTime === bTime) {
      return 0;
    }

    return bTime - aTime;
  },
  'ending-soon': function (a, b) {
    const aEnd = a && a.endsAt ? new Date(a.endsAt).getTime() : NaN;
    const bEnd = b && b.endsAt ? new Date(b.endsAt).getTime() : NaN;

    if (Number.isNaN(aEnd) || Number.isNaN(bEnd) || aEnd === bEnd) {
      return 0;
    }

    return aEnd - bEnd;
  },
};

/**
 * Sort listings returned from a search.
 * First by relevance score, then by the chosen sort key.
 *
 * @param {Object[]} listings - Array of listing objects.
 * @param {string} query - Search term.
 * @param {string} sortKey - Key in sortComparators (e.g. "newest").
 * @returns {void}
 */
const sortSearchResults = (listings, query, sortKey) => {
  if (!listings || !listings.length || !query) {
    return;
  }

  const comparator = sortKey ? sortComparators[sortKey] : null;

  listings.sort((a, b) => {
    const scoreA = getRelevanceScore(a, query);
    const scoreB = getRelevanceScore(b, query);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    if (comparator) {
      return comparator(a, b);
    }

    return 0;
  });
};

/**
 * Sort listings when there is no search query.
 * Currently only applies extra logic for "highest-bid".
 *
 * @param {Object[]} listings - Array of listing objects.
 * @param {string} sortKey - Selected sort key.
 * @returns {void}
 */
const sortNonSearchResults = (listings, sortKey) => {
  if (!listings || !listings.length) {
    return;
  }

  if (sortKey === 'highest-bid') {
    listings.sort(sortComparators['highest-bid']);
  }
};

// =======================
// Rendering
// =======================

/**
 * Create a listing card element from the hidden template column.
 * Fills in title, seller, bids, time left, media and badges.
 *
 * @param {Object} listing - Listing data from the API.
 * @returns {HTMLElement|null} A populated card column, or null if template is missing.
 */
const createListingCard = (listing) => {
  if (!listingTemplateCol) {
    return null;
  }

  const clone = listingTemplateCol.cloneNode(true);
  clone.removeAttribute('data-listing-template');
  clone.hidden = false;

  const titleEl = clone.querySelector('[data-listing-title]');
  const sellerEl = clone.querySelector('[data-listing-seller]');
  const bidsEl = clone.querySelector('[data-listing-bids]');
  const endsEl = clone.querySelector('[data-listing-ends]');
  const linkEl = clone.querySelector('[data-listing-link]');
  const badgeEl = clone.querySelector('[data-listing-badge]');
  const highestBidEl = clone.querySelector('[data-listing-highest-bid]');
  const mediaImg = clone.querySelector('[data-listing-media]');
  const mediaFallback = clone.querySelector('[data-listing-media-fallback]');
  const mediaWrapper = clone.querySelector('.position-relative');

  const title = listing && listing.title ? listing.title : 'Untitled listing';
  const sellerName =
    listing && listing.seller && listing.seller.name ? listing.seller.name : 'Unknown seller';

  const totalBids =
    listing && listing._count && typeof listing._count.bids === 'number'
      ? listing._count.bids
      : listing && listing.bids && listing.bids.length
        ? listing.bids.length
        : 0;

  const endsIn = formatEndsIn(listing && listing.endsAt ? listing.endsAt : null);
  const highestBid = getHighestBidAmount(listing);
  const listingId = listing && listing.id ? listing.id : '';
  const ended = isListingEnded(listing);

  if (titleEl) {
    titleEl.textContent = title;
  }

  if (sellerEl) {
    sellerEl.textContent = sellerName;

    const isAnchor = String(sellerEl.tagName || '').toLowerCase() === 'a';

    if (isLoggedIn && isAnchor) {
      sellerEl.setAttribute('href', 'profile.html?name=' + encodeURIComponent(sellerName));
    } else if (!isLoggedIn && isAnchor) {
      const span = document.createElement('span');

      span.className = sellerEl.className
        .split(' ')
        .filter((c) => c && c !== 'card-username-link')
        .join(' ');

      span.textContent = sellerName;

      span.style.cursor = 'default';

      sellerEl.replaceWith(span);
    }
  }

  if (bidsEl) {
    bidsEl.textContent = String(totalBids);
  }

  if (endsEl) {
    endsEl.textContent = endsIn;
  }

  if (highestBidEl) {
    highestBidEl.textContent = 'Highest bid: ' + highestBid + ' credits';
  }

  if (linkEl && listingId) {
    linkEl.href = 'listing.html?id=' + encodeURIComponent(listingId);
  }

  if (badgeEl) {
    if (!ended && isNewListing(listing)) {
      badgeEl.classList.remove('d-none');
    } else {
      badgeEl.classList.add('d-none');
    }
  }

  if (mediaWrapper && ended) {
    const endedBadge = document.createElement('span');
    endedBadge.className = 'badge-ended position-absolute top-0 start-0 m-2';
    endedBadge.textContent = 'ENDED';
    mediaWrapper.appendChild(endedBadge);
  }

  if (mediaImg && mediaFallback) {
    const media = listing && Array.isArray(listing.media) ? listing.media : [];
    const first = media[0];
    const url = first && first.url ? first.url : '';
    const alt = first && first.alt ? first.alt : title;

    if (url) {
      mediaImg.src = url;
      mediaImg.alt = alt;
      mediaImg.classList.remove('d-none');
      mediaFallback.classList.add('d-none');
    } else {
      mediaImg.classList.add('d-none');
      mediaFallback.classList.remove('d-none');
    }
  }

  return clone;
};

/**
 * Render a list of listings into the container.
 *
 * @param {Object[]} listings - Array of listing objects.
 * @param {boolean} append - Whether to append to existing items or replace them.
 * @returns {number} Number of newly rendered listings.
 */
const renderListings = (listings, append) => {
  if (!listingsContainer || !listingTemplateCol) {
    return 0;
  }

  if (!append) {
    clearListings();
  }

  if (!listings || !listings.length) {
    updateSummary(0);
    return 0;
  }

  let newlyRenderedCount = 0;

  listings.forEach((listing) => {
    const listingId = listing && listing.id ? listing.id : null;

    if (append && listingId && loadedListingIds.has(listingId)) {
      return;
    }

    const col = createListingCard(listing);
    if (col) {
      listingsContainer.appendChild(col);

      if (listingId) {
        loadedListingIds.add(listingId);
      }

      newlyRenderedCount += 1;
    }
  });

  updateSummary(listings.length);

  return newlyRenderedCount;
};

// =======================
// Search fetch (with tag fallback)
// =======================

/**
 * Fetch listings for a search term.
 * First uses `/auction/listings/search`, then falls back to `_tag` search
 * on `/auction/listings` if there are no results and the term is a single word.
 *
 * @returns {Promise<Object[]>} Promise that resolves to an array of listings.
 */
const fetchSearchListings = async () => {
  const trimmedSearch = currentSearch ? currentSearch.trim() : '';
  const searchQs = buildSearchQueryString();

  const data = await searchListings(searchQs);
  const fromSearch = Array.isArray(data) ? data : [];

  if (fromSearch.length || trimmedSearch.indexOf(' ') !== -1) {
    return fromSearch;
  }

  const tagQs = buildTagQueryString();
  const tagData = await getListings(tagQs);
  return Array.isArray(tagData) ? tagData : [];
};

// =======================
// Loading data
// =======================

/**
 * Fetch listings for the current page, search term and sort.
 * Handles loading state, error handling and showing/hiding the load more button.
 *
 * @param {boolean} append - Whether to append results to existing ones.
 * @returns {Promise<void>}
 */
const fetchListings = async (append) => {
  if (!listingsContainer || !listingTemplateCol) {
    return;
  }

  if (isLoading) {
    return;
  }

  isLoading = true;
  clearError();
  hideEndOfResults();
  showLoader();

  try {
    let data;

    if (!currentSearch) {
      const qs = buildListingsQueryString();
      data = await getListings(qs);
    } else {
      data = await fetchSearchListings();
    }

    let listings = Array.isArray(data) ? data : [];

    // Filter out ended listings from the index page
    listings = listings.filter((listing) => !isListingEnded(listing));

    if (currentSearch) {
      sortSearchResults(listings, currentSearch, currentSort);
    } else {
      sortNonSearchResults(listings, currentSort);
    }

    const newlyRenderedCount = renderListings(listings, append);

    if (!loadMoreBtn) {
      return;
    }

    if (newlyRenderedCount < PAGE_SIZE) {
      loadMoreBtn.classList.add('d-none');

      if (currentPage === 1 && newlyRenderedCount === 0) {
        showEndOfResults('No listings found.');
      } else {
        showEndOfResults('No more listings to show.');
      }
    } else if (!append) {
      loadMoreBtn.classList.remove('d-none');
      hideEndOfResults();
    }
  } catch (error) {
    const message =
      error && error.message ? error.message : 'Could not load listings. Please try again later.';

    showError(message);
    updateSummary(0);

    if (loadMoreBtn) {
      loadMoreBtn.classList.add('d-none');
    }
    hideEndOfResults();
  } finally {
    hideLoader();
    isLoading = false;
  }
};

// =======================
// Event wiring (guarded)
// =======================

const bindIndexEventsOnce = () => {
  if (document.body && document.body.dataset.sbIndexBound === '1') return;
  if (document.body) document.body.dataset.sbIndexBound = '1';

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const value = String(searchInput.value || '').trim();
      currentSearch = value;
      currentPage = 1;

      await fetchListings(false);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', async () => {
      const value = sortSelect.value || '';
      currentSort = value;
      currentPage = 1;

      await fetchListings(false);
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      currentPage = currentPage + 1;
      await fetchListings(true);
    });
  }
};

// =======================
// Post-login welcome toast
// =======================

/**
 * If the user just logged in (flag in sessionStorage),
 * show a one-time welcome back alert.
 */
const justLoggedInFlag = window.sessionStorage.getItem('sbAuthJustLoggedIn');
if (justLoggedInFlag === '1') {
  window.sessionStorage.removeItem('sbAuthJustLoggedIn');
  showAlert(
    'success',
    'Welcome back',
    'You are now logged in. Your credits and profile are available in the header.',
  );
}

// =======================
// Initial load (DOM-safe)
// =======================

const initIndexPage = async () => {
  if (!listingsContainer || !listingTemplateCol) return;

  bindIndexEventsOnce();
  await fetchListings(false);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIndexPage);
} else {
  initIndexPage();
}
