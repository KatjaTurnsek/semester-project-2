// Global styles + Bootstrap JS
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/main.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Figure out which page we're on
const page = document.body.dataset.page;

// Page-specific JS
switch (page) {
  case 'index':
    import('./js/pages/indexPage.js').then((m) => m.initIndexPage());
    break;
  case 'listing':
    import('./js/pages/listingPage.js').then((m) => m.initListingPage());
    break;
  case 'auth':
    import('./js/pages/authPage.js').then((m) => m.initAuthPage());
    break;
  case 'profile':
    import('./js/pages/profilePage.js').then((m) => m.initProfilePage());
    break;
  case 'listing-edit':
    import('./js/pages/listingEditPage.js').then((m) => m.initListingEditPage());
    break;
  case 'how':
    import('./js/pages/howPage.js').then((m) => m.initHowPage());
    break;
  case 'not-found':
    import('./js/pages/notFoundPage.js').then((m) => m.initNotFoundPage());
    break;
  default:
    // Optional: no-op or log
    // console.warn('Unknown page type:', page);
    break;
}
