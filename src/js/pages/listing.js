import { getListingById, placeBid } from '../api/listingsApi.js';
import { getAuth } from '../api/httpClient.js';
import { getProfile } from '../api/profilesApi.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';
import { refreshHeaderFromProfile } from '../ui/header.js';

/* ------------------------
   Init
------------------------- */

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

/* ------------------------
   Query parsing
------------------------- */

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

/* ------------------------
   Rendering
------------------------- */

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

  if (titleEl) {
    titleEl.textContent = listing.title || 'Untitled listing';
  }

  if (descriptionEl) {
    clearElement(descriptionEl);
    const p = document.createElement('p');
    p.textContent = listing.description || 'No description provided.';
    descriptionEl.appendChild(p);
  }

  if (tagsEl) {
    clearElement(tagsEl);
    const tags = Array.isArray(listing.tags) ? listing.tags.filter(Boolean) : [];

    if (tags.length > 0) {
      for (let i = 0; i < tags.length; i += 1) {
        const tag = tags[i];
        const span = document.createElement('span');
        span.className = 'badge rounded-pill text-bg-light border';
        span.textContent = tag;
        tagsEl.appendChild(span);
      }
    } else {
      const span = document.createElement('span');
      span.className = 'badge rounded-pill text-bg-light border';
      span.textContent = 'No tags';
      tagsEl.appendChild(span);
    }
  }

  const sellerName = listing.seller && listing.seller.name ? listing.seller.name : 'Unknown seller';

  if (sellerNameEl) {
    sellerNameEl.textContent = sellerName;
  }

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

    const avatarObj = listing.seller && listing.seller.avatar ? listing.seller.avatar : null;
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

  if (mainImgEl && thumbsEl) {
    clearElement(mainImgEl);
    clearElement(thumbsEl);

    const rawMedia = Array.isArray(listing.media) ? listing.media.filter(Boolean) : [];

    const media = rawMedia
      .map((item) => {
        if (!item) return null;

        if (typeof item === 'string') {
          return { url: item, alt: listing.title || 'Listing image' };
        }

        const url = item.url || '';
        const alt = item.alt || listing.title || 'Listing image';
        if (!url) return null;

        return { url, alt };
      })
      .filter(Boolean);

    if (media.length > 0) {
      const main = media[0];

      const mainImg = document.createElement('img');
      mainImg.src = main.url;
      mainImg.alt = main.alt;
      mainImg.className = 'img-fluid w-100';
      mainImgEl.appendChild(mainImg);

      for (let i = 0; i < media.length; i += 1) {
        const item = media[i];

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
      }
    } else {
      const ratio = document.createElement('div');
      ratio.className =
        'ratio ratio-16x9 bg-light d-flex justify-content-center align-items-center';

      const span = document.createElement('span');
      span.className = 'display-3 text-muted opacity-25';

      const icon = document.createElement('i');
      icon.className = 'bi bi-gavel';

      span.appendChild(icon);
      ratio.appendChild(span);
      mainImgEl.appendChild(ratio);
    }
  }

  /* ------------------------
   Stats
------------------------- */

  const bidsRaw = Array.isArray(listing.bids) ? listing.bids : [];
  const bids = bidsRaw.slice().sort((a, b) => b.amount - a.amount);
  const highestBid = bids.length > 0 ? bids[0].amount : null;

  if (bidCountEl) {
    bidCountEl.textContent = String(bids.length);
  }

  if (highestBidEl) {
    highestBidEl.textContent = highestBid ? highestBid + ' credits' : 'No bids yet';
  }

  const now = new Date();
  const endsAt = listing.endsAt ? new Date(listing.endsAt) : null;

  if (timeLeftEl) {
    if (!endsAt || Number.isNaN(endsAt.getTime())) {
      timeLeftEl.textContent = 'Unknown end time';
    } else if (endsAt <= now) {
      timeLeftEl.textContent = 'Auction ended';
      disableBidForm('This auction has ended.');
    } else {
      const diffMs = endsAt.getTime() - now.getTime();
      const totalMinutes = Math.floor(diffMs / 60000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      timeLeftEl.textContent = `Ends in ${days}d ${hours}h ${minutes}m`;
    }
  }

  if (historyEl) {
    clearElement(historyEl);

    if (bids.length === 0) {
      const p = document.createElement('p');
      p.className = 'text-muted py-3';
      p.textContent = 'No bids yet';
      historyEl.appendChild(p);
    } else {
      for (let i = 0; i < bids.length; i += 1) {
        const bid = bids[i];
        const row = document.createElement('div');
        row.className = 'd-flex justify-content-between py-3 border-bottom';

        const left = document.createElement('div');
        const nameSpan = document.createElement('span');
        nameSpan.className = 'fw-semibold';
        nameSpan.textContent = bid.bidderName || 'Unknown bidder';
        left.appendChild(nameSpan);

        if (bid.created) {
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
        right.textContent = bid.amount + ' credits';

        row.appendChild(left);
        row.appendChild(right);
        historyEl.appendChild(row);
      }
    }
  }
}

/* ------------------------
   Bid form
------------------------- */

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

  const sellerName = listing.seller && listing.seller.name ? listing.seller.name : null;
  if (sellerName && auth.name === sellerName) {
    disableBidForm('You cannot bid on your own listing.');
    showAlert('error', 'You are the seller', 'You can’t place bids on your own listing.');
    return;
  }

  const endsAt = listing.endsAt ? new Date(listing.endsAt) : null;
  if (!endsAt || endsAt <= new Date()) {
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

      // 1) Refetch and redraw listing (bids + highest bid)
      const updatedListing = await getListingById(listing.id, '?_seller=true&_bids=true');
      if (updatedListing) {
        renderListing(updatedListing);
      }

      // 2) Refresh credits under the form from profile
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

      // 3) Refresh header credits from latest profile
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

/* ------------------------
   Error message helper
------------------------- */

function extractBidErrorMessage(error) {
  let rawMessage = '';

  if (error && typeof error === 'object') {
    if (typeof error.message === 'string') {
      rawMessage = error.message;
    } else if (Array.isArray(error.errors) && error.errors[0]?.message) {
      rawMessage = error.errors[0].message;
    }
  }

  const lower = rawMessage.toLowerCase();

  if (lower.includes('higher') || lower.includes('too low') || lower.includes('maximum bid')) {
    return 'Your bid is too low. Please place a higher bid than the current highest bid.';
  }

  if (lower.includes('credit')) {
    return 'You do not have enough credits to place this bid.';
  }

  if (lower) {
    return rawMessage;
  }

  return 'Failed to place bid. Please try again.';
}

/* ------------------------
   Small helpers
------------------------- */

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

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/* ------------------------
   Run on load
------------------------- */

initListingDetailsPage();
