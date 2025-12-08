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

const PAGE_SIZE = 12;

let currentPage = 1;
let currentSearch = '';
let currentSort = 'newest';
let isLoading = false;

// Track which listings
const loadedListingIds = new Set();

/* ------------------------
   Config for sort options
------------------------- */

const sortConfig = {
  newest: { sort: 'created', sortOrder: 'desc' },
  'ending-soon': { sort: 'endsAt', sortOrder: 'asc' },
  'highest-bid': { sort: 'created', sortOrder: 'desc' },
};

/* ------------------------
   Helpers: errors & summary
------------------------- */

const showError = (message) => {
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('d-none');
  }

  showAlert('error', 'Could not load listings', message);
};

const clearError = () => {
  if (!errorEl) {
    return;
  }

  errorEl.textContent = '';
  errorEl.classList.add('d-none');
};

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

const showEndOfResults = (message) => {
  if (!endOfResultsEl) return;
  endOfResultsEl.textContent = message;
  endOfResultsEl.classList.remove('d-none');
};

const hideEndOfResults = () => {
  if (!endOfResultsEl) return;
  endOfResultsEl.textContent = '';
  endOfResultsEl.classList.add('d-none');
};

const clearListings = () => {
  if (!listingsContainer || !listingTemplateCol) {
    return;
  }

  const cols = listingsContainer.querySelectorAll('.col');
  cols.forEach(function (col) {
    if (col !== listingTemplateCol) {
      col.remove();
    }
  });

  loadedListingIds.clear();
  hideEndOfResults();
};

/* ------------------------
   Query builders
------------------------- */

const addSortParams = (parts) => {
  const cfg = sortConfig[currentSort];
  if (!cfg) {
    return;
  }

  if (cfg.sort) {
    parts.push('sort=' + cfg.sort);
  }
  if (cfg.sortOrder) {
    parts.push('sortOrder=' + cfg.sortOrder);
  }
};

// Main listings (active, seller, bids, paging, sort)
const buildListingsQueryString = () => {
  const parts = [];

  parts.push('_active=true');
  parts.push('_seller=true');
  parts.push('_bids=true');
  parts.push('limit=' + PAGE_SIZE);
  parts.push('page=' + currentPage);

  addSortParams(parts);

  return '?' + parts.join('&');
};

// Search endpoint (/auction/listings/search?q=…)
const buildSearchQueryString = () => {
  const parts = [];

  const trimmedSearch = currentSearch ? currentSearch.trim() : '';
  const encoded = encodeURIComponent(trimmedSearch);

  parts.push('q=' + encoded);
  parts.push('_seller=true');
  parts.push('_bids=true');
  parts.push('_active=true');
  parts.push('limit=' + PAGE_SIZE);
  parts.push('page=' + currentPage);

  addSortParams(parts);

  return '?' + parts.join('&');
};

// Fallback for tag search on /auction/listings?_tag=…
const buildTagQueryString = () => {
  const parts = [];

  const trimmedSearch = currentSearch ? currentSearch.trim() : '';
  const encoded = encodeURIComponent(trimmedSearch);

  parts.push('_tag=' + encoded);
  parts.push('_active=true');
  parts.push('_seller=true');
  parts.push('_bids=true');
  parts.push('limit=' + PAGE_SIZE);
  parts.push('page=' + currentPage);

  addSortParams(parts);

  return '?' + parts.join('&');
};

/* ------------------------
   Helpers: bids, time, new
------------------------- */

const getHighestBidAmount = (listing) => {
  if (!listing || !listing.bids || !listing.bids.length) {
    return 0;
  }

  let max = 0;

  for (let i = 0; i < listing.bids.length; i++) {
    const bid = listing.bids[i];
    const amount = bid && typeof bid.amount === 'number' ? bid.amount : 0;

    if (amount > max) {
      max = amount;
    }
  }

  return max;
};

