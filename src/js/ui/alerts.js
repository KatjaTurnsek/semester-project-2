/**
 * @typedef {Object} AlertOptions
 * @property {number} [timeout] - Auto-dismiss timeout in milliseconds. Use 0 to disable auto-dismiss.
 */

let alertContainer = null;

/**
 * Ensure there is a shared alert container in the DOM.
 * Re-uses an existing container if it already exists.
 *
 * @returns {HTMLDivElement} The alert container element.
 */
const ensureAlertContainer = () => {
  if (alertContainer && document.body.contains(alertContainer)) return alertContainer;

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
 * Show a floating alert.
 *
 * @param {'success'|'error'|'info'|'warning'} type
 *  The alert type.
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

  const validTypes = ['success', 'error', 'info', 'warning'];
  const safeType = validTypes.includes(type) ? type : 'info';

  const el = document.createElement('div');
  el.className = `sb-alert sb-alert--${safeType}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');

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

  window.requestAnimationFrame(() => {
    el.classList.add('sb-alert--visible');
  });

  if (timeout > 0) {
    window.setTimeout(() => {
      dismiss();
    }, timeout);
  }
};
