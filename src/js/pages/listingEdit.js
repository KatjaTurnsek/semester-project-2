/* global setTimeout */

import { getAuth, clearAuth } from '../api/httpClient.js';
import { createListing, updateListing, getListingById, deleteListing } from '../api/listingsApi.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';

// =========================
// URL + small helpers
// =========================

/**
 * Get the listing ID from the URL query string.
 *
 * Example: for `?id=123`, this returns `"123"`.
 *
 * @returns {string|null} Listing ID, or null if not present.
 */
const getListingIdFromQuery = () => {
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
};

/**
 * Shorthand for `document.querySelector`.
 *
 * @param {string} selector - CSS selector string.
 * @returns {Element|null} First matching element or null.
 */
const qs = (selector) => document.querySelector(selector);

/**
 * Get the trimmed value from an input element.
 *
 * @param {HTMLInputElement|HTMLTextAreaElement|null} input - Input or textarea element.
 * @returns {string} Trimmed value or empty string if missing.
 */
const getTrimmedInputValue = (input) => {
  if (!input) return '';
  return String(input.value || '').trim();
};

/**
 * Normalize media item from API into { url, alt }.
 * API may return media as strings or as objects.
 *
 * @param {string|Object|null} item
 * @returns {{url: string, alt: string}}
 */
const normaliseMediaItem = (item) => {
  if (!item) return { url: '', alt: '' };

  if (typeof item === 'string') {
    return { url: item, alt: '' };
  }

  if (typeof item === 'object') {
    return {
      url: item.url || '',
      alt: item.alt || '',
    };
  }

  return { url: '', alt: '' };
};

// =========================
// Tags + media helpers
// =========================

/**
 * Build an array of tags from a comma-separated string.
 *
 * Example: "camera, lens, vintage" ["camera", "lens", "vintage"]
 *
 * @param {string} tagsRaw - Raw tags string from the form.
 * @returns {string[]|undefined} Array of tags, or undefined if none.
 */