const formatEndsIn = (endsAt) => {
  if (!endsAt) {
    return 'Unknown';
  }

  const endDate = new Date(endsAt);
  if (isNaN(endDate.getTime())) {
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

const isNewListing = (listing) => {
  if (!listing || !listing.created) {
    return false;
  }

  const createdDate = new Date(listing.created);
  if (isNaN(createdDate.getTime())) {
    return false;
  }

  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours <= 24;
};

/* ------------------------
   Relevance scoring
------------------------- */

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

/* ------------------------
   Sorting helpers
------------------------- */

const sortComparators = {
  'highest-bid': function (a, b) {
    const aMax = getHighestBidAmount(a);
    const bMax = getHighestBidAmount(b);
    return bMax - aMax;
  },
  newest: function (a, b) {
    const aTime = a && a.created ? new Date(a.created).getTime() : NaN;
    const bTime = b && b.created ? new Date(b.created).getTime() : NaN;

    if (isNaN(aTime) || isNaN(bTime) || aTime === bTime) {
      return 0;
    }

    return bTime - aTime;
  },
  'ending-soon': function (a, b) {
    const aEnd = a && a.endsAt ? new Date(a.endsAt).getTime() : NaN;
    const bEnd = b && b.endsAt ? new Date(b.endsAt).getTime() : NaN;

    if (isNaN(aEnd) || isNaN(bEnd) || aEnd === bEnd) {
      return 0;
    }

    return aEnd - bEnd;
  },
};

const sortSearchResults = (listings, query, sortKey) => {
  if (!listings || !listings.length || !query) {
    return;
  }

  const comparator = sortKey ? sortComparators[sortKey] : null;

  listings.sort(function (a, b) {
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

const sortNonSearchResults = (listings, sortKey) => {
  if (!listings || !listings.length) {
    return;
  }

  if (sortKey === 'highest-bid') {
    listings.sort(sortComparators['highest-bid']);
  }
};

/* ------------------------
   Rendering
------------------------- */

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

  const title = listing && listing.title ? listing.title : 'Untitled listing';
  const sellerName =
    listing && listing.seller && listing.seller.name ? listing.seller.name : 'Unknown seller';

  let totalBids = 0;
  if (listing && listing._count && typeof listing._count.bids === 'number') {
    totalBids = listing._count.bids;
  } else if (listing && listing.bids && listing.bids.length) {
    totalBids = listing.bids.length;
  }

  const endsIn = formatEndsIn(listing && listing.endsAt ? listing.endsAt : null);
  const highestBid = getHighestBidAmount(listing);
  const listingId = listing && listing.id ? listing.id : '';

  if (titleEl) {
    titleEl.textContent = title;
  }

  if (sellerEl) {
    sellerEl.textContent = sellerName;
    sellerEl.href = 'profile.html?name=' + encodeURIComponent(sellerName);
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
    if (isNewListing(listing)) {
      badgeEl.classList.remove('d-none');
    } else {
      badgeEl.classList.add('d-none');
    }
  }

  if (mediaImg && mediaFallback) {
    let hasImage = false;

    if (listing && listing.media && listing.media.length) {
      const first = listing.media[0];
      const url = first && first.url ? first.url : '';
      const alt = first && first.alt ? first.alt : title;

      if (url) {
        mediaImg.src = url;
        mediaImg.alt = alt;
        mediaImg.classList.remove('d-none');
        mediaFallback.classList.add('d-none');
        hasImage = true;
      }
    }

    if (!hasImage) {
      mediaImg.classList.add('d-none');
      mediaFallback.classList.remove('d-none');
    }
  }

  return clone;
};

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

  listings.forEach(function (listing) {
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

/* ------------------------
   Search fetch (with tag fallback)
------------------------- */

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

/* ------------------------
   Loading data
------------------------- */

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

/* ------------------------
   Event wiring
------------------------- */

if (searchForm && searchInput) {
  searchForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const value = String(searchInput.value || '').trim();
    currentSearch = value;
    currentPage = 1;

    await fetchListings(false);
  });
}

if (sortSelect) {
  sortSelect.addEventListener('change', async function () {
    const value = sortSelect.value || '';
    currentSort = value;
    currentPage = 1;

    await fetchListings(false);
  });
}

if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', async function () {
    currentPage = currentPage + 1;
    await fetchListings(true);
  });
}

/* ------------------------
   Post-login welcome toast
------------------------- */

const justLoggedInFlag = window.sessionStorage.getItem('sbAuthJustLoggedIn');
if (justLoggedInFlag === '1') {
  window.sessionStorage.removeItem('sbAuthJustLoggedIn');
  showAlert(
    'success',
    'Welcome back',
    'You are now logged in. Your credits and profile are available in the header.',
  );
}

/* ------------------------
   Initial load
------------------------- */

(async () => {
  await fetchListings(false);
})();
