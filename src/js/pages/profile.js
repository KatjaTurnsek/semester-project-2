import { getAuth, clearAuth } from '../api/httpClient.js';
import { getProfile, getProfileBids, getProfileWins } from '../api/profilesApi.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import {
  activateTabFromHash,
  getProfileNameFromQuery,
  qs,
  redirectToLogin,
} from './profileUtils.js';
import {
  renderMyBids,
  renderMyListings,
  renderMyWins,
  updateHeaderState,
  updateProfileHero,
} from './profileRender.js';
import { setupEditProfileForm } from './profileEdit.js';

// =========================
// Main init
// =========================

/**
 * Initialize the profile page.
 *
 * @returns {Promise<void>}
 */
const initProfilePage = async () => {
  const headerLoggedOut = /** @type {HTMLElement|null} */ (qs('[data-header="logged-out"]'));
  const headerLoggedIn = /** @type {HTMLElement|null} */ (qs('[data-header="logged-in"]'));
  const headerCreditsEls = /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll('[data-header-credits]')
  );

  const bannerEl = /** @type {HTMLElement|null} */ (qs('.sb-profile-banner'));
  const profileTitleEl = /** @type {HTMLElement|null} */ (qs('.sb-profile-title'));
  const profileBioEl = /** @type {HTMLElement|null} */ (qs('.sb-profile-header-text p'));
  const avatarMobileWrapper = /** @type {HTMLElement|null} */ (qs('.sb-profile-avatar--mobile'));
  const avatarDesktopWrapper = /** @type {HTMLElement|null} */ (qs('.sb-profile-avatar--desktop'));

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
      updateHeaderState(profile, headerLoggedOut, headerLoggedIn, headerCreditsEls);
    }

    updateProfileHero(
      profile,
      bannerEl,
      profileTitleEl,
      profileBioEl,
      avatarMobileWrapper,
      avatarDesktopWrapper,
    );

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

// =========================
// Safe run
// =========================

const bindProfilePage = () => {
  if (document.body && document.body.dataset.boundProfilePage === '1') return;
  if (document.body) document.body.dataset.boundProfilePage = '1';

  window.addEventListener('hashchange', activateTabFromHash);
  initProfilePage();
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bindProfilePage);
} else {
  bindProfilePage();
}
