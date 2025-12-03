const loaderEl = document.querySelector('[data-loader="global"]');

export const showLoader = () => {
  if (!loaderEl) {
    return;
  }
  loaderEl.classList.remove('d-none');
  loaderEl.setAttribute('aria-hidden', 'false');
};

export const hideLoader = () => {
  if (!loaderEl) {
    return;
  }
  loaderEl.classList.add('d-none');
  loaderEl.setAttribute('aria-hidden', 'true');
};
