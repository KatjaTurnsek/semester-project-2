import { getAuth, saveAuth } from '../api/httpClient.js';
import { getProfile } from '../api/profilesApi.js';

const headerLoggedOut = document.querySelector('[data-header="logged-out"]');
const headerLoggedIn = document.querySelector('[data-header="logged-in"]');

const headerCreditsEls = document.querySelectorAll('[data-header-credits]');
const headerAvatarEls = document.querySelectorAll('[data-header-avatar]');

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

export const refreshHeaderFromProfile = async () => {
  try {
    await fetchAndApplyProfile();
  } catch {
    // If it fails, keep whatever is currently shown
  }
};
