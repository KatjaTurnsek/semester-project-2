/* global localStorage, fetch, Headers */

export const BASE_API_URL = 'https://v2.api.noroff.dev';
export const NOROFF_API_KEY = '3e0a65ee-1d88-4fb0-9962-797226b01b32';

const AUTH_KEY = 'studiobid-auth';

// Helpers: errors

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

// Helpers: auth token

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

// Helpers: storage

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

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

export const saveAuth = (authObj) => {
  const value = safeJsonStringify(authObj);
  if (!value) {
    return;
  }

  localStorage.setItem(AUTH_KEY, value);
};

export const getAuth = () => {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }

  return safeJsonParseAuth(raw);
};

export const clearAuth = () => {
  localStorage.removeItem(AUTH_KEY);
};

export const getAccessToken = () => {
  const auth = getAuth();
  if (auth && auth.accessToken) {
    return normalizeToken(auth.accessToken);
  }
  return '';
};

// Helpers: request setup

const buildApiUrl = (path) => {
  const isAbsolute = /^https?:\/\//i.test(path);
  if (isAbsolute) {
    return path;
  }

  const normalizedPath = path.charAt(0) === '/' ? path : '/' + path;
  return BASE_API_URL + normalizedPath;
};

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

const normalizeHeaders = (optHeaders) => {
  if (!optHeaders) {
    return {};
  }

  if (optHeaders instanceof Headers) {
    return Object.fromEntries(optHeaders.entries());
  }

  return optHeaders;
};

const safeJsonParseResponse = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

// Core request helper

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
    return json.data;
  }

  return json;
};

// Generic localStorage helpers

export const addToLocalStorage = (key, value) => {
  localStorage.setItem(key, value);
};

export const getFromLocalStorage = (key) => {
  return localStorage.getItem(key);
};

export const removeFromLocalStorage = (key) => {
  localStorage.removeItem(key);
};
