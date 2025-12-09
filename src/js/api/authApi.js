import { request, saveAuth, clearAuth, getAuth } from './httpClient.js';

export const registerUser = (payload) => {
  return request('/auth/register', {
    method: 'POST',
    json: payload,
  });
};

export const loginUser = async (payload) => {
  const data = await request('/auth/login', {
    method: 'POST',
    json: payload,
  });

  // "data" object

  saveAuth(data);
  return data;
};

export const logoutUser = () => {
  clearAuth();
};

export const getCurrentUser = () => {
  return getAuth();
};
