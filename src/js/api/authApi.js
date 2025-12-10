import { request, saveAuth, clearAuth, getAuth } from './httpClient.js';

/**
 * Credentials used when registering or logging in a user.
 *
 * @typedef {Object} AuthCredentials
 * @property {string} email - The user's Noroff student email.
 * @property {string} password - The user's password.
 * @property {string} [name] - The user's display name (used on registration).
 */

/**
 * Authentication data stored after login/registration.
 *
 * @typedef {Object} AuthData
 * @property {string} accessToken - The JWT access token.
 * @property {string} name - The user's display name.
 * @property {string} email - The user's email.
 * @property {number} [credits] - The user's credits (if provided by the API).
 */

/**
 * Register a new user with the Noroff Auction API.
 *
 * @param {AuthCredentials} payload - Registration payload containing email, password and optionally name.
 * @returns {Promise<AuthData>} A promise that resolves to the created user and auth data.
 */
export const registerUser = (payload) => {
  return request('/auth/register', {
    method: 'POST',
    json: payload,
  });
};

/**
 * Log in an existing user and persist their auth data in storage.
 *
 * @param {AuthCredentials} payload - Login payload containing email and password.
 * @returns {Promise<AuthData>} A promise that resolves to the auth data returned by the API.
 */
export const loginUser = async (payload) => {
  const data = await request('/auth/login', {
    method: 'POST',
    json: payload,
  });

  // Persist auth info (token, profile, etc.)
  saveAuth(data);
  return data;
};

/**
 * Log out the current user by clearing stored auth data.
 *
 * @returns {void}
 */
export const logoutUser = () => {
  clearAuth();
};

/**
 * Get the currently stored authenticated user, if any.
 *
 * @returns {AuthData|null} The stored auth data, or null if no user is logged in.
 */
export const getCurrentUser = () => {
  return getAuth();
};
