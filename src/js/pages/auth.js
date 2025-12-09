import { registerUser, loginUser } from '../api/authApi.js';
import { saveAuth } from '../api/httpClient.js';
import { showLoader, hideLoader } from '../ui/loader.js';
import { showAlert } from '../ui/alerts.js';

const registerForm = document.querySelector('[data-auth="register-form"]');
const loginForm = document.querySelector('[data-auth="login-form"]');

// One-time logout alert

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

// Helpers: form & validation

const getTrimmedField = (formData, fieldName) => String(formData.get(fieldName) || '').trim();
const ensureDefaultFeedbackText = (feedbackEl) => {
  if (!feedbackEl) return;
  if (!feedbackEl.dataset.defaultText) {
    feedbackEl.dataset.defaultText = feedbackEl.textContent || '';
  }
};

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

    // Helper text stays default + neutral color
    if (feedback && feedback.dataset.defaultText) {
      feedback.textContent = feedback.dataset.defaultText;
    }
  }

  if (state === 'invalid') {
    input.classList.add('is-invalid');

    if (feedback) {
      feedback.classList.add('text-danger');
      if (message) {
        feedback.textContent = message;
      }
    }
  }

  if (state === 'clear') {
    // remove both classes + restore helper to default
    if (feedback && feedback.dataset.defaultText) {
      feedback.textContent = feedback.dataset.defaultText;
    }
  }
};

const clearFieldsState = (form, fieldNames) => {
  if (!form || !Array.isArray(fieldNames)) return;
  fieldNames.forEach((name) => setFieldState(form, name, 'clear'));
};

const validateNoroffEmail = (email) => {
  const trimmed = String(email || '')
    .trim()
    .toLowerCase();
  const suffix = '@stud.noroff.no';

  if (!trimmed || trimmed.indexOf('@') === -1) return false;
  return trimmed.endsWith(suffix);
};

const buildAvatarPayload = (url, alt) => {
  const trimmedUrl = String(url || '').trim();
  const trimmedAlt = String(alt || '').trim();

  if (!trimmedUrl) return undefined;
  return trimmedAlt ? { url: trimmedUrl, alt: trimmedAlt } : { url: trimmedUrl };
};

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

// REGISTER

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new globalThis.FormData(registerForm);
    const name = getTrimmedField(formData, 'name');
    const email = getTrimmedField(formData, 'email');
    const password = getTrimmedField(formData, 'password');
    const avatarUrl = getTrimmedField(formData, 'avatarUrl');
    const avatarAlt = getTrimmedField(formData, 'avatarAlt');

    // clear old states
    clearFieldsState(registerForm, ['name', 'email', 'password']);

    const validationError = validateRegisterFields({ name, email, password });
    if (validationError) {
      // mark fields invalid
      validationError.fields.forEach((fieldName) =>
        setFieldState(registerForm, fieldName, 'invalid', validationError.message),
      );

      showAlert('error', validationError.title, validationError.message);
      return;
    }

    // mark core fields as valid before sending
    ['name', 'email', 'password'].forEach((fieldName) =>
      setFieldState(registerForm, fieldName, 'valid'),
    );

    const payload = { name, email, password };
    const avatar = buildAvatarPayload(avatarUrl, avatarAlt);
    if (avatar) {
      payload.avatar = avatar;
    }

    showLoader();

    try {
      await registerUser(payload);

      showAlert('success', 'Account created', 'Account created. You can now log in.');
      window.location.href = 'login.html';
    } catch (error) {
      const msg = error && error.message ? error.message : 'Could not register. Please try again.';
      showAlert('error', 'Registration failed', msg);
    } finally {
      hideLoader();
    }
  });
}

// LOGIN

if (loginForm) {
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

    // mark both as valid before request
    ['email', 'password'].forEach((fieldName) => setFieldState(loginForm, fieldName, 'valid'));

    showLoader();

    try {
      const auth = await loginUser({ email, password });

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
