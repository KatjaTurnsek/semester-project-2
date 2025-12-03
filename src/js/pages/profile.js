import { getAuth, clearAuth } from '../api/httpClient.js';
import { getProfile, updateProfile } from '../api/profilesApi.js';
import { showLoader, hideLoader } from '../ui/loader.js';

/* ------------------------
   DOM references
------------------------- */

// Header variants
const headerLoggedOut = document.querySelector('[data-header="logged-out"]');
const headerLoggedIn = document.querySelector('[data-header="logged-in"]');

// Header credits (mobile + desktop)
const headerCreditsEls = document.querySelectorAll('[data-header-credits]');

// Profile hero
const bannerEl = document.querySelector('.sb-profile-banner');
const profileTitleEl = document.querySelector('.sb-profile-title');
const profileBioEl = document.querySelector('.sb-profile-header-text p');

// Profile avatars (overlapping)
const avatarMobileWrapper = document.querySelector('.sb-profile-avatar--mobile');
const avatarDesktopWrapper = document.querySelector('.sb-profile-avatar--desktop');

// Edit profile button
const editProfileButton = document.querySelector('#editProfileButton');

// Edit profile section + form
const editProfileSection = document.querySelector('[data-profile-edit-section]');
const editProfileForm = document.querySelector('[data-profile-edit-form]');
const editMessageEl = document.querySelector('[data-profile-edit-message]');

// Edit profile inputs
const avatarUrlInput = document.querySelector('#profileAvatarUrl');
const avatarAltInput = document.querySelector('#profileAvatarAlt');
const bannerUrlInput = document.querySelector('#profileBannerUrl');
const bannerAltInput = document.querySelector('#profileBannerAlt');
const bioInput = document.querySelector('#profileBio');

// Cancel button inside edit form
const editCancelButton = document.querySelector('[data-profile-edit="cancel"]');

/* ------------------------
   Helpers
------------------------- */

const redirectToLogin = () => {
  window.location.href = 'login.html';
};

const getInitials = (name) => {
  if (!name) {
    return '?';
  }

  const trimmed = String(name).trim();
  if (!trimmed) {
    return '?';
  }

  const parts = trimmed.split(/[\s_]+/).filter(Boolean);

  if (parts.length === 1) {
    const single = parts[0];
    if (single.length === 1) {
      return single[0].toUpperCase();
    }
    return (single[0] + single[1]).toUpperCase();
  }

  const first = parts[0][0] || '';
  const last = parts[parts.length - 1][0] || '';
  return (first + last).toUpperCase();
};

const renderAvatarInto = (wrapper, profile) => {
  if (!wrapper || !profile) {
    return;
  }

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
  if (!profile) {
    return;
  }

  // Toggle header variant
  if (headerLoggedOut) {
    headerLoggedOut.classList.add('d-none');
  }
  if (headerLoggedIn) {
    headerLoggedIn.classList.remove('d-none');
  }

  // Credits
  const credits = typeof profile.credits === 'number' ? profile.credits : 0;

  headerCreditsEls.forEach((el) => {
    if (!el) {
      return;
    }
    el.textContent = 'Credits: ' + credits;
  });
};

const updateProfileHero = (profile) => {
  if (!profile) {
    return;
  }

  // Name
  if (profileTitleEl) {
    profileTitleEl.textContent = profile.name || 'My Profile';
  }

  // Bio
  if (profileBioEl) {
    const bio =
      profile.bio && profile.bio.trim() ? profile.bio : 'This is a very short bio about me.';
    profileBioEl.textContent = bio;
  }

  // Banner background
  if (bannerEl) {
    const banner = profile.banner || {};
    const bannerUrl = banner.url || '';

    if (bannerUrl) {
      bannerEl.style.backgroundImage = 'url("' + bannerUrl + '")';
      bannerEl.style.backgroundSize = 'cover';
      bannerEl.style.backgroundPosition = 'center';
    } else {
      bannerEl.style.backgroundImage = '';
    }
  }

  // Avatars (mobile + desktop)
  renderAvatarInto(avatarMobileWrapper, profile);
  renderAvatarInto(avatarDesktopWrapper, profile);
};

// Simple message helpers for the edit form
const clearEditMessage = () => {
  if (!editMessageEl) {
    return;
  }

  editMessageEl.textContent = '';
  editMessageEl.className = 'alert d-none';
};

