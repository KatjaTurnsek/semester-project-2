import { getAuth } from '../api/httpClient.js';
import {
  clearElement,
  formatTimeLeft,
  getSortedBids,
  isAuctionEnded,
  normaliseMediaItem,
  setText,
} from './listingUtils.js';

// =========================
// Owner edit button (only for seller)
// =========================

/**
 * Show an "Edit listing" button for the owner of the listing.
 *
 * - Only shows the button if the logged in user is the seller
 * - Binds a click handler that redirects to the edit page
 *
 * @param {Object} listing - Listing data from the API.
 * @returns {void}
 */
function renderOwnerEditButton(listing) {
  const btn = document.querySelector('[data-listing-edit-owner]');
  if (!btn || !listing || !listing.seller || !listing.seller.name) return;

  // Hide by default
  btn.classList.add('d-none');

  const auth = getAuth();
  if (!auth || !auth.name) return;

  const sellerName = listing.seller.name;
  if (auth.name !== sellerName) return;

  // Show button for owner
  btn.classList.remove('d-none');

  // Avoid multiple listeners if renderListing is called again
  if (btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  btn.addEventListener('click', (event) => {
    event.preventDefault();
    if (!listing.id) return;
    window.location.href = `listing-edit.html?id=${encodeURIComponent(listing.id)}`;
  });
}

// =========================
// Rendering
// =========================

/**
 * Render all details of a listing on the page.
 *
 * - Title, description, tags
 * - Seller info and avatar
 * - Media gallery
 * - Bid count, highest bid, time left
 * - Bid history
 * - Owner-only edit button
 *
 * @param {Object} listing - Listing data from the API.
 * @returns {void}
 */
export function renderListing(listing) {
  const titleEl = document.querySelector('[data-listing-title]');
  const descriptionEl = document.querySelector('[data-listing-description]');
  const tagsEl = document.querySelector('[data-listing-tags]');
  const sellerNameEl = document.querySelector('[data-listing-seller-name]');
  const sellerLinkEl = document.querySelector('[data-listing-seller-link]');
  const sellerAvatarEl = document.querySelector('[data-listing-seller-avatar]');
  const mainImgEl = document.querySelector('[data-listing-image-main]');
  const thumbsEl = document.querySelector('[data-listing-thumbnails]');
  const bidCountEl = document.querySelector('[data-listing-bid-count]');
  const highestBidEl = document.querySelector('[data-listing-highest-bid]');
  const timeLeftEl = document.querySelector('[data-listing-time-left]');
  const historyEl = document.querySelector('[data-bid-history]');

  const title = listing.title || 'Untitled listing';
  setText(titleEl, title);

  if (descriptionEl) {
    clearElement(descriptionEl);
    const p = document.createElement('p');
    p.textContent = listing.description || 'No description provided.';
    descriptionEl.appendChild(p);
  }

  if (tagsEl) {
    clearElement(tagsEl);
    const tags = Array.isArray(listing.tags) ? listing.tags.filter(Boolean) : [];

    if (tags.length) {
      tags.forEach((tag) => {
        const span = document.createElement('span');
        span.className = 'badge rounded-pill text-bg-light border';
        span.textContent = tag;
        tagsEl.appendChild(span);
      });
    } else {
      const span = document.createElement('span');
      span.className = 'badge rounded-pill text-bg-light border';
      span.textContent = 'No tags';
      tagsEl.appendChild(span);
    }
  }

  const sellerName =
    listing && listing.seller && listing.seller.name ? listing.seller.name : 'Unknown seller';

  setText(sellerNameEl, sellerName);

  const auth = getAuth();
  const isLoggedIn = !!(auth && auth.name);

  if (sellerLinkEl) {
    const isAnchor = String(sellerLinkEl.tagName || '').toLowerCase() === 'a';

    if (isLoggedIn && isAnchor) {
      sellerLinkEl.setAttribute('href', `profile.html?name=${encodeURIComponent(sellerName)}`);
      if (!sellerLinkEl.textContent || !sellerLinkEl.textContent.trim()) {
        sellerLinkEl.textContent = 'View seller profile';
      } else {
        sellerLinkEl.textContent = sellerLinkEl.textContent.trim();
      }
      sellerLinkEl.classList.remove('d-none');
    } else if (!isLoggedIn && isAnchor) {
      sellerLinkEl.classList.add('d-none');
      sellerLinkEl.removeAttribute('href');
    }
  }

  // Seller avatar (supports string or object shape)
  if (sellerAvatarEl) {
    clearElement(sellerAvatarEl);

    sellerAvatarEl.classList.add(
      'd-inline-flex',
      'justify-content-center',
      'align-items-center',
      'rounded-circle',
      'border',
      'border-2',
    );
    sellerAvatarEl.style.width = '64px';
    sellerAvatarEl.style.height = '64px';

    const avatarRaw = listing?.seller?.avatar ?? null;

    let avatarUrl = '';
    let avatarAlt = sellerName || 'Seller avatar';

    if (typeof avatarRaw === 'string') {
      avatarUrl = avatarRaw;
    } else if (avatarRaw && typeof avatarRaw === 'object') {
      avatarUrl = avatarRaw.url || '';
      avatarAlt = avatarRaw.alt || avatarAlt;
    }

    if (avatarUrl) {
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = avatarAlt;
      img.className = 'img-fluid rounded-circle';
      sellerAvatarEl.appendChild(img);
    } else {
      const icon = document.createElement('i');
      icon.className = 'bi bi-person fs-3';
      sellerAvatarEl.appendChild(icon);
    }
  }

  // Owner-only edit button
  renderOwnerEditButton(listing);

  renderListingMedia(listing, mainImgEl, thumbsEl);

  const bids = getSortedBids(listing);
  const highestBid = bids.length > 0 ? bids[0].amount : null;

  setText(bidCountEl, String(bids.length));
  setText(highestBidEl, highestBid ? `${highestBid} credits` : 'No bids yet');

  if (timeLeftEl) {
    const endsAt = listing.endsAt ? new Date(listing.endsAt) : null;

    if (!endsAt || Number.isNaN(endsAt.getTime())) {
      timeLeftEl.textContent = 'Unknown end time';
    } else if (isAuctionEnded(listing)) {
      timeLeftEl.textContent = 'Auction ended';
    } else {
      timeLeftEl.textContent = formatTimeLeft(listing);
    }
  }

  renderBidHistory(bids, historyEl);
}

/**
 * Render the main image and thumbnails for a listing.
 *
 * If there is no media, shows a gavel icon placeholder.
 *
 * @param {Object} listing - Listing data from the API.
 * @param {HTMLElement|null} mainImgEl - Container for the main image.
 * @param {HTMLElement|null} thumbsEl - Container for thumbnails.
 * @returns {void}
 */
function renderListingMedia(listing, mainImgEl, thumbsEl) {
  if (!mainImgEl || !thumbsEl) return;

  clearElement(mainImgEl);
  clearElement(thumbsEl);

  const rawMedia = Array.isArray(listing.media) ? listing.media.filter(Boolean) : [];
  const fallbackAlt = listing.title || 'Listing image';

  const media = rawMedia.map((item) => normaliseMediaItem(item, fallbackAlt)).filter(Boolean);

  if (!media.length) {
    const ratio = document.createElement('div');
    ratio.className = 'ratio ratio-16x9 bg-light d-flex justify-content-center align-items-center';

    const span = document.createElement('span');
    span.className = 'display-3 text-muted opacity-25';

    const icon = document.createElement('i');
    icon.className = 'bi bi-gavel';

    span.appendChild(icon);
    ratio.appendChild(span);
    mainImgEl.appendChild(ratio);
    return;
  }

  const main = media[0];
  const mainImg = document.createElement('img');
  mainImg.src = main.url;
  mainImg.alt = main.alt;
  mainImg.className = 'img-fluid w-100';
  mainImgEl.appendChild(mainImg);

  media.forEach((item) => {
    const col = document.createElement('div');
    col.className = 'col-3';

    const borderDiv = document.createElement('div');
    borderDiv.className = 'border';

    const thumbImg = document.createElement('img');
    thumbImg.src = item.url;
    thumbImg.alt = item.alt || 'Listing thumbnail';
    thumbImg.className = 'img-fluid';
    thumbImg.style.cursor = 'pointer';

    thumbImg.addEventListener('click', () => {
      clearElement(mainImgEl);
      const clickedImg = document.createElement('img');
      clickedImg.src = item.url;
      clickedImg.alt = item.alt || listing.title || 'Listing image';
      clickedImg.className = 'img-fluid w-100';
      mainImgEl.appendChild(clickedImg);
    });

    borderDiv.appendChild(thumbImg);
    col.appendChild(borderDiv);
    thumbsEl.appendChild(col);
  });
}

/**
 * Render the bid history list for a listing.
 *
 * @param {Object[]} bids - Array of bid objects.
 * @param {HTMLElement|null} historyEl - Container element for the bid history.
 * @returns {void}
 */
function renderBidHistory(bids, historyEl) {
  if (!historyEl) return;

  clearElement(historyEl);

  if (!bids.length) {
    const p = document.createElement('p');
    p.className = 'text-muted py-3';
    p.textContent = 'No bids yet';
    historyEl.appendChild(p);
    return;
  }

  bids.forEach((bid) => {
    const row = document.createElement('div');
    row.className = 'd-flex justify-content-between py-3 border-bottom';

    const left = document.createElement('div');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'fw-semibold';

    const bidderName = bid && bid.bidder && bid.bidder.name ? bid.bidder.name : 'Unknown bidder';

    nameSpan.textContent = bidderName;
    left.appendChild(nameSpan);

    if (bid && bid.created) {
      const createdDate = new Date(bid.created);
      if (!Number.isNaN(createdDate.getTime())) {
        const timeSpan = document.createElement('span');
        timeSpan.className = 'ms-1 small text-muted';
        timeSpan.textContent = createdDate.toLocaleString();
        left.appendChild(timeSpan);
      }
    }

    const right = document.createElement('div');
    right.className = 'fw-semibold';

    const amount = bid && typeof bid.amount === 'number' ? bid.amount : 0;
    right.textContent = `${amount} credits`;

    row.appendChild(left);
    row.appendChild(right);
    historyEl.appendChild(row);
  });
}
