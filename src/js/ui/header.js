import { getAuth, saveAuth } from '../api/httpClient.js';
import { getProfile } from '../api/profilesApi.js';

/** Logged-out header wrapper. */
const headerLoggedOut = document.querySelector('[data-header="logged-out"]');

/** Logged-in header wrapper. */
const headerLoggedIn = document.querySelector('[data-header="logged-in"]');

/** Elements that show the user's credits in the header. */
const headerCreditsEls = document.querySelectorAll('[data-header-credits]');

/** Elements that show the user's avatar in the header. */
const headerAvatarEls = document.querySelectorAll('[data-header-avatar]');

/**
 * Get initials from a name string.
 *
 * Examples:
 * - "Katja Turnsek" -> "KT"
 * - "Katja" -> "KA"
 *
 * @param {string} name - Full name of the user.
 * @returns {string} Uppercase initials or "?".
 */
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

/**
 * Render an avatar into a header avatar element.
 * Uses profile avatar image when available, otherwise initials.
 *
 * @param {HTMLElement} el - Target avatar wrapper element.
 * @param {Object} source - Object that contains avatar and name data.
 * @returns {void}
 */
const renderHeaderAvatarFrom = (el, source) => {
  if (!el || !source) return;

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

/**
 * Update all header credit elements with a numeric value.
 *
 * @param {number|string} value - Credits value from auth or profile.
 * @returns {void}
 */
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
    if (!el) return;
    el.textContent = 'Credits: ' + credits;
  });
};

/**
 * Fetch the user's profile and update header credits and avatar.
 * Falls back to auth data if the profile request fails.
 *
 * @param {Object} [authOverride] - Optional auth object to use instead of reading from storage.
 * @returns {Promise<Object|null>} Loaded profile object or null if not available.
 */
const fetchAndApplyProfile = async (authOverride) => {
  const auth = authOverride || getAuth();

  if (!auth || !auth.name) return null;

  let profile;

  try {
    profile = await getProfile(auth.name, '');
  } catch {
    // If the request fails completely, fall back to auth.credits and avatar
    updateHeaderCredits(auth.credits);
    headerAvatarEls.forEach((el) => renderHeaderAvatarFrom(el, auth));
    return null;
  }

  if (!profile) {
    updateHeaderCredits(auth.credits);
    headerAvatarEls.forEach((el) => renderHeaderAvatarFrom(el, auth));
    return null;
  }

  if (typeof profile.credits === 'number' || typeof profile.credits === 'string') {
    updateHeaderCredits(profile.credits);

    const currentAuth = getAuth();
    if (currentAuth) {
      saveAuth({
        ...currentAuth,
        credits: profile.credits,
      });
    }
  }

  headerAvatarEls.forEach((el) => renderHeaderAvatarFrom(el, profile));

  return profile;
};

/**
 * Initialize the header based on the current auth state.
 *
 * - Shows logged-out header when no auth
 * - Shows logged-in header when auth is present
 * - Loads profile to sync credits and avatar
 *
 * @returns {void}
 */
export const initHeader = () => {
  if (!headerLoggedOut && !headerLoggedIn) return;

  const auth = getAuth();

  if (!auth) {
    if (headerLoggedOut) headerLoggedOut.classList.remove('d-none');
    if (headerLoggedIn) headerLoggedIn.classList.add('d-none');
    updateHeaderCredits(0);
    return;
  }

  if (headerLoggedOut) headerLoggedOut.classList.add('d-none');
  if (headerLoggedIn) headerLoggedIn.classList.remove('d-none');

  fetchAndApplyProfile(auth);
};

/**
 * Refresh the header after profile changes (credits or avatar).
 *
 * @returns {Promise<void>} Promise that resolves when the header has been updated.
 */
export const refreshHeaderFromProfile = async () => {
  try {
    await fetchAndApplyProfile();
  } catch {
    // If it fails, keep whatever is currently shown
  }
};
