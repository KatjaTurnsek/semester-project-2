import { registerUser, loginUser } from '../api/authApi.js';
import { saveAuth } from '../api/httpClient.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';

const registerForm = document.querySelector('[data-auth="register-form"]');
const loginForm = document.querySelector('[data-auth="login-form"]');

/* ------------------------
   One-time logout alert
------------------------- */

(() => {
  const raw = window.localStorage.getItem('sbAuthAlert');
  if (!raw) {
    return;
  }

  try {
    const data = JSON.parse(raw) || {};
    const type = data.type || 'success';
    const title = data.title || 'Logged out';
    const message = data.message || 'You have been logged out of StudioBid.';

    showAlert(message, type, title);
  } catch {
    // ignore parse errors
  } finally {
    window.localStorage.removeItem('sbAuthAlert');
  }
})();

/* ------------------------
   Helpers: form & validation
------------------------- */

const getTrimmedField = (formData, fieldName) => String(formData.get(fieldName) || '').trim();

const validateNoroffEmail = (email) => {
  if (!email) {
    return false;
  }

  const trimmed = String(email).trim().toLowerCase();
  const suffix = '@stud.noroff.no';

  if (trimmed.indexOf('@') === -1) {
    return false;
  }

  if (trimmed.length < suffix.length) {
    return false;
  }

  if (trimmed.indexOf(suffix) === trimmed.length - suffix.length) {
    return true;
  }

  return false;
};

const buildAvatarPayload = (url, alt) => {
  if (!url) {
    return undefined;
  }

  const avatar = { url };

  if (alt) {
    avatar.alt = alt;
  }

  return avatar;
};

/* ------------------------
   REGISTER
------------------------- */

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new globalThis.FormData(registerForm);
    const name = getTrimmedField(formData, 'name');
    const email = getTrimmedField(formData, 'email');
    const password = getTrimmedField(formData, 'password');
    const avatarUrl = getTrimmedField(formData, 'avatarUrl');
    const avatarAlt = getTrimmedField(formData, 'avatarAlt');

    if (!name || !email || !password) {
      showAlert('Please fill in name, email and password.', 'error', 'Missing fields');
      return;
    }

    if (!validateNoroffEmail(email)) {
      showAlert(
        'Email must be a Noroff student address (…@stud.noroff.no).',
        'error',
        'Invalid email',
      );
      return;
    }

    if (password.length < 8) {
      showAlert('Password must be at least 8 characters long.', 'error', 'Weak password');
      return;
    }

    const payload = {
      name,
      email,
      password,
    };

    const avatar = buildAvatarPayload(avatarUrl, avatarAlt);
    if (avatar) {
      payload.avatar = avatar;
    }

    showLoader();

    try {
      await registerUser(payload);

      showAlert('Account created. You can now log in.', 'success', 'Account created');

      // Go to login page after successful registration
      window.location.href = 'login.html';
    } catch (error) {
      const msg = error && error.message ? error.message : 'Could not register. Please try again.';
      showAlert(msg, 'error', 'Registration failed');
    } finally {
      hideLoader();
    }
  });
}

/* ------------------------
   LOGIN
------------------------- */

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new globalThis.FormData(loginForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();

    if (!email || !password) {
      showAlert('Please enter email and password.', 'error', 'Missing fields');
      return;
    }

    showLoader();

    try {
      const auth = await loginUser({ email, password });

      saveAuth(auth);

      showAlert('You are now logged in.', 'success', 'Welcome back');

      window.location.href = 'index.html';
    } catch (error) {
      const msg =
        error && error.message ? error.message : 'Could not log in. Please check your details.';
      showAlert(msg, 'error', 'Login failed');
    } finally {
      hideLoader();
    }
  });
}