const showEditMessage = (text, type) => {
  if (!editMessageEl) {
    return;
  }

  let extraClass = 'alert-info';
  if (type === 'error') {
    extraClass = 'alert-danger';
  } else if (type === 'success') {
    extraClass = 'alert-success';
  }

  editMessageEl.textContent = text;
  editMessageEl.className = 'alert ' + extraClass;
  editMessageEl.classList.remove('d-none');
};

const showEditSection = () => {
  if (editProfileSection) {
    editProfileSection.classList.remove('d-none');
  }
};

const hideEditSection = () => {
  if (editProfileSection) {
    editProfileSection.classList.add('d-none');
  }
};

// Read ?name= from the URL (manual parser – no URLSearchParams)
const getProfileNameFromQuery = () => {
  const search = window.location.search || '';
  const withoutQuestionMark = search.startsWith('?') ? search.slice(1) : search;
  const pairs = withoutQuestionMark.split('&').filter(Boolean);

  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i];
    const parts = pair.split('=');
    const key = parts[0];
    const value = parts[1];

    if (key === 'name') {
      return decodeURIComponent(value || '');
    }
  }

  return null;
};

/* ------------------------
   Edit form wiring
------------------------- */

const setupEditProfileForm = (profile, authName, isOwnProfile) => {
  // If this is not the logged-in user's own profile, hide edit UI and exit
  if (!isOwnProfile) {
    if (editProfileButton) {
      editProfileButton.classList.add('d-none');
    }
    if (editProfileSection) {
      editProfileSection.classList.add('d-none');
    }
    return;
  }

  if (!editProfileButton || !editProfileForm) {
    return;
  }

  // Helper: fill form with current profile values
  const fillFormFromProfile = (p) => {
    if (!p) {
      return;
    }

    const avatar = p.avatar || {};
    const banner = p.banner || {};

    const avatarUrl = avatar.url || '';
    const avatarAlt = avatar.alt || '';
    const bannerUrl = banner.url || '';
    const bannerAlt = banner.alt || '';
    const bio = p.bio || '';

    if (avatarUrlInput) {
      avatarUrlInput.value = avatarUrl;
    }
    if (avatarAltInput) {
      avatarAltInput.value = avatarAlt;
    }
    if (bannerUrlInput) {
      bannerUrlInput.value = bannerUrl;
    }
    if (bannerAltInput) {
      bannerAltInput.value = bannerAlt;
    }
    if (bioInput) {
      bioInput.value = bio;
    }
  };

  // "Edit profile" - show form + prefill
  editProfileButton.addEventListener('click', (event) => {
    event.preventDefault();
    clearEditMessage();
    fillFormFromProfile(profile);
    showEditSection();
  });

  // Cancel button - hide form
  if (editCancelButton) {
    editCancelButton.addEventListener('click', (event) => {
      event.preventDefault();
      clearEditMessage();
      hideEditSection();
    });
  }

  // Save changes (form submit)
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

    if (bio) {
      payload.bio = bio;
    }

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

    // If nothing was changed
    if (Object.keys(payload).length === 0) {
      showEditMessage('Please update at least one field before saving.', 'error');
      return;
    }

    showLoader();

    try {
      const updatedProfile = await updateProfile(authName, payload);

      // Merge updated data into local profile object
      const mergedProfile = {
        ...profile,
        ...updatedProfile,
        avatar: updatedProfile.avatar || profile.avatar,
        banner: updatedProfile.banner || profile.banner,
        bio: typeof updatedProfile.bio === 'string' ? updatedProfile.bio : profile.bio,
      };

      updateProfileHero(mergedProfile);
      hideEditSection();

      showEditMessage('Profile updated successfully.', 'success');

      // Replace original profile reference so next edit has latest values
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

/* ------------------------
   Main init
------------------------- */

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
    const profile = await getProfile(profileNameToLoad);

    if (!profile) {
      if (isOwnProfile) {
        // If we tried to load our own profile and failed, reset auth and force login
        clearAuth();
        redirectToLogin();
      } else {
        // Viewing another user's profile and it doesn't exist - go home
        window.location.href = 'index.html';
      }
      return;
    }

    // Only update header credits + logged-in header if this is our own profile
    if (isOwnProfile) {
      updateHeaderState(profile);
    }

    // Update hero, banner, avatars
    updateProfileHero(profile);

    // Wire up edit form behaviour (only for own profile)
    setupEditProfileForm(profile, isOwnProfile ? auth.name : null, isOwnProfile);
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

/* ------------------------
   Run on load
------------------------- */

initProfilePage();
