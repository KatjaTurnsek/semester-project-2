import { getAuth, clearAuth } from '../api/httpClient.js';
import { getProfile, getProfileBids, getProfileWins, updateProfile } from '../api/profilesApi.js';
import { deleteListing, getListingById } from '../api/listingsApi.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';

// DOM references

const headerLoggedOut = document.querySelector('[data-header="logged-out"]');
const headerLoggedIn = document.querySelector('[data-header="logged-in"]');
const headerCreditsEls = document.querySelectorAll('[data-header-credits]');

const bannerEl = document.querySelector('.sb-profile-banner');
const profileTitleEl = document.querySelector('.sb-profile-title');
const profileBioEl = document.querySelector('.sb-profile-header-text p');

const avatarMobileWrapper = document.querySelector('.sb-profile-avatar--mobile');
const avatarDesktopWrapper = document.querySelector('.sb-profile-avatar--desktop');

const editProfileButton = document.querySelector('#editProfileButton');
const editProfileSection = document.querySelector('[data-profile-edit-section]');
const editProfileForm = document.querySelector('[data-profile-edit-form]');
const editMessageEl = document.querySelector('[data-profile-edit-message]');

const avatarUrlInput = document.querySelector('#profileAvatarUrl');
const avatarAltInput = document.querySelector('#profileAvatarAlt');
const bannerUrlInput = document.querySelector('#profileBannerUrl');
const bannerAltInput = document.querySelector('#profileBannerAlt');
const bioInput = document.querySelector('#profileBio');

const editCancelButton = document.querySelector('[data-profile-edit="cancel"]');

// Small helpers

