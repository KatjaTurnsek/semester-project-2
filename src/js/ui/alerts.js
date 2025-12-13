/**
 * @typedef {Object} AlertOptions
 * @property {number} [timeout] - Auto-dismiss timeout in milliseconds. Use 0 to disable auto-dismiss.
 */

let alertContainer = null;

/**
 * Ensure there is a shared alert container in the DOM.
 * Re-uses an existing container if it already exists (important for dev reload / duplicate script runs).
 *
 * @returns {HTMLDivElement} The alert container element.
 */
const ensureAlertContainer = () => {
  // If we already have a cached container and it still exists in the DOM, use it
  if (alertContainer && document.body.contains(alertContainer)) return alertContainer;

  // Re-use an existing container if one is already present
  const existing = document.querySelector('.sb-alert-container');
  if (existing && existing.nodeType === 1 && existing.tagName === 'DIV') {
    alertContainer = /** @type {HTMLDivElement} */ (existing);
    return alertContainer;
  }

  const el = document.createElement('div');
  el.className = 'sb-alert-container';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  document.body.appendChild(el);

  alertContainer = el;
  return el;
};

/**
 * Show a floating alert (success / error / info / warning).
 *
 * @param {'success'|'error'|'info'|'warning'} type
 *  The alert type (only `success` and `error` are styled differently; others fall back to `success`).
 * @param {string} title
 *  Short title text for the alert.
 * @param {string} message
 *  Main message text for the alert.
 * @param {AlertOptions} [options={}]
 *  Optional configuration, such as auto-dismiss timeout.
 * @returns {void}
 */
export const showAlert = (type, title, message, options = {}) => {
  const container = ensureAlertContainer();
  const timeout = typeof options.timeout === 'number' ? options.timeout : 5000;

  const validTypes = ['success', 'error'];
  const safeType = validTypes.includes(type) ? type : 'success';

  const el = document.createElement('div');
  el.className = 'sb-alert sb-alert--' + safeType;
  el.setAttribute('role', 'alert');

  const icon = document.createElement('div');
  icon.className = 'sb-alert__icon';

  const content = document.createElement('div');
  content.className = 'sb-alert__content';

  const titleEl = document.createElement('p');
  titleEl.className = 'sb-alert__title';
  titleEl.textContent = title;

  const msgEl = document.createElement('p');
  msgEl.className = 'sb-alert__message';
  msgEl.textContent = message;

  content.appendChild(titleEl);
  content.appendChild(msgEl);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'sb-alert__close';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.textContent = '×';

  const dismiss = () => {
    // Guard against double-dismiss
    if (!el.isConnected) return;
    el.classList.remove('sb-alert--visible');
    window.setTimeout(() => {
      if (el.isConnected) el.remove();
    }, 200);
  };

  closeBtn.addEventListener('click', dismiss);

  el.appendChild(icon);
  el.appendChild(content);
  el.appendChild(closeBtn);

  container.appendChild(el);

  // Small fade-in
  window.requestAnimationFrame(() => {
    el.classList.add('sb-alert--visible');
  });

  if (timeout > 0) {
    window.setTimeout(() => {
      dismiss();
    }, timeout);
  }
};
