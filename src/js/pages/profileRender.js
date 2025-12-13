import { deleteListing, getListingById } from '../api/listingsApi.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';
import {
  clearElement,
  confirmAction,
  createEndedBadge,
  createWonBadge,
  getInitials,
  parseDate,
} from './profileUtils.js';

/**
 * Render a profile avatar (image or initials) into a wrapper element.
 *
 * @param {HTMLElement|null} wrapper - Target container for the avatar.
 * @param {Object} profile - Profile object from the API.
 * @returns {void}
 */
const renderAvatarInto = (wrapper, profile) => {
  if (!wrapper || !profile) return;

  clearElement(wrapper);

  const avatar = profile.avatar || {};
  const avatarUrl = avatar.url || '';
  const avatarAlt = avatar.alt || profile.name || 'Profile avatar';

  if (avatarUrl) {
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = avatarAlt;
    img.className = 'img-fluid rounded-circle';
    wrapper.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.textContent = getInitials(profile.name);
    span.className = 'fw-semibold';
    wrapper.appendChild(span);
  }
};

/**
 * Update header visibility and credits based on the loaded profile.
 *
 * @param {Object} profile - Profile object from the API.
 * @param {HTMLElement|null} headerLoggedOut
 * @param {HTMLElement|null} headerLoggedIn
 * @param {NodeListOf<HTMLElement>} headerCreditsEls
 * @returns {void}
 */
export const updateHeaderState = (profile, headerLoggedOut, headerLoggedIn, headerCreditsEls) => {
  if (!profile) return;

  if (headerLoggedOut) headerLoggedOut.classList.add('d-none');
  if (headerLoggedIn) headerLoggedIn.classList.remove('d-none');

  const credits = typeof profile.credits === 'number' ? profile.credits : 0;

  headerCreditsEls.forEach((el) => {
    if (!el) return;
    el.textContent = `Credits: ${credits}`;
  });
};

/**
 * Update the profile hero area.
 *
 * @param {Object} profile
 * @param {HTMLElement|null} bannerEl
 * @param {HTMLElement|null} profileTitleEl
 * @param {HTMLElement|null} profileBioEl
 * @param {HTMLElement|null} avatarMobileWrapper
 * @param {HTMLElement|null} avatarDesktopWrapper
 * @returns {void}
 */
export const updateProfileHero = (
  profile,
  bannerEl,
  profileTitleEl,
  profileBioEl,
  avatarMobileWrapper,
  avatarDesktopWrapper,
) => {
  if (!profile) return;

  if (profileTitleEl) {
    profileTitleEl.textContent = profile.name || 'My Profile';
  }

  if (profileBioEl) {
    const bio =
      profile.bio && profile.bio.trim() ? profile.bio : 'This is a very short bio about me.';
    profileBioEl.textContent = bio;
  }

  if (bannerEl) {
    const banner = profile.banner || {};
    const bannerUrl = banner.url || '';

    if (bannerUrl) {
      bannerEl.style.backgroundImage = `url("${bannerUrl}")`;
      bannerEl.style.backgroundSize = 'cover';
      bannerEl.style.backgroundPosition = 'center';
    } else {
      bannerEl.style.backgroundImage = '';
    }
  }

  renderAvatarInto(avatarMobileWrapper, profile);
  renderAvatarInto(avatarDesktopWrapper, profile);
};

// =========================
// Active listings – card actions
// =========================

/**
 * Wire actions for an "My listing" card (edit, delete, view).
 *
 * @param {HTMLElement|null} cardColEl
 * @param {string|null} listingId
 * @returns {void}
 */
