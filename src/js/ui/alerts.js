let alertContainer = null;

const ensureAlertContainer = () => {
  if (alertContainer) return alertContainer;

  const el = document.createElement('div');
  el.className = 'sb-alert-container';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  document.body.appendChild(el);

  alertContainer = el;
  return el;
};

/**
 * Show a floating alert (success / error / info / warning)
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {string} title
 * @param {string} message
 * @param {{ timeout?: number }} options
 */
export const showAlert = (type, title, message, options = {}) => {
  const container = ensureAlertContainer();
  const timeout = typeof options.timeout === 'number' ? options.timeout : 5000;

  const el = document.createElement('div');
  el.className = 'sb-alert sb-alert--' + type;

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
  closeBtn.innerHTML = '&times;';

  closeBtn.addEventListener('click', () => {
    el.classList.remove('sb-alert--visible');
    window.setTimeout(() => el.remove(), 200);
  });

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
      el.classList.remove('sb-alert--visible');
      window.setTimeout(() => el.remove(), 200);
    }, timeout);
  }
};
