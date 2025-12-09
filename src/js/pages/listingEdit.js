/* global setTimeout */

import { getAuth, clearAuth } from '../api/httpClient.js';
import { createListing, updateListing, getListingById, deleteListing } from '../api/listingsApi.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';

// URL + small helpers

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

const qs = (selector) => document.querySelector(selector);

const getTrimmedInputValue = (input) => {
  if (!input) return '';
  return String(input.value || '').trim();
};

// Tags + media helpers

const buildTagsArray = (tagsRaw) => {
  if (!tagsRaw) return undefined;

  const parts = String(tagsRaw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return undefined;

  return parts;
};

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
      if (alt) {
        obj.alt = alt;
      }
      media.push(obj);
    }
  });

  if (!media.length) return undefined;
  return media;
};

// Date helper

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

// Inline form message

const inlineMessageEl = qs('[data-listing-edit-message]');

const clearInlineMessage = () => {
  if (!inlineMessageEl) return;

  inlineMessageEl.textContent = '';
  inlineMessageEl.className = 'alert d-none';
};

const showInlineMessage = (text, type) => {
  if (!inlineMessageEl) return;

  let extraClass = 'alert-info';

  if (type === 'error') {
    extraClass = 'alert-danger';
  } else if (type === 'success') {
    extraClass = 'alert-success';
  }

  inlineMessageEl.textContent = text;
  inlineMessageEl.className = 'alert ' + extraClass;
  inlineMessageEl.classList.remove('d-none');
  inlineMessageEl.setAttribute('role', 'alert');
};

// Simple redirects

const redirectToLogin = () => {
  window.location.href = 'login.html';
};

const goBackOrHome = () => {
  if (window.history && window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = 'index.html';
  }
};

// Media group helper (used by add button + prefill)

const createMediaGroup = (container, templateGroup, index, mediaItem) => {
  if (!container || !templateGroup || !index) return null;

  const clone = templateGroup.cloneNode(true);
  clone.setAttribute('data-media-group', String(index));

  const urlInput = clone.querySelector('[data-media-url]');
  const altInput = clone.querySelector('[data-media-alt]');

  const urlLabel = clone.querySelector('label[for^="mediaUrl"]');
  const altLabel = clone.querySelector('label[for^="mediaAlt"]');

  const urlId = 'mediaUrl' + index;
  const altId = 'mediaAlt' + index;

  if (urlInput) {
    urlInput.id = urlId;
    urlInput.name = 'mediaUrl' + index;
    urlInput.value = mediaItem && mediaItem.url ? mediaItem.url : '';
  }

  if (altInput) {
    altInput.id = altId;
    altInput.name = 'mediaAlt' + index;
    altInput.value = mediaItem && mediaItem.alt ? mediaItem.alt : '';
  }

  if (urlLabel) {
    urlLabel.setAttribute('for', urlId);
  }
  if (altLabel) {
    altLabel.setAttribute('for', altId);
  }

  container.appendChild(clone);
  return clone;
};

// Prefill form when editing

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

  // Prefill ALL media items

  const media = Array.isArray(listing.media) ? listing.media.filter(Boolean) : [];
  const container = qs('#mediaFieldsContainer');
  const firstGroup = container ? container.querySelector('.sb-media-group') : null;

  if (!container || !firstGroup) return;

  if (!media.length) {
    // No media: leave first group empty
    const urlInput = firstGroup.querySelector('[data-media-url]');
    const altInput = firstGroup.querySelector('[data-media-alt]');
    if (urlInput) urlInput.value = '';
    if (altInput) altInput.value = '';
    return;
  }

  // Fill first group with first media item

  const firstItem = media[0] || {};
  const firstUrlInput = firstGroup.querySelector('[data-media-url]');
  const firstAltInput = firstGroup.querySelector('[data-media-alt]');
  if (firstUrlInput) firstUrlInput.value = firstItem.url || '';
  if (firstAltInput) firstAltInput.value = firstItem.alt || '';

  // Remove any extra groups that may be present from previous usage

  const extraGroups = container.querySelectorAll('.sb-media-group:not(:first-child)');
  extraGroups.forEach((group) => group.remove());

  // Add remaining media items as new groups

  for (let i = 1; i < media.length; i += 1) {
    const index = i + 1; // since first is 1
    createMediaGroup(container, firstGroup, index, media[i]);
  }
};

// Button layout (create vs edit)

const setupButtonsForMode = (isEditMode) => {
  const createButtonsRow = qs('#createModeButtons');
  const editButtonsRow = qs('#editModeButtons');

  if (createButtonsRow) {
    createButtonsRow.classList.toggle('d-none', isEditMode);
  }
  if (editButtonsRow) {
    editButtonsRow.classList.toggle('d-none', !isEditMode);
  }
};

// Delete listing