const setupMyListingCardActions = (cardColEl, listingId) => {
  if (!cardColEl || !listingId) return;

  if (cardColEl.dataset.boundActions === '1') return;
  cardColEl.dataset.boundActions = '1';

  const editIconBtn = cardColEl.querySelector('[data-edit-listing-btn]');
  const footerEditBtn = cardColEl.querySelector('[data-listing-edit-link]');
  const deleteBtn = cardColEl.querySelector('[data-listing-delete-btn]');
  const viewLink = cardColEl.querySelector('[data-listing-view-link]');

  const goToEdit = () => {
    window.location.href = `listing-edit.html?id=${encodeURIComponent(listingId)}`;
  };

  if (editIconBtn) {
    editIconBtn.addEventListener('click', (event) => {
      event.preventDefault();
      goToEdit();
    });
  }

  if (footerEditBtn) {
    footerEditBtn.addEventListener('click', (event) => {
      event.preventDefault();
      goToEdit();
    });
  }

  if (viewLink) {
    const url = `listing.html?id=${encodeURIComponent(listingId)}`;
    viewLink.href = url;
    viewLink.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.href = url;
    });
  }

  if (!deleteBtn) return;

  deleteBtn.addEventListener('click', async (event) => {
    event.preventDefault();

    const confirmed = await confirmAction('Are you sure you want to delete this listing?', {
      title: 'Delete listing?',
      confirmText: 'Yes, delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    showLoader();

    try {
      await deleteListing(listingId);
      cardColEl.remove();

      showAlert('success', 'Listing deleted', 'Your listing has been deleted.');

      const row = document.querySelector('#my-listings .row');
      const remainingCards = row
        ? row.querySelectorAll('.col:not([data-my-listing-template])')
        : [];
      const emptyMessage = document.querySelector('[data-my-listings-empty]');

      if (emptyMessage && (!remainingCards || remainingCards.length === 0)) {
        emptyMessage.classList.remove('d-none');
      }
    } catch (error) {
      const msg =
        error && error.message ? error.message : 'Could not delete this listing. Please try again.';
      showAlert('error', 'Delete failed', msg);
    } finally {
      hideLoader();
    }
  });
};

/**
 * Get the highest bid amount from a listing object.
 *
 * @param {Object} listing
 * @returns {number}
 */
const getHighestBidAmount = (listing) => {
  if (!listing || !Array.isArray(listing.bids) || !listing.bids.length) return 0;

  return listing.bids.reduce((max, bid) => {
    const amount = bid && typeof bid.amount === 'number' ? bid.amount : 0;
    return amount > max ? amount : max;
  }, 0);
};

// =========================
// My listings
// =========================

/**
 * Render "My listings" cards for the profile.
 *
 * @param {Object} profile
 * @param {boolean} isOwnProfile
 * @returns {Promise<void>}
 */
export const renderMyListings = async (profile, isOwnProfile) => {
  const container = document.querySelector('#my-listings');
  if (!container) return;

  const row = container.querySelector('.row');
  const templateCol = container.querySelector('[data-my-listing-template]');
  const emptyMessage = container.querySelector('[data-my-listings-empty]');

  if (!row || !templateCol) return;

  const listings = Array.isArray(profile.listings) ? profile.listings : [];

  row.querySelectorAll('.col:not([data-my-listing-template])').forEach((col) => col.remove());

  if (!listings.length) {
    if (emptyMessage) emptyMessage.classList.remove('d-none');
    return;
  }

  if (emptyMessage) emptyMessage.classList.add('d-none');

  const detailedListings = await Promise.all(
    listings.map(async (listing) => {
      if (!listing || !listing.id) return listing;
      try {
        const detailed = await getListingById(listing.id, '?_bids=true');
        if (!detailed) return listing;
        return {
          ...listing,
          bids: Array.isArray(detailed.bids) ? detailed.bids : listing.bids,
          _count: detailed._count || listing._count,
          endsAt: detailed.endsAt || listing.endsAt,
        };
      } catch {
        return listing;
      }
    }),
  );

  const now = new Date();

  detailedListings.forEach((listing) => {
    if (!listing) return;

    const col = templateCol.cloneNode(true);
    col.classList.remove('d-none');
    col.removeAttribute('data-my-listing-template');

    const titleEl = col.querySelector('[data-listing-title]');
    const usernameEl = col.querySelector('[data-listing-username]');
    const bidsCountEl = col.querySelector('[data-listing-bids-count]');
    const highestBidStripEl = col.querySelector('[data-listing-highest-bid]');
    const endsInEl = col.querySelector('[data-listing-ends-in]');
    const imageWrapper = col.querySelector('[data-listing-image-wrapper]');
    const mediaWrapper = imageWrapper ? imageWrapper.parentElement : null;

    if (titleEl) {
      titleEl.textContent = listing.title || 'Untitled listing';
    }

    const sellerName =
      (listing.seller && listing.seller.name) || (profile && profile.name) || 'Unknown';

    if (usernameEl) {
      usernameEl.textContent = sellerName;
      usernameEl.href = `profile.html?name=${encodeURIComponent(sellerName)}`;
    }

    const totalBids =
      listing._count && typeof listing._count.bids === 'number'
        ? listing._count.bids
        : Array.isArray(listing.bids)
          ? listing.bids.length
          : 0;

    if (bidsCountEl) {
      bidsCountEl.textContent = String(totalBids);
    }

    const highestAmount = getHighestBidAmount(listing);

    if (highestBidStripEl) {
      if (highestAmount > 0) {
        highestBidStripEl.textContent = `Highest bid: ${highestAmount} credits`;
      } else if (totalBids > 0) {
        highestBidStripEl.textContent = 'Highest bid: view listing';
      } else {
        highestBidStripEl.textContent = 'Highest bid: 0 credits';
      }
    }

    const endsDate = parseDate(listing.endsAt);
    const isEnded = !!endsDate && endsDate <= now;

    if (endsInEl) {
      if (isEnded) {
        endsInEl.textContent = 'Auction ended';
      } else if (endsDate) {
        endsInEl.textContent = endsDate.toLocaleString();
      }
    }

    if (mediaWrapper && isEnded) {
      mediaWrapper.appendChild(createEndedBadge());
    }

    if (imageWrapper) {
      const media = Array.isArray(listing.media) ? listing.media : [];
      const first = media[0];

      if (first && first.url) {
        clearElement(imageWrapper);
        const img = document.createElement('img');
        img.src = first.url;
        img.alt = first.alt || listing.title || 'Listing image';
        img.className = 'img-fluid w-100 h-100';
        img.style.objectFit = 'cover';
        imageWrapper.appendChild(img);
      }
    }

    const viewLink = col.querySelector('[data-listing-view-link]');
    if (viewLink && listing.id) {
      const url = `listing.html?id=${encodeURIComponent(listing.id)}`;
      viewLink.href = url;
      viewLink.addEventListener('click', (event) => {
        event.preventDefault();
        window.location.href = url;
      });
    }

    if (!isOwnProfile) {
      const editIconBtn = col.querySelector('[data-edit-listing-btn]');
      const footerEditBtn = col.querySelector('[data-listing-edit-link]');
      const deleteBtn = col.querySelector('[data-listing-delete-btn]');

      if (editIconBtn) editIconBtn.classList.add('d-none');
      if (footerEditBtn) footerEditBtn.classList.add('d-none');
      if (deleteBtn) deleteBtn.classList.add('d-none');
    } else if (listing.id) {
      setupMyListingCardActions(col, listing.id);
    }

    row.appendChild(col);
  });
};

// =========================
// My bids
// =========================

/**
 * Render the "My bids" section.
 *
 * @param {Array} bids
 * @param {Array} wins
 * @returns {void}
 */
export const renderMyBids = (bids, wins) => {
  const container = document.querySelector('#my-bids');
  if (!container) return;

  const emptyMessage = container.querySelector('[data-my-bids-empty]');
  const existingList = container.querySelector('[data-my-bids-list]');
  if (existingList) existingList.remove();

  const safeBids = Array.isArray(bids) ? bids : [];
  const winsArray = Array.isArray(wins) ? wins : [];

  const wonListingIds = new Set(
    winsArray.map((listing) => (listing && listing.id ? listing.id : null)).filter(Boolean),
  );

  if (!safeBids.length) {
    if (emptyMessage) emptyMessage.classList.remove('d-none');
    return;
  }

  if (emptyMessage) emptyMessage.classList.add('d-none');

  const listWrapper = document.createElement('div');
  listWrapper.setAttribute('data-my-bids-list', '');
  listWrapper.className = 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4';

  const now = new Date();

  safeBids.forEach((bid) => {
    const col = document.createElement('div');
    col.className = 'col';

    const card = document.createElement('article');
    card.className = 'card sb-card h-100 rounded-0';

    const listing = bid && bid.listing && typeof bid.listing === 'object' ? bid.listing : null;
    const listingTitle = (listing && listing.title) || 'Unknown listing';
    const listingId = (listing && listing.id) || null;
    const media = listing && Array.isArray(listing.media) ? listing.media : [];
    const firstMedia = media[0];

    const mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'position-relative';

    const ratio = document.createElement('div');
    ratio.className = 'ratio ratio-4x3 bg-light d-flex align-items-center justify-content-center';

    if (firstMedia && firstMedia.url) {
      const img = document.createElement('img');
      img.src = firstMedia.url;
      img.alt = firstMedia.alt || listingTitle || 'Listing image';
      img.className = 'img-fluid w-100 h-100';
      img.style.objectFit = 'cover';
      ratio.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.className = 'display-5 text-muted opacity-25';
      const icon = document.createElement('i');
      icon.className = 'bi bi-gavel';
      span.appendChild(icon);
      ratio.appendChild(span);
    }

    mediaWrapper.appendChild(ratio);

    const endsDate = listing ? parseDate(listing.endsAt) : null;
    const isEnded = !!endsDate && endsDate <= now;
    const isWon = listingId && wonListingIds.has(listingId);

    if (isEnded) mediaWrapper.appendChild(createEndedBadge());
    if (isWon) mediaWrapper.appendChild(createWonBadge('end'));

    const body = document.createElement('div');
    body.className = 'card-body';

    const titleEl = document.createElement('h3');
    titleEl.className = 'mb-2 h5';
    titleEl.textContent = listingTitle;

    const amountP = document.createElement('p');
    amountP.className = 'mb-1';

    const label = document.createElement('span');
    label.className = 'fw-semibold';
    label.textContent = 'Your bid:';

    const amountText = document.createTextNode(
      ` ${typeof bid.amount === 'number' ? `${bid.amount} credits` : '-'}`,
    );

    amountP.appendChild(label);
    amountP.appendChild(amountText);

    const timeP = document.createElement('p');
    timeP.className = 'mb-0 text-muted small';

    const createdDate = parseDate(bid.created);
    if (createdDate) {
      timeP.textContent = `Placed on ${createdDate.toLocaleString()}`;
    }

    body.appendChild(titleEl);
    body.appendChild(amountP);
    body.appendChild(timeP);

    const footer = document.createElement('div');
    footer.className = 'card-footer border-0 p-0 rounded-0';

    const footerInner = document.createElement('div');
    footerInner.className = 'btn-group w-100';

    const viewLink = document.createElement('a');
    viewLink.className = 'btn card-action-btn card-action-btn--view';
    viewLink.textContent = 'View listing';
    viewLink.href = listingId ? `listing.html?id=${encodeURIComponent(listingId)}` : '#';

    footerInner.appendChild(viewLink);
    footer.appendChild(footerInner);

    card.appendChild(mediaWrapper);
    card.appendChild(body);
    card.appendChild(footer);

    col.appendChild(card);
    listWrapper.appendChild(col);
  });

  container.appendChild(listWrapper);
};

// =========================
// My wins
// =========================

/**
 * Render the "My wins" section.
 *
 * @param {Array} wins
 * @returns {void}
 */
export const renderMyWins = (wins) => {
  const container = document.querySelector('#my-wins');
  if (!container) return;

  const emptyMessage = container.querySelector('[data-my-wins-empty]');
  const existingList = container.querySelector('[data-my-wins-list]');
  if (existingList) existingList.remove();

  const safeWins = Array.isArray(wins) ? wins : [];

  if (!safeWins.length) {
    if (emptyMessage) emptyMessage.classList.remove('d-none');
    return;
  }

  if (emptyMessage) emptyMessage.classList.add('d-none');

  const listWrapper = document.createElement('div');
  listWrapper.setAttribute('data-my-wins-list', '');
  listWrapper.className = 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4';

  const now = new Date();

  safeWins.forEach((listing) => {
    if (!listing) return;

    const col = document.createElement('div');
    col.className = 'col';

    const card = document.createElement('article');
    card.className = 'card sb-card h-100 rounded-0';

    const listingTitle = listing.title || 'Unknown listing';
    const listingId = listing.id || null;
    const media = Array.isArray(listing.media) ? listing.media : [];
    const firstMedia = media[0];

    const mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'position-relative';

    const ratio = document.createElement('div');
    ratio.className = 'ratio ratio-4x3 bg-light d-flex align-items-center justify-content-center';

    if (firstMedia && firstMedia.url) {
      const img = document.createElement('img');
      img.src = firstMedia.url;
      img.alt = firstMedia.alt || listingTitle || 'Listing image';
      img.className = 'img-fluid w-100 h-100';
      img.style.objectFit = 'cover';
      ratio.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.className = 'display-5 text-muted opacity-25';
      const icon = document.createElement('i');
      icon.className = 'bi bi-gift';
      span.appendChild(icon);
      ratio.appendChild(span);
    }

    mediaWrapper.appendChild(ratio);

    const endsDate = parseDate(listing.endsAt);
    const isEnded = !!endsDate && endsDate <= now;

    if (isEnded) {
      mediaWrapper.appendChild(createEndedBadge());
    }

    mediaWrapper.appendChild(createWonBadge('end'));

    const body = document.createElement('div');
    body.className = 'card-body';

    const titleEl = document.createElement('h3');
    titleEl.className = 'mb-2 h5';
    titleEl.textContent = listingTitle;

    const infoP = document.createElement('p');
    infoP.className = 'mb-0 text-muted small';

    if (endsDate) {
      infoP.textContent = `Ended on ${endsDate.toLocaleString()}`;
    }

    body.appendChild(titleEl);
    body.appendChild(infoP);

    const footer = document.createElement('div');
    footer.className = 'card-footer border-0 p-0 rounded-0';

    const footerInner = document.createElement('div');
    footerInner.className = 'btn-group w-100';

    const viewLink = document.createElement('a');
    viewLink.className = 'btn card-action-btn card-action-btn--view';
    viewLink.textContent = 'View listing';
    viewLink.href = listingId ? `listing.html?id=${encodeURIComponent(listingId)}` : '#';

    footerInner.appendChild(viewLink);
    footer.appendChild(footerInner);

    card.appendChild(mediaWrapper);
    card.appendChild(body);
    card.appendChild(footer);

    col.appendChild(card);
    listWrapper.appendChild(col);
  });

  container.appendChild(listWrapper);
};
