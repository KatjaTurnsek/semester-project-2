// =========================
// Small DOM helper
// =========================

/**
 * Shorthand for `document.querySelector`.
 *
 * @param {string} selector - CSS selector string.
 * @returns {Element|null} First matching element or null.
 */
export const qs = (selector) => document.querySelector(selector);

// =========================
// Small helpers
// =========================

/**
 * Redirect the user to the login page.
 *
 * @returns {void}
 */
export const redirectToLogin = () => {
  window.location.href = 'login.html';
};

/**
 * Safely parse a date value into a Date object.
 *
 * @param {string|Date|null|undefined} value - Raw date value from API.
 * @returns {Date|null} Parsed Date or null if invalid.
 */
export const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Remove all child nodes from an element.
 *
 * @param {HTMLElement|null} element - Element to clear.
 * @returns {void}
 */
export const clearElement = (element) => {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

/**
 * Create a badge element that shows "ENDED" for auctions.
 *
 * @returns {HTMLSpanElement} Badge span element.
 */
export const createEndedBadge = () => {
  const span = document.createElement('span');
  span.className = 'badge-ended position-absolute top-0 start-0 m-2';
  span.textContent = 'ENDED';
  return span;
};

/**
 * Create a badge element that shows "WON" for auctions.
 *
 * @param {string} [position='end'] - "start" or "end" for which corner to use.
 * @returns {HTMLSpanElement} Badge span element.
 */
export const createWonBadge = (position = 'end') => {
  const side = position === 'start' ? 'start' : 'end';
  const span = document.createElement('span');
  span.className = `badge-won position-absolute top-0 ${side}-0 m-2`;
  span.textContent = 'WON';
  return span;
};

/**
 * Get initials from a full name.
 *
 * @param {string} name - Full name string.
 * @returns {string} Initials or "?" if not available.
 */
export const getInitials = (name) => {
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
 * Get the profile name from the URL query string (`?name=...`).
 *
 * @returns {string|null} Profile name or null if not present.
 */
export const getProfileNameFromQuery = () => {
  const search = window.location.search || '';
  const withoutQuestionMark = search.startsWith('?') ? search.slice(1) : search;
  const pairs = withoutQuestionMark.split('&').filter(Boolean);

  for (let i = 0; i < pairs.length; i += 1) {
    const parts = pairs[i].split('=');
    const key = parts[0];
    const value = parts[1];

    if (key === 'name') {
      return decodeURIComponent(value || '');
    }
  }

  return null;
};

// =========================
// Confirm helper
// =========================

/**
 * Ask the user to confirm an action.
 * Uses Bootstrap Modal if available, otherwise falls back to window.confirm.
 *
 * @param {string} message - Confirmation message.
 * @param {Object} [options]
 * @param {string} [options.title] - Modal title.
 * @param {string} [options.confirmText] - Confirm button text.
 * @param {string} [options.cancelText] - Cancel button text.
 * @returns {Promise<boolean>} True if confirmed, otherwise false.
 */
export const confirmAction = (message, options = {}) => {
  const title = options.title || 'Confirm';
  const confirmText = options.confirmText || 'Yes, delete';
  const cancelText = options.cancelText || 'Cancel';

  // @ts-ignore
  const BootstrapModal = window.bootstrap && window.bootstrap.Modal ? window.bootstrap.Modal : null;
  if (!BootstrapModal) {
    return Promise.resolve(window.confirm(message));
  }

  return new Promise((resolve) => {
    const wrapper = document.createElement('div');

    const modalEl = document.createElement('div');
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');

    const dialogEl = document.createElement('div');
    dialogEl.className = 'modal-dialog modal-dialog-centered';

    const contentEl = document.createElement('div');
    contentEl.className = 'modal-content rounded-0';

    const headerEl = document.createElement('div');
    headerEl.className = 'modal-header';

    const titleEl = document.createElement('h5');
    titleEl.className = 'modal-title';
    titleEl.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close';
    closeBtn.setAttribute('aria-label', 'Close');

    headerEl.appendChild(titleEl);
    headerEl.appendChild(closeBtn);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'modal-body';

    const p = document.createElement('p');
    p.className = 'mb-0';
    p.textContent = message;

    bodyEl.appendChild(p);

    const footerEl = document.createElement('div');
    footerEl.className = 'modal-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-outline-dark rounded-0';
    cancelBtn.textContent = cancelText;

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn btn-dark rounded-0';
    confirmBtn.textContent = confirmText;

    footerEl.appendChild(cancelBtn);
    footerEl.appendChild(confirmBtn);

    contentEl.appendChild(headerEl);
    contentEl.appendChild(bodyEl);
    contentEl.appendChild(footerEl);

    dialogEl.appendChild(contentEl);
    modalEl.appendChild(dialogEl);
    wrapper.appendChild(modalEl);
    document.body.appendChild(wrapper);

    const modal = new BootstrapModal(modalEl, { backdrop: 'static' });

    let settled = false;
    const done = (val) => {
      if (settled) return;
      settled = true;
      resolve(val);
      modal.hide();
    };

    confirmBtn.addEventListener('click', () => done(true));
    cancelBtn.addEventListener('click', () => done(false));
    closeBtn.addEventListener('click', () => done(false));

    modalEl.addEventListener('hidden.bs.modal', () => {
      wrapper.remove();
      if (!settled) resolve(false);
    });

    modal.show();
  });
};

// =========================
// Tabs helper: activate correct tab from hash
// =========================

/**
 * Activate a Bootstrap tab pane and its nav link by pane id.
 *
 * @param {string} paneId - The id of the tab pane (e.g. "tab-active").
 * @returns {void}
 */
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

/**
 * Activate the correct tab based on the URL hash.
 *
 * @returns {void}
 */
export const activateTabFromHash = () => {
  const hash = window.location.hash || '';

  if (hash === '#my-bids') {
    activateTab('tab-bids');
  } else if (hash === '#my-listings') {
    activateTab('tab-active');
  } else if (hash === '#my-wins') {
    activateTab('tab-wins');
  }
};
