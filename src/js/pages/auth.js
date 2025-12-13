import { registerUser, loginUser } from '../api/authApi.js';
import { saveAuth } from '../api/httpClient.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';

// =========================
// One-time logout alert
// =========================

/**
 * Show a one-time alert after logout if there is data stored
 * in localStorage under the key "sbAuthAlert".
 *
 * This runs once when the file is loaded.
 */
(() => {
  const raw = window.localStorage.getItem('sbAuthAlert');
  if (!raw) return;

  try {
    const data = JSON.parse(raw) || {};
    const type = data.type || 'success';
    const title = data.title || 'Logged out';
    const message = data.message || 'You have been logged out of StudioBid.';

    showAlert(type, title, message);
  } catch {
    // ignore parse errors
  } finally {
    window.localStorage.removeItem('sbAuthAlert');
  }
})();

// =========================
// Helpers: form & validation
// =========================

/**
 * Get a form field value as a trimmed string.
 *
 * @param {FormData} formData - The FormData for the form.
 * @param {string} fieldName - Name of the field to read.
 * @returns {string} The trimmed field value (empty string if missing).
 */
const getTrimmedField = (formData, fieldName) => String(formData.get(fieldName) || '').trim();

/**
 * Store the default helper text in a data attribute
 * so it can be restored later after showing errors.
 *
 * @param {HTMLElement|null} feedbackEl - Helper / feedback element under the input.
 * @returns {void}
 */
const ensureDefaultFeedbackText = (feedbackEl) => {
  if (!feedbackEl) return;
  if (!feedbackEl.dataset.defaultText) {
    feedbackEl.dataset.defaultText = feedbackEl.textContent || '';
  }
};

/**
 * Set the visual state for a form field (valid, invalid, or clear).
 *
 * @param {HTMLFormElement} form
 * @param {string} fieldName
 * @param {'valid'|'invalid'|'clear'} state
 * @param {string} [message]
 * @returns {void}
 */
const setFieldState = (form, fieldName, state, message) => {
  if (!form || !fieldName) return;

  const input = form.querySelector(`[name="${fieldName}"]`);
  const feedback = form.querySelector(`[data-feedback-for="${fieldName}"]`);

  if (!input) return;

  input.classList.remove('is-valid', 'is-invalid');

  if (feedback) {
    ensureDefaultFeedbackText(feedback);
    feedback.classList.remove('text-danger');
  }

  if (state === 'valid') {
    input.classList.add('is-valid');
    if (feedback && feedback.dataset.defaultText) {
      feedback.textContent = feedback.dataset.defaultText;
    }
  }

  if (state === 'invalid') {
    input.classList.add('is-invalid');
    if (feedback) {
      feedback.classList.add('text-danger');
      if (message) feedback.textContent = message;
    }
  }

  if (state === 'clear') {
    if (feedback && feedback.dataset.defaultText) {
      feedback.textContent = feedback.dataset.defaultText;
    }
  }
};

/**
 * Clear the visual state for several fields in a form.
 *
 * @param {HTMLFormElement} form
 * @param {string[]} fieldNames
 * @returns {void}
 */
const clearFieldsState = (form, fieldNames) => {
  if (!form || !Array.isArray(fieldNames)) return;
  fieldNames.forEach((name) => setFieldState(form, name, 'clear'));
};

/**
 * Check if an email is a valid Noroff student email.
 *
 * @param {string} email
 * @returns {boolean}
 */
const validateNoroffEmail = (email) => {
  const trimmed = String(email || '')
    .trim()
    .toLowerCase();
  const suffix = '@stud.noroff.no';

  if (!trimmed || trimmed.indexOf('@') === -1) return false;
  return trimmed.endsWith(suffix);
};

/**
 * Build an avatar payload object if a URL is provided.
 *
 * @param {string} url
 * @param {string} alt
 * @returns {Object|undefined}
 */
const buildAvatarPayload = (url, alt) => {
  const trimmedUrl = String(url || '').trim();
  const trimmedAlt = String(alt || '').trim();

  if (!trimmedUrl) return undefined;
  return trimmedAlt ? { url: trimmedUrl, alt: trimmedAlt } : { url: trimmedUrl };
};

/**
 * @param {{name: string, email: string, password: string}} fields
 * @returns {{title: string, message: string, fields: string[]}|null}
 */