const redirectToLogin = () => {
  window.location.href = 'login.html';
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const createEndedBadge = () => {
  const span = document.createElement('span');
  span.className = 'badge-ended position-absolute top-0 start-0 m-2';
  span.textContent = 'ENDED';
  return span;
};

const createWonBadge = (position = 'end') => {
  const side = position === 'start' ? 'start' : 'end';
  const span = document.createElement('span');
  span.className = `badge-won position-absolute top-0 ${side}-0 m-2`;
  span.textContent = 'WON';
  return span;
};

const getInitials = (name) => {
  if (!name) return '?';

  const trimmed = String(name).trim();
  if (!trimmed) return '?';

  const parts = trimmed.split(/[\s_]+/).filter(Boolean);

  if (parts.length === 1) {
    const single = parts[0];
    if (single.length === 1) return single[0].toUpperCase();
    return (single[0] + single[1]).toUpperCase();
  }

  const first = parts[0][0] || '';
  const last = parts[parts.length - 1][0] || '';
  return (first + last).toUpperCase();
};

const renderAvatarInto = (wrapper, profile) => {
  if (!wrapper || !profile) return;

  wrapper.innerHTML = '';

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

const updateHeaderState = (profile) => {
  if (!profile) return;

  if (headerLoggedOut) headerLoggedOut.classList.add('d-none');
  if (headerLoggedIn) headerLoggedIn.classList.remove('d-none');

  const credits = typeof profile.credits === 'number' ? profile.credits : 0;

  headerCreditsEls.forEach((el) => {
    if (!el) return;
    el.textContent = 'Credits: ' + credits;
  });
};

const updateProfileHero = (profile) => {
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

const clearEditMessage = () => {
  if (!editMessageEl) return;
  editMessageEl.textContent = '';
  editMessageEl.className = 'alert d-none';
};

const showEditMessage = (text, type) => {
  if (editMessageEl) {
    editMessageEl.textContent = '';
    editMessageEl.className = 'alert d-none';
  }

  let alertType = 'info';
  let title = 'Notice';

  if (type === 'success') {
    alertType = 'success';
    title = 'All set!';
  } else if (type === 'error') {
    alertType = 'error';
    title = 'Something went wrong';
  }

  showAlert(alertType, title, text);
};

const showEditSection = () => {
  if (editProfileSection) editProfileSection.classList.remove('d-none');
};

const hideEditSection = () => {
  if (editProfileSection) editProfileSection.classList.add('d-none');
};

const getProfileNameFromQuery = () => {
  const search = window.location.search || '';
  const withoutQuestionMark = search.startsWith('?') ? search.slice(1) : search;
  const pairs = withoutQuestionMark.split('&').filter(Boolean);

  for (let i = 0; i < pairs.length; i += 1) {
    const [key, value] = pairs[i].split('=');
    if (key === 'name') {
      return decodeURIComponent(value || '');
    }
  }

  return null;
};

// Tabs helper: activate correct tab from hash

const activateTab = (paneId) => {
  const panes = document.querySelectorAll('.tab-pane');
  panes.forEach((pane) => pane.classList.remove('show', 'active'));

  const links = document.querySelectorAll('#profileTabs .nav-link');
  links.forEach((link) => {
    link.classList.remove('active');
    link.setAttribute('aria-selected', 'false');
  });

  const pane = document.getElementById(paneId);
  if (!pane) return;

  let relatedButtonId = '';

  if (paneId === 'tab-active') relatedButtonId = 'tab-active-tab';
  if (paneId === 'tab-bids') relatedButtonId = 'tab-bids-tab';
  if (paneId === 'tab-wins') relatedButtonId = 'tab-wins-tab';

  const button = relatedButtonId ? document.getElementById(relatedButtonId) : null;

  pane.classList.add('show', 'active');

  if (button) {
    button.classList.add('active');
    button.setAttribute('aria-selected', 'true');
  }
};

const activateTabFromHash = () => {
  const hash = window.location.hash || '';

  if (hash === '#my-bids') {
    activateTab('tab-bids');
  } else if (hash === '#my-listings') {
    activateTab('tab-active');
  } else if (hash === '#my-wins') {
    activateTab('tab-wins');
  }
};

// Active listings – card actions

const setupMyListingCardActions = (cardColEl, listingId) => {
  if (!cardColEl || !listingId) return;

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

    const confirmed = window.confirm('Are you sure you want to delete this listing?');
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

const getHighestBidAmount = (listing) => {
  if (!listing || !Array.isArray(listing.bids) || !listing.bids.length) return 0;

  return listing.bids.reduce((max, bid) => {
    const amount = bid && typeof bid.amount === 'number' ? bid.amount : 0;
    return amount > max ? amount : max;
  }, 0);
};

// My listings

const renderMyListings = async (profile, isOwnProfile) => {
  const container = document.querySelector('#my-listings');
  if (!container) return;

  const row = container.querySelector('.row');
  const templateCol = container.querySelector('[data-my-listing-template]');
  const emptyMessage = container.querySelector('[data-my-listings-empty]');

  if (!row || !templateCol) return;

  const listings = Array.isArray(profile.listings) ? profile.listings : [];

  // Clear previous rendered cards (keep template)
  row.querySelectorAll('.col:not([data-my-listing-template])').forEach((col) => col.remove());

  if (!listings.length) {
    if (emptyMessage) emptyMessage.classList.remove('d-none');
    return;
  }

  if (emptyMessage) emptyMessage.classList.add('d-none');

  // Fetch detailed info (bids, endsAt)
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

    // ENDED badge for own ended listings
    if (mediaWrapper && isEnded) {
      mediaWrapper.appendChild(createEndedBadge());
    }

    if (imageWrapper) {
      const media = Array.isArray(listing.media) ? listing.media : [];
      const first = media[0];

      if (first && first.url) {
        imageWrapper.innerHTML = '';
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

// My bids

const renderMyBids = (bids, wins) => {
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

    if (isEnded) {
      mediaWrapper.appendChild(createEndedBadge());
    }

    if (isWon) {
      mediaWrapper.appendChild(createWonBadge('end'));
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    const titleEl = document.createElement('h3');
    titleEl.className = 'mb-2 h5';
    titleEl.textContent = listingTitle;

    const amountP = document.createElement('p');
    amountP.className = 'mb-1';
    amountP.innerHTML =
      '<span class="fw-semibold">Your bid:</span> ' +
      (typeof bid.amount === 'number' ? `${bid.amount} credits` : '-');

    const timeP = document.createElement('p');
    timeP.className = 'mb-0 text-muted small';

    const createdDate = parseDate(bid.created);
    if (createdDate) {
      timeP.textContent = 'Placed on ' + createdDate.toLocaleString();
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

// My wins

const renderMyWins = (wins) => {
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
      infoP.textContent = 'Ended on ' + endsDate.toLocaleString();
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

// Edit form wiring

const setupEditProfileForm = (profile, authName, isOwnProfile) => {
  if (!isOwnProfile) {
    if (editProfileButton) editProfileButton.classList.add('d-none');
    if (editProfileSection) editProfileSection.classList.add('d-none');
    return;
  }

  if (!editProfileButton || !editProfileForm) return;

  const fillFormFromProfile = (p) => {
    if (!p) return;

    const avatar = p.avatar || {};
    const banner = p.banner || {};

    if (avatarUrlInput) avatarUrlInput.value = avatar.url || '';
    if (avatarAltInput) avatarAltInput.value = avatar.alt || '';
    if (bannerUrlInput) bannerUrlInput.value = banner.url || '';
    if (bannerAltInput) bannerAltInput.value = banner.alt || '';
    if (bioInput) bioInput.value = p.bio || '';
  };

  editProfileButton.addEventListener('click', (event) => {
    event.preventDefault();
    clearEditMessage();
    fillFormFromProfile(profile);
    showEditSection();
  });

  if (editCancelButton) {
    editCancelButton.addEventListener('click', (event) => {
      event.preventDefault();
      clearEditMessage();
      hideEditSection();
    });
  }

  editProfileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearEditMessage();

    if (!authName) {
      clearAuth();
      redirectToLogin();
      return;
    }

    const avatarUrl = avatarUrlInput ? String(avatarUrlInput.value || '').trim() : '';
    const avatarAlt = avatarAltInput ? String(avatarAltInput.value || '').trim() : '';
    const bannerUrl = bannerUrlInput ? String(bannerUrlInput.value || '').trim() : '';
    const bannerAlt = bannerAltInput ? String(bannerAltInput.value || '').trim() : '';
    const bio = bioInput ? String(bioInput.value || '').trim() : '';

    const payload = {};

    if (bio) payload.bio = bio;

    if (avatarUrl) {
      payload.avatar = {
        url: avatarUrl,
        alt: avatarAlt || '',
      };
    }

    if (bannerUrl) {
      payload.banner = {
        url: bannerUrl,
        alt: bannerAlt || '',
      };
    }

    if (Object.keys(payload).length === 0) {
      showEditMessage('Please update at least one field before saving.', 'error');
      return;
    }

    showLoader();

    try {
      const updatedProfile = await updateProfile(authName, payload);

      const mergedProfile = {
        ...profile,
        ...updatedProfile,
        avatar: updatedProfile.avatar || profile.avatar,
        banner: updatedProfile.banner || profile.banner,
        bio: typeof updatedProfile.bio === 'string' ? updatedProfile.bio : profile.bio,
      };

      updateProfileHero(mergedProfile);
      hideEditSection();

      showEditMessage('Your profile has been updated successfully.', 'success');

      profile.name = mergedProfile.name;
      profile.bio = mergedProfile.bio;
      profile.avatar = mergedProfile.avatar;
      profile.banner = mergedProfile.banner;
    } catch (error) {
      const msg =
        error && error.message ? error.message : 'Could not update your profile. Please try again.';
      showEditMessage(msg, 'error');
    } finally {
      hideLoader();
    }
  });
};

// Main init

const initProfilePage = async () => {
  const auth = getAuth();
  const queryName = getProfileNameFromQuery();
  const profileNameToLoad = queryName || (auth && auth.name ? auth.name : null);

  if (!profileNameToLoad) {
    redirectToLogin();
    return;
  }

  const isOwnProfile = !!auth && auth.name === profileNameToLoad;

  showLoader();

  try {
    const profilePromise = getProfile(profileNameToLoad, '?_listings=true');
    const bidsPromise = isOwnProfile
      ? getProfileBids(profileNameToLoad, '?_listings=true')
      : Promise.resolve([]);
    const winsPromise = isOwnProfile
      ? getProfileWins(profileNameToLoad, '?_listings=true')
      : Promise.resolve([]);

    const [profile, bids, wins] = await Promise.all([profilePromise, bidsPromise, winsPromise]);

    if (!profile) {
      if (isOwnProfile) {
        clearAuth();
        redirectToLogin();
      } else {
        window.location.href = 'index.html';
      }
      return;
    }

    if (isOwnProfile) {
      updateHeaderState(profile);
    }

    updateProfileHero(profile);
    await renderMyListings(profile, isOwnProfile);
    renderMyBids(bids, wins);
    renderMyWins(wins);

    setupEditProfileForm(profile, isOwnProfile ? auth.name : null, isOwnProfile);

    activateTabFromHash();
  } catch {
    if (isOwnProfile) {
      clearAuth();
      redirectToLogin();
    } else {
      window.location.href = 'index.html';
    }
  } finally {
    hideLoader();
  }
};

window.addEventListener('hashchange', activateTabFromHash);
initProfilePage();
