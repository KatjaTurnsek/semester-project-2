import { clearAuth } from '../api/httpClient.js';
import { updateProfile } from '../api/profilesApi.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';
import { qs, redirectToLogin } from './profileUtils.js';
import { updateProfileHero } from './profileRender.js';

// =========================
// Edit form wiring
// =========================

/**
 * Set up the profile edit form.
 *
 * @param {Object} profile
 * @param {string|null} authName
 * @param {boolean} isOwnProfile
 * @returns {void}
 */
export const setupEditProfileForm = (profile, authName, isOwnProfile) => {
  const editProfileButton = /** @type {HTMLButtonElement|null} */ (qs('#editProfileButton'));
  const editProfileSection = /** @type {HTMLElement|null} */ (qs('[data-profile-edit-section]'));
  const editProfileForm = /** @type {HTMLFormElement|null} */ (qs('[data-profile-edit-form]'));
  const editMessageEl = /** @type {HTMLElement|null} */ (qs('[data-profile-edit-message]'));

  const avatarUrlInput = /** @type {HTMLInputElement|null} */ (qs('#profileAvatarUrl'));
  const avatarAltInput = /** @type {HTMLInputElement|null} */ (qs('#profileAvatarAlt'));
  const bannerUrlInput = /** @type {HTMLInputElement|null} */ (qs('#profileBannerUrl'));
  const bannerAltInput = /** @type {HTMLInputElement|null} */ (qs('#profileBannerAlt'));
  const bioInput = /** @type {HTMLTextAreaElement|null} */ (qs('#profileBio'));

  const editCancelButton = /** @type {HTMLButtonElement|null} */ (
    qs('[data-profile-edit="cancel"]')
  );

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

  if (!isOwnProfile) {
    if (editProfileButton) editProfileButton.classList.add('d-none');
    if (editProfileSection) editProfileSection.classList.add('d-none');
    return;
  }

  if (!editProfileButton || !editProfileForm) return;

  if (editProfileForm.dataset.boundProfileEdit === '1') return;
  editProfileForm.dataset.boundProfileEdit = '1';

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

  if (editProfileButton.dataset.boundClick !== '1') {
    editProfileButton.dataset.boundClick = '1';
    editProfileButton.addEventListener('click', (event) => {
      event.preventDefault();
      clearEditMessage();
      fillFormFromProfile(profile);
      showEditSection();
    });
  }

  if (editCancelButton && editCancelButton.dataset.boundClick !== '1') {
    editCancelButton.dataset.boundClick = '1';
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

    /** @type {Object} */
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

      // Update UI
      const bannerEl = qs('.sb-profile-banner');
      const profileTitleEl = qs('.sb-profile-title');
      const profileBioEl = qs('.sb-profile-header-text p');
      const avatarMobileWrapper = qs('.sb-profile-avatar--mobile');
      const avatarDesktopWrapper = qs('.sb-profile-avatar--desktop');

      updateProfileHero(
        mergedProfile,
        bannerEl,
        profileTitleEl,
        profileBioEl,
        avatarMobileWrapper,
        avatarDesktopWrapper,
      );

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
