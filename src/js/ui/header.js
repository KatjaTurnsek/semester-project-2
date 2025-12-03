import { getAuth } from '../api/httpClient.js';
import { getProfile } from '../api/profilesApi.js';

// Two header variants
const headerLoggedOut = document.querySelector('[data-header="logged-out"]');
const headerLoggedIn = document.querySelector('[data-header="logged-in"]');

// Credits (mobile + desktop)
const headerCreditsEls = document.querySelectorAll('[data-header-credits]');

// Avatar circles in header (mobile + desktop)
const headerAvatarEls = document.querySelectorAll('[data-header-avatar]');

/* ------------------------
   Helpers
------------------------- */

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

const renderHeaderAvatarFrom = (el, source) => {
  if (!el || !source) {
    return;
  }

  el.innerHTML = '';

  const avatar = source.avatar || {};
  const avatarUrl = avatar.url || '';
  const avatarAlt = avatar.alt || source.name || 'User avatar';

  if (avatarUrl) {
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = avatarAlt;
    img.className = 'img-fluid rounded-circle';
    el.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.textContent = getInitials(source.name);
    span.className = 'fw-semibold';
    el.appendChild(span);
  }
};

const updateHeaderCredits = (value) => {
  let credits = 0;

  if (typeof value === 'number') {
    credits = value;
  } else if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      credits = parsed;
    }
  }

  headerCreditsEls.forEach((el) => {
    if (!el) {
      return;
    }
    el.textContent = 'Credits: ' + credits;
  });
};

const refineHeaderWithProfile = (auth) => {
  if (!auth || !auth.name) {
    return;
  }

  (async () => {
    try {
      // profilesApi expects the profile name in the path
      const profileName = auth.name;
      const profile = await getProfile(profileName);

      if (!profile) {
        return;
      }

      // Update credits from profile if present
      if (typeof profile.credits === 'number' || typeof profile.credits === 'string') {
        updateHeaderCredits(profile.credits);
      }

      // Update avatar from profile, if it has one
      if (profile.avatar) {
        headerAvatarEls.forEach((el) => {
          renderHeaderAvatarFrom(el, profile);
        });
      }
    } catch {
      // Silent: if profile fetch fails, we keep the auth-based header.
    }
  })();
};

/* ------------------------
   Init
------------------------- */

export const initHeader = () => {
  // If page has no header, do nothing
  if (!headerLoggedOut && !headerLoggedIn) {
    return;
  }

  const auth = getAuth();

  // Not logged in → show logged-out header, hide logged-in
  if (!auth) {
    if (headerLoggedOut) {
      headerLoggedOut.classList.remove('d-none');
    }
    if (headerLoggedIn) {
      headerLoggedIn.classList.add('d-none');
    }
    return;
  }

  // Logged in → show logged-in header, hide logged-out
  if (headerLoggedOut) {
    headerLoggedOut.classList.add('d-none');
  }
  if (headerLoggedIn) {
    headerLoggedIn.classList.remove('d-none');
  }

  // --- Initial render from auth object (fast) ---

  // Credits: might be missing in auth → default to 0
  updateHeaderCredits(auth.credits);

  // Avatar circles from auth (avatar or initials)
  headerAvatarEls.forEach((el) => {
    renderHeaderAvatarFrom(el, auth);
  });

  // --- Then refine from profile (credits + avatar from /auction/profiles/:name) ---
  refineHeaderWithProfile(auth);
};
