import { request } from './httpClient.js';

const buildProfileUrl = (name, queryString) => {
  const encodedName = encodeURIComponent(String(name || ''));
  const qs = typeof queryString === 'string' && queryString.length > 0 ? queryString : '';
  return '/auction/profiles/' + encodedName + qs;
};

const buildProfileMediaUrl = (name) => {
  const encodedName = encodeURIComponent(String(name || ''));
  return '/auction/profiles/' + encodedName + '/media';
};

// Get a single profile.
export const getProfile = async (name, queryString) => {
  const url = buildProfileUrl(name, queryString);
  const data = await request(url, { auth: true });
  return data;
};

// Update only the avatar (media endpoint).
export const updateAvatar = async (name, avatar) => {
  const url = buildProfileMediaUrl(name);
  const data = await request(url, {
    method: 'PUT',
    json: { avatar },
    auth: true,
  });
  return data;
};

// Update profile fields (bio, avatar, banner, etc.)
export const updateProfile = async (name, payload) => {
  const url = buildProfileUrl(name, '');
  const data = await request(url, {
    method: 'PUT',
    json: payload,
    auth: true,
  });
  return data;
};