const setupDeleteInEditMode = (listingId) => {
  const editButtonsRow = qs('#editModeButtons');
  if (!editButtonsRow || !listingId) return;

  const deleteBtn = editButtonsRow.querySelector('.btn-danger');
  if (!deleteBtn) return;

  deleteBtn.addEventListener('click', async () => {
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

// Cancel buttons

const setupCancelButtons = () => {
  const createButtonsRow = qs('#createModeButtons');
  const editButtonsRow = qs('#editModeButtons');

  if (createButtonsRow) {
    const cancelBtn = createButtonsRow.querySelector('.btn-dark:not([type="submit"])');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (event) => {
        event.preventDefault();
        goBackOrHome();
      });
    }
  }

  if (editButtonsRow) {
    const cancelBtn = editButtonsRow.querySelector('.btn-outline-dark');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (event) => {
        event.preventDefault();
        goBackOrHome();
      });
    }
  }
};

// Add extra media fields

const setupMediaAddButton = () => {
  const container = qs('#mediaFieldsContainer');
  const addBtn = qs('.sb-btn-add-image');
  if (!container || !addBtn) return;

  const firstGroup = container.querySelector('.sb-media-group');
  if (!firstGroup) return;

  let count = container.querySelectorAll('.sb-media-group').length || 1;

  addBtn.addEventListener('click', () => {
    count += 1;
    createMediaGroup(container, firstGroup, count, null);
  });
};

// Live preview (title + first image)

const setupPreview = (auth) => {
  const titleInput = qs('#listingTitle');
  const previewTitleEl = qs('#previewTitle');
  const previewUsernameEl = qs('#previewUsername');

  const mediaContainer = qs('#mediaFieldsContainer');
  const firstUrlInput = mediaContainer ? mediaContainer.querySelector('[data-media-url]') : null;
  const firstAltInput = mediaContainer ? mediaContainer.querySelector('[data-media-alt]') : null;

  const previewImageWrapper = qs('[data-preview-image-wrapper]');
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
    if (!previewImageWrapper || !previewImageEl || !firstUrlInput) return;

    const url = getTrimmedInputValue(firstUrlInput);
    const altFromInput = firstAltInput ? getTrimmedInputValue(firstAltInput) : '';
    const fallbackAlt = previewTitleEl ? previewTitleEl.textContent : 'Listing image';
    const alt = altFromInput || fallbackAlt || 'Listing image';

    if (url) {
      previewImageEl.src = url;
      previewImageEl.alt = alt;
      previewImageEl.classList.remove('d-none');
      if (previewPlaceholderEl) {
        previewPlaceholderEl.classList.add('d-none');
      }
    } else {
      previewImageEl.src = '';
      previewImageEl.alt = '';
      previewImageEl.classList.add('d-none');
      if (previewPlaceholderEl) {
        previewPlaceholderEl.classList.remove('d-none');
      }
    }
  };

  if (titleInput && previewTitleEl) {
    titleInput.addEventListener('input', updatePreviewTitle);
    updatePreviewTitle();
  }

  if (firstUrlInput) {
    firstUrlInput.addEventListener('input', updatePreviewImage);
  }
  if (firstAltInput) {
    firstAltInput.addEventListener('input', updatePreviewImage);
  }

  // For edit mode after prefill
  updatePreviewImage();
};

// Form helpers: read + validate

const getListingFormData = () => {
  const titleInput = qs('#listingTitle');
  const descriptionInput = qs('#listingDescription');
  const tagsInput = qs('#listingTags');
  const endsAtInput = qs('#listingEndsAt');

  const title = getTrimmedInputValue(titleInput);
  const description = getTrimmedInputValue(descriptionInput);
  const tagsRaw = getTrimmedInputValue(tagsInput);
  const endsAtRaw = getTrimmedInputValue(endsAtInput);

  return { title, description, tagsRaw, endsAtRaw };
};

const validateListingData = ({ title, description, endsAtRaw }) => {
  if (!title || !description || !endsAtRaw) {
    return 'Please fill in title, description and end date/time.';
  }

  const endsAtDate = new Date(endsAtRaw);
  if (Number.isNaN(endsAtDate.getTime())) {
    return 'Please choose a valid end date and time.';
  }

  const now = new Date();
  if (endsAtDate <= now) {
    return 'Auction end time must be in the future.';
  }

  return null;
};

// Form submit (create + update)

const setupFormSubmit = (isEditMode, listingId, listingOwnerName) => {
  const form = qs('[data-listing-edit-form]');
  if (!form) return;

  const submitBtnCreateRow = qs('#createModeButtons button[type="submit"]');
  const submitBtnEditRow = qs('#editModeButtons button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearInlineMessage();

    const currentAuth = getAuth();

    if (!currentAuth || !currentAuth.name) {
      clearAuth();
      showAlert('error', 'Login required', 'You must be logged in to create or edit listings.');
      setTimeout(() => {
        redirectToLogin();
      }, 800);
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
    if (tags) {
      payload.tags = tags;
    }

    const media = buildMediaArrayFromForm(form);
    if (media) {
      payload.media = media;
    }

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

// Init

const initListingEditPage = async () => {
  const auth = getAuth();

  if (!auth || !auth.name) {
    showAlert('error', 'Login required', 'You must be logged in to create or edit listings.');
    setTimeout(() => {
      redirectToLogin();
    }, 800);
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

  // Edit mode: load listing and check owner

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

// Run

initListingEditPage();