const buildTagsArray = (tagsRaw) => {
  if (!tagsRaw) return undefined;

  const parts = String(tagsRaw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return undefined;

  return parts;
};

/**
 * Build a media array from all `.sb-media-group` blocks in the form.
 *
 * Each media group has URL and alt inputs.
 *
 * @param {HTMLFormElement|null} form - Listing form element.
 * @returns {Object[]|undefined} Array of media objects, or undefined if none.
 */
const buildMediaArrayFromForm = (form) => {
  if (!form) return undefined;

  const media = [];
  const groups = form.querySelectorAll('.sb-media-group');

  groups.forEach((group) => {
    const urlInput = group.querySelector('[data-media-url]');
    const altInput = group.querySelector('[data-media-alt]');

    const url = getTrimmedInputValue(urlInput);
    const alt = getTrimmedInputValue(altInput);

    if (url) {
      const obj = { url };
      if (alt) obj.alt = alt;
      media.push(obj);
    }
  });

  if (!media.length) return undefined;
  return media;
};

// =========================
// Date helper
// =========================

/**
 * Convert an ISO date string into a `datetime-local` input value.
 *
 * Example: "2025-01-01T12:34:56.000Z" -> "2025-01-01T13:34" (depending on local time).
 *
 * @param {string} isoString - ISO date string.
 * @returns {string} A string in `YYYY-MM-DDTHH:MM` format, or empty string if invalid.
 */
const toDateTimeLocalValue = (isoString) => {
  if (!isoString) return '';

  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// =========================
// Inline form message
// =========================

/**
 * Inline message element used to show form-level feedback.
 * @type {HTMLElement|null}
 */
const inlineMessageEl = qs('[data-listing-edit-message]');

/**
 * Clear the inline form message and hide the alert.
 *
 * @returns {void}
 */
const clearInlineMessage = () => {
  if (!inlineMessageEl) return;
  inlineMessageEl.textContent = '';
  inlineMessageEl.className = 'alert d-none';
};

/**
 * Show an inline form message above the form.
 *
 * @param {string} text - Message to display.
 * @param {'info'|'error'|'success'} [type] - Message type; changes alert color.
 * @returns {void}
 */
const showInlineMessage = (text, type) => {
  if (!inlineMessageEl) return;

  let extraClass = 'alert-info';
  if (type === 'error') extraClass = 'alert-danger';
  if (type === 'success') extraClass = 'alert-success';

  inlineMessageEl.textContent = text;
  inlineMessageEl.className = 'alert ' + extraClass;
  inlineMessageEl.classList.remove('d-none');
  inlineMessageEl.setAttribute('role', 'alert');
};

// =========================
// Simple redirects
// =========================

/**
 * Redirect the user to the login page.
 *
 * @returns {void}
 */
const redirectToLogin = () => {
  window.location.href = 'login.html';
};

/**
 * Navigate back in history if possible, otherwise go to the homepage.
 *
 * @returns {void}
 */
const goBackOrHome = () => {
  if (window.history && window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = 'index.html';
  }
};

// =========================
// Media group helper (used by add button + prefill)
// =========================

/**
 * Create a new media group (URL + alt inputs) inside the container.
 *
 * Used when adding extra image fields or prefilling from existing media.
 *
 * @param {HTMLElement|null} container - Container for media groups.
 * @param {HTMLElement|null} templateGroup - Existing group to clone.
 * @param {number} index - Index number for labels and ids.
 * @param {Object|null} mediaItem - Optional media object with url and alt.
 * @returns {HTMLElement|null} The newly created media group element, or null.
 */
const createMediaGroup = (container, templateGroup, index, mediaItem) => {
  if (!container || !templateGroup) return null;
  if (typeof index !== 'number' || index < 1) return null;

  const clone = templateGroup.cloneNode(true);
  clone.setAttribute('data-media-group', String(index));

  const urlInput = clone.querySelector('[data-media-url]');
  const altInput = clone.querySelector('[data-media-alt]');

  const urlLabel = clone.querySelector('label[for^="mediaUrl"]');
  const altLabel = clone.querySelector('label[for^="mediaAlt"]');

  const urlId = 'mediaUrl' + index;
  const altId = 'mediaAlt' + index;

  const url = mediaItem && mediaItem.url ? mediaItem.url : '';
  const alt = mediaItem && mediaItem.alt ? mediaItem.alt : '';

  if (urlInput) {
    urlInput.id = urlId;
    urlInput.name = 'mediaUrl' + index;
    urlInput.value = url;
  }

  if (altInput) {
    altInput.id = altId;
    altInput.name = 'mediaAlt' + index;
    altInput.value = alt;
  }

  if (urlLabel) urlLabel.setAttribute('for', urlId);
  if (altLabel) altLabel.setAttribute('for', altId);

  container.appendChild(clone);
  return clone;
};

// =========================
// Prefill form when editing
// =========================

/**
 * Prefill the form fields with data from an existing listing.
 *
 * - Title, description, tags
 * - End date/time
 * - All media items
 *
 * @param {Object} listing - Listing data from the API.
 * @returns {void}
 */
const prefillFormFromListing = (listing) => {
  if (!listing) return;

  const titleInput = qs('#listingTitle');
  const descriptionInput = qs('#listingDescription');
  const tagsInput = qs('#listingTags');
  const endsAtInput = qs('#listingEndsAt');

  if (titleInput) titleInput.value = listing.title || '';
  if (descriptionInput) descriptionInput.value = listing.description || '';

  if (tagsInput && Array.isArray(listing.tags)) {
    tagsInput.value = listing.tags.join(', ');
  }

  if (endsAtInput && listing.endsAt) {
    endsAtInput.value = toDateTimeLocalValue(listing.endsAt);
  }

  // Prefill ALL media items (supports string or object)
  const rawMedia = Array.isArray(listing.media) ? listing.media.filter(Boolean) : [];
  const media = rawMedia.map(normaliseMediaItem).filter((m) => m.url);

  const container = qs('#mediaFieldsContainer');
  const firstGroup = container ? container.querySelector('.sb-media-group') : null;

  if (!container || !firstGroup) return;

  // Remove any extra groups that may be present from previous usage
  const extraGroups = container.querySelectorAll('.sb-media-group:not(:first-child)');
  extraGroups.forEach((group) => group.remove());

  const firstUrlInput = firstGroup.querySelector('[data-media-url]');
  const firstAltInput = firstGroup.querySelector('[data-media-alt]');

  if (!media.length) {
    if (firstUrlInput) firstUrlInput.value = '';
    if (firstAltInput) firstAltInput.value = '';
    return;
  }

  // Fill first group with first media item
  if (firstUrlInput) firstUrlInput.value = media[0].url || '';
  if (firstAltInput) firstAltInput.value = media[0].alt || '';

  // Add remaining media items as new groups
  for (let i = 1; i < media.length; i += 1) {
    const index = i + 1; // first is 1
    createMediaGroup(container, firstGroup, index, media[i]);
  }
};

// =========================
// Button layout (create vs edit)
// =========================

/**
 * Show the correct button row depending on mode:
 * - Create mode: show create row
 * - Edit mode: show edit row
 *
 * @param {boolean} isEditMode - True if editing an existing listing.
 * @returns {void}
 */
const setupButtonsForMode = (isEditMode) => {
  const createButtonsRow = qs('#createModeButtons');
  const editButtonsRow = qs('#editModeButtons');

  if (createButtonsRow) createButtonsRow.classList.toggle('d-none', isEditMode);
  if (editButtonsRow) editButtonsRow.classList.toggle('d-none', !isEditMode);
};

// =========================
// Delete listing
// =========================

/**
 * Set up the delete button in edit mode.
 *
 * @param {string|null} listingId
 * @returns {void}
 */
const setupDeleteInEditMode = (listingId) => {
  const editButtonsRow = qs('#editModeButtons');
  if (!editButtonsRow || !listingId) return;

  const deleteBtn = editButtonsRow.querySelector('.btn-danger');
  if (!deleteBtn) return;

  if (deleteBtn.dataset.boundDelete === '1') return;
  deleteBtn.dataset.boundDelete = '1';

  deleteBtn.addEventListener('click', async (event) => {
    event.preventDefault();

    const confirmed = window.confirm('Are you sure you want to delete this listing?');
    if (!confirmed) return;

    showLoader();
    deleteBtn.disabled = true;

    try {
      await deleteListing(listingId);
      showAlert('success', 'Listing deleted', 'Your listing has been deleted.');

      setTimeout(() => {
        window.location.href = 'profile.html#my-listings';
      }, 800);
    } catch (error) {
      const msg =
        error && error.message ? error.message : 'Could not delete this listing. Please try again.';
      showAlert('error', 'Delete failed', msg);
      deleteBtn.disabled = false;
    } finally {
      hideLoader();
    }
  });
};

// =========================
// Cancel buttons
// =========================

/**
 * Set up cancel buttons for both create and edit modes.
 *
 * @returns {void}
 */
const setupCancelButtons = () => {
  const createButtonsRow = qs('#createModeButtons');
  const editButtonsRow = qs('#editModeButtons');

  if (createButtonsRow) {
    const cancelBtn = createButtonsRow.querySelector('.btn-dark:not([type="submit"])');
    if (cancelBtn && cancelBtn.dataset.boundCancel !== '1') {
      cancelBtn.dataset.boundCancel = '1';
      cancelBtn.addEventListener('click', (event) => {
        event.preventDefault();
        goBackOrHome();
      });
    }
  }

  if (editButtonsRow) {
    const cancelBtn = editButtonsRow.querySelector('.btn-outline-dark');
    if (cancelBtn && cancelBtn.dataset.boundCancel !== '1') {
      cancelBtn.dataset.boundCancel = '1';
      cancelBtn.addEventListener('click', (event) => {
        event.preventDefault();
        goBackOrHome();
      });
    }
  }
};

// =========================
// Add extra media fields
// =========================

/**
 * Set up the "Add another image" button.
 *
 * @returns {void}
 */
const setupMediaAddButton = () => {
  const container = qs('#mediaFieldsContainer');
  const addBtn = qs('.sb-btn-add-image');
  if (!container || !addBtn) return;

  const firstGroup = container.querySelector('.sb-media-group');
  if (!firstGroup) return;

  if (addBtn.dataset.boundAdd === '1') return;
  addBtn.dataset.boundAdd = '1';

  let count = container.querySelectorAll('.sb-media-group').length || 1;

  addBtn.addEventListener('click', (event) => {
    event.preventDefault();
    count += 1;
    createMediaGroup(container, firstGroup, count, null);
  });
};

// =========================
// Live preview (title + first image)
// =========================

/**
 * @param {Object} auth
 * @returns {void}
 */
const setupPreview = (auth) => {
  const titleInput = qs('#listingTitle');
  const previewTitleEl = qs('#previewTitle');
  const previewUsernameEl = qs('#previewUsername');

  const mediaContainer = qs('#mediaFieldsContainer');
  const firstUrlInput = mediaContainer ? mediaContainer.querySelector('[data-media-url]') : null;
  const firstAltInput = mediaContainer ? mediaContainer.querySelector('[data-media-alt]') : null;

  const previewImageEl = qs('[data-preview-img]');
  const previewPlaceholderEl = qs('[data-preview-placeholder]');

  if (previewUsernameEl && auth && auth.name) {
    previewUsernameEl.textContent = auth.name;
  }

  const updatePreviewTitle = () => {
    if (!titleInput || !previewTitleEl) return;
    const value = String(titleInput.value || '').trim();
    previewTitleEl.textContent = value || 'Listing title';
  };

  const updatePreviewImage = () => {
    if (!previewImageEl || !firstUrlInput) return;

    const url = getTrimmedInputValue(firstUrlInput);
    const altFromInput = firstAltInput ? getTrimmedInputValue(firstAltInput) : '';
    const fallbackAlt = previewTitleEl ? String(previewTitleEl.textContent || '').trim() : '';
    const alt = altFromInput || fallbackAlt || 'Listing image';

    if (url) {
      previewImageEl.src = url;
      previewImageEl.alt = alt;
      previewImageEl.classList.remove('d-none');
      if (previewPlaceholderEl) previewPlaceholderEl.classList.add('d-none');
    } else {
      previewImageEl.src = '';
      previewImageEl.alt = '';
      previewImageEl.classList.add('d-none');
      if (previewPlaceholderEl) previewPlaceholderEl.classList.remove('d-none');
    }
  };

  if (titleInput && previewTitleEl && titleInput.dataset.boundPreviewTitle !== '1') {
    titleInput.dataset.boundPreviewTitle = '1';
    titleInput.addEventListener('input', updatePreviewTitle);
  }

  if (firstUrlInput && firstUrlInput.dataset.boundPreviewUrl !== '1') {
    firstUrlInput.dataset.boundPreviewUrl = '1';
    firstUrlInput.addEventListener('input', updatePreviewImage);
  }

  if (firstAltInput && firstAltInput.dataset.boundPreviewAlt !== '1') {
    firstAltInput.dataset.boundPreviewAlt = '1';
    firstAltInput.addEventListener('input', updatePreviewImage);
  }

  updatePreviewTitle();
  updatePreviewImage();
};

// =========================
// Form helpers: read + validate
// =========================

/**
 * @returns {{title: string, description: string, tagsRaw: string, endsAtRaw: string}}
 */
const getListingFormData = () => {
  const titleInput = qs('#listingTitle');
  const descriptionInput = qs('#listingDescription');
  const tagsInput = qs('#listingTags');
  const endsAtInput = qs('#listingEndsAt');

  return {
    title: getTrimmedInputValue(titleInput),
    description: getTrimmedInputValue(descriptionInput),
    tagsRaw: getTrimmedInputValue(tagsInput),
    endsAtRaw: getTrimmedInputValue(endsAtInput),
  };
};

/**
 * @param {{title: string, description: string, endsAtRaw: string}} data
 * @returns {string|null}
 */
const validateListingData = ({ title, description, endsAtRaw }) => {
  if (!title || !description || !endsAtRaw) {
    return 'Please fill in title, description and end date/time.';
  }

  const endsAtDate = new Date(endsAtRaw);
  if (Number.isNaN(endsAtDate.getTime())) {
    return 'Please choose a valid end date and time.';
  }

  if (endsAtDate <= new Date()) {
    return 'Auction end time must be in the future.';
  }

  return null;
};

// =========================
// Form submit (create + update)
// =========================

/**
 * @param {boolean} isEditMode
 * @param {string|null} listingId
 * @param {string|null} listingOwnerName
 * @returns {void}
 */
const setupFormSubmit = (isEditMode, listingId, listingOwnerName) => {
  const form = qs('[data-listing-edit-form]');
  if (!form) return;

  if (form.dataset.boundSubmit === '1') return;
  form.dataset.boundSubmit = '1';

  const submitBtnCreateRow = qs('#createModeButtons button[type="submit"]');
  const submitBtnEditRow = qs('#editModeButtons button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearInlineMessage();

    const currentAuth = getAuth();

    if (!currentAuth || !currentAuth.name) {
      clearAuth();
      showAlert('error', 'Login required', 'You must be logged in to create or edit listings.');
      setTimeout(() => redirectToLogin(), 800);
      return;
    }

    if (isEditMode && listingOwnerName && listingOwnerName !== currentAuth.name) {
      showAlert('error', 'Not allowed', 'You can only edit your own listings.');
      return;
    }

    const { title, description, tagsRaw, endsAtRaw } = getListingFormData();
    const validationError = validateListingData({ title, description, endsAtRaw });

    if (validationError) {
      showInlineMessage(validationError, 'error');
      return;
    }

    const endsAtDate = new Date(endsAtRaw);

    const payload = {
      title,
      description,
      endsAt: endsAtDate.toISOString(),
    };

    const tags = buildTagsArray(tagsRaw);
    if (tags) payload.tags = tags;

    const media = buildMediaArrayFromForm(form);
    if (media) payload.media = media;

    const submitBtn = isEditMode ? submitBtnEditRow : submitBtnCreateRow;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isEditMode ? 'Saving…' : 'Creating…';
    }

    showLoader();

    try {
      if (isEditMode && listingId) {
        await updateListing(listingId, payload);

        showInlineMessage('Your listing has been updated.', 'success');
        showAlert('success', 'Listing updated', 'Your listing has been updated.');

        setTimeout(() => {
          window.location.href = 'listing.html?id=' + encodeURIComponent(listingId);
        }, 900);
      } else {
        const created = await createListing(payload);
        const newId = created && created.id ? created.id : null;

        showInlineMessage('Your listing has been created.', 'success');
        showAlert('success', 'Listing created', 'Your listing has been created.');

        if (newId) {
          setTimeout(() => {
            window.location.href = 'listing.html?id=' + encodeURIComponent(newId);
          }, 900);
        }
      }
    } catch (error) {
      const msg =
        error && error.message
          ? error.message
          : 'Could not save your listing. Please check the form and try again.';
      showInlineMessage(msg, 'error');
      showAlert('error', isEditMode ? 'Update failed' : 'Create failed', msg);
    } finally {
      hideLoader();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = isEditMode ? 'Save changes' : 'Create listing';
      }
    }
  });
};