const validateRegisterFields = ({ name, email, password }) => {
  const missingFields = [];
  if (!name) missingFields.push('name');
  if (!email) missingFields.push('email');
  if (!password) missingFields.push('password');

  if (missingFields.length > 0) {
    return {
      title: 'Missing fields',
      message: 'Please fill in name, email and password.',
      fields: missingFields,
    };
  }

  if (!validateNoroffEmail(email)) {
    return {
      title: 'Invalid email',
      message: 'Email must be a Noroff student address (…@stud.noroff.no).',
      fields: ['email'],
    };
  }

  if (password.length < 8) {
    return {
      title: 'Weak password',
      message: 'Password must be at least 8 characters long.',
      fields: ['password'],
    };
  }

  return null;
};

/**
 * @param {string} email
 * @param {string} password
 * @returns {{title: string, message: string, fields: string[]}|null}
 */
const validateLoginFields = (email, password) => {
  const missing = [];
  if (!email) missing.push('email');
  if (!password) missing.push('password');

  if (missing.length > 0) {
    return {
      title: 'Missing fields',
      message: 'Please enter email and password.',
      fields: missing,
    };
  }

  return null;
};

// =========================
// Bind handlers
// =========================

const bindAuthHandlers = () => {
  const registerForm = document.querySelector('[data-auth="register-form"]');
  const loginForm = document.querySelector('[data-auth="login-form"]');

  // =========================
  // REGISTER
  // =========================

  if (registerForm && registerForm.dataset.boundAuth !== '1') {
    registerForm.dataset.boundAuth = '1';

    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new globalThis.FormData(registerForm);
      const name = getTrimmedField(formData, 'name');
      const email = getTrimmedField(formData, 'email');
      const password = getTrimmedField(formData, 'password');
      const avatarUrl = getTrimmedField(formData, 'avatarUrl');
      const avatarAlt = getTrimmedField(formData, 'avatarAlt');

      clearFieldsState(registerForm, ['name', 'email', 'password']);

      const validationError = validateRegisterFields({ name, email, password });
      if (validationError) {
        validationError.fields.forEach((fieldName) =>
          setFieldState(registerForm, fieldName, 'invalid', validationError.message),
        );
        showAlert('error', validationError.title, validationError.message);
        return;
      }

      ['name', 'email', 'password'].forEach((fieldName) =>
        setFieldState(registerForm, fieldName, 'valid'),
      );

      const payload = { name, email, password };
      const avatar = buildAvatarPayload(avatarUrl, avatarAlt);
      if (avatar) payload.avatar = avatar;

      showLoader();

      try {
        await registerUser(payload);

        showAlert('success', 'Account created', 'Account created. You can now log in.');
        window.location.href = 'login.html';
      } catch (error) {
        const msg =
          error && error.message ? error.message : 'Could not register. Please try again.';
        showAlert('error', 'Registration failed', msg);
      } finally {
        hideLoader();
      }
    });
  }

  // =========================
  // LOGIN
  // =========================

  if (loginForm && loginForm.dataset.boundAuth !== '1') {
    loginForm.dataset.boundAuth = '1';

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new globalThis.FormData(loginForm);
      const email = getTrimmedField(formData, 'email');
      const password = getTrimmedField(formData, 'password');

      clearFieldsState(loginForm, ['email', 'password']);

      const validationError = validateLoginFields(email, password);
      if (validationError) {
        validationError.fields.forEach((fieldName) =>
          setFieldState(loginForm, fieldName, 'invalid', validationError.message),
        );
        showAlert('error', validationError.title, validationError.message);
        return;
      }

      ['email', 'password'].forEach((fieldName) => setFieldState(loginForm, fieldName, 'valid'));

      showLoader();

      try {
        const auth = await loginUser({ email, password });

        // Ensure auth is saved
        saveAuth(auth);

        showAlert('success', 'Welcome back', 'You are now logged in.');
        window.location.href = 'index.html';
      } catch (error) {
        const msg =
          error && error.message ? error.message : 'Could not log in. Please check your details.';
        showAlert('error', 'Login failed', msg);
      } finally {
        hideLoader();
      }
    });
  }
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bindAuthHandlers);
} else {
  bindAuthHandlers();
}
