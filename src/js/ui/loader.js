/**
 * Global loader element used for page-level loading states.
 *
 * This element should exist in the HTML with:
 *   data-loader="global"
 */
const loaderEl = document.querySelector('[data-loader="global"]');

/**
 * Show the global loader.
 *
 * Removes the `d-none` class and marks the element as visible
 * for assistive technologies.
 *
 * @returns {void}
 */
export const showLoader = () => {
  if (!loaderEl) {
    return;
  }
  loaderEl.classList.remove('d-none');
  loaderEl.setAttribute('aria-hidden', 'false');
};

/**
 * Hide the global loader.
 *
 * Adds the `d-none` class and marks the element as hidden
 * for assistive technologies.
 *
 * @returns {void}
 */
export const hideLoader = () => {
  if (!loaderEl) {
    return;
  }
  loaderEl.classList.add('d-none');
  loaderEl.setAttribute('aria-hidden', 'true');
};