// =========================
// Init
// =========================

/**
 * @returns {Promise<void>}
 */
const initListingEditPage = async () => {
  const auth = getAuth();

  if (!auth || !auth.name) {
    showAlert('error', 'Login required', 'You must be logged in to create or edit listings.');
    setTimeout(() => redirectToLogin(), 800);
    return;
  }

  const listingId = getListingIdFromQuery();
  const isEditMode = !!listingId;

  const titleHeadingEl = qs('#listingFormTitle');
  if (titleHeadingEl) {
    titleHeadingEl.textContent = isEditMode ? 'Edit listing' : 'Create a new listing';
  }

  setupButtonsForMode(isEditMode);
  setupCancelButtons();
  setupMediaAddButton();

  if (!isEditMode) {
    setupPreview(auth);
    setupFormSubmit(false, null, null);
    return;
  }

  showLoader();

  try {
    const listing = await getListingById(listingId, '?_seller=true');

    if (!listing) {
      showAlert('error', 'Not found', 'This listing could not be found.');
      window.location.href = 'index.html';
      return;
    }

    const ownerName = listing.seller && listing.seller.name ? listing.seller.name : null;

    if (!ownerName || ownerName !== auth.name) {
      showAlert('error', 'Not allowed', 'You can only edit your own listings.');
      window.location.href = 'index.html';
      return;
    }

    prefillFormFromListing(listing);
    setupPreview(auth);
    setupDeleteInEditMode(listingId);
    setupFormSubmit(true, listingId, ownerName);
  } catch (error) {
    const msg =
      error && error.message
        ? error.message
        : 'Could not load this listing for editing. Please try again.';
    showAlert('error', 'Error', msg);
    window.location.href = 'index.html';
  } finally {
    hideLoader();
  }
};

// =========================
// Run (no refresh needed)
// =========================

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initListingEditPage);
} else {
  initListingEditPage();
}
