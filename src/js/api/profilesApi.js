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

const buildProfileBidsUrl = (name, queryString) => {
  const encodedName = encodeURIComponent(String(name || ''));
  const qs = typeof queryString === 'string' && queryString.length > 0 ? queryString : '';
  return '/auction/profiles/' + encodedName + '/bids' + qs;
};

const buildProfileWinsUrl = (name, queryString) => {
  const encodedName = encodeURIComponent(String(name || ''));
  const qs = typeof queryString === 'string' && queryString.length > 0 ? queryString : '';
  return '/auction/profiles/' + encodedName + '/wins' + qs;
};

export const getProfile = async (name, queryString) => {
  const url = buildProfileUrl(name, queryString);
  const data = await request(url, { auth: true });
  return data;
};

export const updateAvatar = async (name, avatar) => {
  const url = buildProfileMediaUrl(name);
  const data = await request(url, {
    method: 'PUT',
    json: { avatar },
    auth: true,
  });
  return data;
};

export const updateProfile = async (name, payload) => {
  const url = buildProfileUrl(name, '');
  const data = await request(url, {
    method: 'PUT',
    json: payload,
    auth: true,
  });
  return data;
};

export const getProfileBids = async (name, queryString) => {
  const url = buildProfileBidsUrl(name, queryString);
  const data = await request(url, { auth: true });
  return data;
};

export const getProfileWins = async (name, queryString) => {
  const url = buildProfileWinsUrl(name, queryString);
  const data = await request(url, { auth: true });
  return data;
};
