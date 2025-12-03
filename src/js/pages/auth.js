/* global FormData */

import { registerUser, loginUser } from '../api/authApi.js';
import { saveAuth } from '../api/httpClient.js';
import { showLoader, hideLoader } from '../ui/loader.js';

const registerForm = document.querySelector('[data-auth="register-form"]');
const loginForm = document.querySelector('[data-auth="login-form"]');
const messageEl = document.querySelector('[data-auth="message"]');

/* ------------------------
   Helpers: messages
------------------------- */

const showMessage = (text, type) => {
  if (!messageEl) {
    return;
  }

  let extraClass = 'alert-info';

  if (type === 'error') {
    extraClass = 'alert-danger';
  } else if (type === 'success') {
    extraClass = 'alert-success';
  }

  messageEl.textContent = text;
  messageEl.className = 'alert ' + extraClass;
  messageEl.classList.remove('d-none');
  messageEl.setAttribute('role', 'alert');
};

const clearMessage = () => {
  if (!messageEl) {
    return;
  }

  messageEl.textContent = '';
  messageEl.className = 'alert d-none';
};

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
    clearMessage();

    const formData = new FormData(registerForm);
    const name = getTrimmedField(formData, 'name');
    const email = getTrimmedField(formData, 'email');
    const password = getTrimmedField(formData, 'password');
    const avatarUrl = getTrimmedField(formData, 'avatarUrl');
    const avatarAlt = getTrimmedField(formData, 'avatarAlt');

    if (!name || !email || !password) {
      showMessage('Please fill in name, email and password.', 'error');
      return;
    }

    if (!validateNoroffEmail(email)) {
      showMessage('Email must be a Noroff student address (…@stud.noroff.no).', 'error');
      return;
    }

    if (password.length < 8) {
      showMessage('Password must be at least 8 characters long.', 'error');
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
      showMessage('Account created. You can now log in.', 'success');
      window.location.href = 'login.html';
    } catch (error) {
      const msg = error && error.message ? error.message : 'Could not register. Please try again.';
      showMessage(msg, 'error');
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
    clearMessage();

    const formData = new FormData(loginForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();

    if (!email || !password) {
      showMessage('Please enter email and password.', 'error');
      return;
    }

    showLoader();

    try {
      const auth = await loginUser({ email, password });

      // Save auth exactly as returned from the API
      saveAuth(auth);

      // Redirect to index – header.js will take care of header state
      window.location.href = 'index.html';
    } catch (error) {
      const msg =
        error && error.message ? error.message : 'Could not log in. Please check your details.';
      showMessage(msg, 'error');
    } finally {
      hideLoader();
    }
  });
}
