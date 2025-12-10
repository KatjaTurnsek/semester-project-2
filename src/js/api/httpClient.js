/* global localStorage, fetch, Headers */

/**
 * Base URL for all Noroff API requests.
 * @type {string}
 */
export const BASE_API_URL = 'https://v2.api.noroff.dev';

/**
 * Noroff API key used to authenticate requests.
 * @type {string}
 */
export const NOROFF_API_KEY = '3e0a65ee-1d88-4fb0-9962-797226b01b32';

const AUTH_KEY = 'studiobid-auth';

/**
 * Authentication data stored in localStorage.
 *
 * @typedef {Object} AuthData
 * @property {string} accessToken - The JWT access token.
 * @property {string} [name] - The user's display name (if provided by the API).
 * @property {string} [email] - The user's email address.
 * @property {number} [credits] - The user's credits (if provided by the API).
 */

/**
 * General options for the {@link request} function.
 *
 * @typedef {Object} RequestOptions
 * @property {Object} [json] - Object to be JSON-encoded as the request body.
 * @property {boolean} [auth] - Whether to include the stored bearer token in the request.
 * @property {Object|Headers} [headers] - Additional headers to send with the request.
 * @property {BodyInit} [body] - Raw body to send (used if `json` is not provided).
 * @property {string} [method] - HTTP method, e.g. `"GET"`, `"POST"`, `"PUT"`, etc.
 */

/**
 * Extract a human-readable error message from an API JSON response.
 *
 * @param {unknown} json - Parsed JSON response body.
 * @param {string} [fallback] - Fallback message if none is found in the JSON.
 * @returns {string} A user-friendly error message.
 */
const errorMessageFrom = (json, fallback) => {
  if (json && typeof json === 'object') {
    if (Array.isArray(json.errors) && json.errors.length > 0) {
      const first = json.errors[0];
      if (first && first.message) {
        return first.message;
      }
    }

    if (json.message) {
      return json.message;
    }

    if (json.status) {
      return json.status;
    }
  }

  return fallback || 'Request failed';
};

/**
 * Normalize a bearer token by stripping a leading `"Bearer "` prefix if present.
 *
 * @param {string} [raw] - Raw token value.
 * @returns {string} Normalized token string.
 */
const normalizeToken = (raw) => {
  if (!raw) {
    return '';
  }

  const trimmed = String(raw).trim();
  if (trimmed.toLowerCase().indexOf('bearer ') === 0) {
    return trimmed.slice(7);
  }

  return trimmed;
};

/**
 * Safely stringify a value to JSON, returning null if it fails.
 *
 * @param {unknown} value - Value to serialize.
 * @returns {string|null} JSON string or null if serialization fails.
 */
const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

/**
 * Safely parse an auth JSON value, returning null on failure.
 *
 * @param {string|null} raw - Raw JSON string from storage.
 * @returns {AuthData|null} Parsed auth data or null.
 */
const safeJsonParseAuth = (raw) => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Persist authentication data to localStorage.
 *
 * @param {AuthData} authObj - Auth object returned from the API.
 * @returns {void}
 */
export const saveAuth = (authObj) => {
  const value = safeJsonStringify(authObj);
  if (!value) {
    return;
  }

  localStorage.setItem(AUTH_KEY, value);
};

/**
 * Get the currently stored authentication data from localStorage.
 *
 * @returns {AuthData|null} Parsed auth data, or null if none is stored.
 */
export const getAuth = () => {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }

  return safeJsonParseAuth(raw);
};

/**
 * Remove authentication data from localStorage.
 *
 * @returns {void}
 */
export const clearAuth = () => {
  localStorage.removeItem(AUTH_KEY);
};

/**
 * Get the current access token (without the `"Bearer "` prefix).
 *
 * @returns {string} The normalized access token string, or an empty string if not available.
 */
export const getAccessToken = () => {
  const auth = getAuth();
  if (auth && auth.accessToken) {
    return normalizeToken(auth.accessToken);
  }
  return '';
};

/**
 * Build a full Noroff API URL from a path, unless an absolute URL is provided.
 *
 * @param {string} path - Relative path (e.g. `"/auction/listings"`) or absolute URL.
 * @returns {string} Full URL to be used in `fetch`.
 */
