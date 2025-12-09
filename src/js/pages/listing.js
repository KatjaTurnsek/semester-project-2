import { getListingById, placeBid } from '../api/listingsApi.js';
import { getAuth } from '../api/httpClient.js';
import { getProfile } from '../api/profilesApi.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';
import { refreshHeaderFromProfile } from '../ui/header.js';

// Init

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
  } catch {
    if (titleEl) {
      titleEl.textContent = 'Failed to load listing';
    }
    showAlert(
      'error',
      'Something went wrong',
      'We could not load this listing right now. Please try again.',
    );
  } finally {
    hideLoader();
  }
}

// Query parsing (no URLSearchParams)

function getListingIdFromQuery() {
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

// Small DOM helpers

function setText(el, text) {
  if (el) {
    el.textContent = text;
  }
}

function clearElement(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

// Generic listing helpers

function isAuctionEnded(listing) {
  if (!listing || !listing.endsAt) return false;
  const endsAt = new Date(listing.endsAt);
  if (Number.isNaN(endsAt.getTime())) return false;
  return endsAt <= new Date();
}

function getSortedBids(listing) {
  const bidsRaw = listing && Array.isArray(listing.bids) ? listing.bids : [];
  return bidsRaw.slice().sort((a, b) => {
    const aAmount = a && typeof a.amount === 'number' ? a.amount : 0;
    const bAmount = b && typeof b.amount === 'number' ? b.amount : 0;
    return bAmount - aAmount;
  });
}

function formatTimeLeft(listing) {
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

  return 'Ends in ' + days + 'd ' + hours + 'h ' + minutes + 'm';
}

function normaliseMediaItem(item, fallbackAlt) {
  if (!item) return null;

  if (typeof item === 'string') {
    return { url: item, alt: fallbackAlt };
  }

  const url = item.url || '';
  if (!url) return null;

  return {
    url,
    alt: item.alt || fallbackAlt,
  };
}

// Owner edit button (only for seller)

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
    window.location.href = 'listing-edit.html?id=' + encodeURIComponent(listing.id);
  });
}

// Rendering

function renderListing(listing) {
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

  if (sellerLinkEl) {
    sellerLinkEl.setAttribute('href', 'profile.html?name=' + encodeURIComponent(sellerName));
  }

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

    const avatarObj =
      listing && listing.seller && listing.seller.avatar ? listing.seller.avatar : null;
    const avatarUrl = avatarObj && avatarObj.url ? avatarObj.url : '';
    const avatarAlt = (avatarObj && avatarObj.alt) || sellerName || 'Seller avatar';

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
  setText(highestBidEl, highestBid ? highestBid + ' credits' : 'No bids yet');

  if (timeLeftEl) {
    const endsAt = listing.endsAt ? new Date(listing.endsAt) : null;

    if (!endsAt || Number.isNaN(endsAt.getTime())) {
      timeLeftEl.textContent = 'Unknown end time';
    } else if (isAuctionEnded(listing)) {
      timeLeftEl.textContent = 'Auction ended';
      disableBidForm('This auction has ended.');
    } else {
      timeLeftEl.textContent = formatTimeLeft(listing);
    }
  }

  renderBidHistory(bids, historyEl);
}

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
    right.textContent = (bid && typeof bid.amount === 'number' ? bid.amount : 0) + ' credits';

    row.appendChild(left);
    row.appendChild(right);
    historyEl.appendChild(row);
  });
}

// Bid form

function setupBidForm(listing) {
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

// Error message helper

function extractBidErrorMessage(error) {
  let rawMessage = '';

  if (error && typeof error === 'object') {
    if (typeof error.message === 'string') {
      rawMessage = error.message;
    } else if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].message) {
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

// Small helpers

function disableBidForm(message) {
  const form = document.querySelector('[data-bid-form]');
  if (!form) return;

  clearElement(form);

  const p = document.createElement('p');
  p.className = 'text-muted mb-0';
  p.textContent = message;
  form.appendChild(p);
}

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

// Run on load

initListingDetailsPage();