const buildApiUrl = (path) => {
  const isAbsolute = /^https?:\/\//i.test(path);
  if (isAbsolute) {
    return path;
  }

  const normalizedPath = path.charAt(0) === '/' ? path : '/' + path;
  return BASE_API_URL + normalizedPath;
};

/**
 * Check whether a headers object already contains a given header name (case-insensitive).
 *
 * @param {Object} headersObj - Headers object.
 * @param {string} name - Header name to look for.
 * @returns {boolean} True if the header exists, otherwise false.
 */
const hasHeader = (headersObj, name) => {
  if (!headersObj) {
    return false;
  }

  const lowerName = String(name).toLowerCase();
  const keys = Object.keys(headersObj);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key && key.toLowerCase() === lowerName) {
      return true;
    }
  }

  return false;
};

/**
 * Normalize various header representations (Headers instance or plain object) into a plain object.
 *
 * @param {Object|Headers} [optHeaders] - Optional headers representation.
 * @returns {Object} Plain headers object.
 */
const normalizeHeaders = (optHeaders) => {
  if (!optHeaders) {
    return {};
  }

  if (optHeaders instanceof Headers) {
    return Object.fromEntries(optHeaders.entries());
  }

  return optHeaders;
};

/**
 * Safely parse a fetch response as JSON, returning null if parsing fails.
 *
 * @param {Response} res - Fetch response object.
 * @returns {Promise<unknown|null>} Parsed JSON or null.
 */
const safeJsonParseResponse = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

/**
 * Core HTTP request helper for the Noroff API.
 *
 * Automatically:
 * - Prefixes relative paths with {@link BASE_API_URL}
 * - Adds the Noroff API key header
 * - Optionally includes a bearer token when `auth` is true
 * - JSON-encodes the `json` option into the request body
 * - Throws an Error with a user-friendly message if the response is not OK
 * - Returns `json.data` if the response has a `data` property, otherwise returns the full JSON
 *
 * @template T
 * @param {string} path - Relative API path or absolute URL.
 * @param {RequestOptions} [options={}] - Request configuration options.
 * @returns {Promise<T>} A promise that resolves to the parsed response payload.
 * @throws {Error} If the response status is not OK (>= 400).
 */
export const request = async (path, options = {}) => {
  const { json: jsonBody, auth, headers: optHeaders, body: optBody, ...rest } = options;

  const url = buildApiUrl(path);
  const baseHeaders = normalizeHeaders(optHeaders);

  const shouldSendJson = jsonBody !== undefined && !hasHeader(baseHeaders, 'content-type');

  const rawToken = auth ? getAccessToken() : '';
  const token = auth ? normalizeToken(rawToken) : '';

  const headers = {
    ...baseHeaders,
    'X-Noroff-API-Key': NOROFF_API_KEY,
    ...(auth && token && { Authorization: 'Bearer ' + token }),
    ...(shouldSendJson && { 'Content-Type': 'application/json' }),
  };

  let body = optBody != null ? optBody : undefined;
  if (jsonBody !== undefined) {
    body = JSON.stringify(jsonBody);
  }

  const res = await fetch(url, { ...rest, headers, body });

  const json = await safeJsonParseResponse(res);

  if (!res.ok) {
    const msg = errorMessageFrom(json, res.statusText || 'Request failed');
    throw new Error(msg);
  }

  if (json && typeof json === 'object' && 'data' in json) {
    // @ts-ignore - runtime guard ensures this is safe
    return json.data;
  }

  // @ts-ignore - runtime type, caller decides the expected shape
  return json;
};

/**
 * Save a simple value to localStorage under a given key.
 *
 * @param {string} key - Storage key.
 * @param {string} value - Value to store.
 * @returns {void}
 */
export const addToLocalStorage = (key, value) => {
  localStorage.setItem(key, value);
};

/**
 * Read a value from localStorage.
 *
 * @param {string} key - Storage key.
 * @returns {string|null} Stored value or null if not found.
 */
export const getFromLocalStorage = (key) => {
  return localStorage.getItem(key);
};

/**
 * Remove a value from localStorage.
 *
 * @param {string} key - Storage key.
 * @returns {void}
 */
export const removeFromLocalStorage = (key) => {
  localStorage.removeItem(key);
};
