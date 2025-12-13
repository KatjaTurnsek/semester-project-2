import { request } from './httpClient.js';

/**
 * A basic profile in the StudioBid auction system.
 *
 * @typedef {Object} Profile
 * @property {string} name - Unique profile name / handle.
 * @property {string} email - Email address for the profile.
 * @property {string} [avatar] - URL to the profile avatar image.
 * @property {number} [credits] - Available credits for bidding.
 * @property {Object} [_count] - Counts for related resources.
 * @property {number} [_count.listings] - Number of listings created by the user.
 * @property {number} [_count.wins] - Number of auctions won by the user.
 */

/**
 * Summary of a single bid made by a profile.
 *
 * @typedef {Object} ProfileBid
 * @property {string} id - Bid ID.
 * @property {number} amount - Bid amount.
 * @property {string} created - ISO timestamp when the bid was created.
 * @property {Object} listing - The listing this bid belongs to.
 * @property {string} listing.id - Listing ID.
 * @property {string} listing.title - Listing title.
 */

/**
 * Summary of a winning listing for a profile.
 *
 * @typedef {Object} ProfileWin
 * @property {string} id - Listing ID.
 * @property {string} title - Listing title.
 * @property {string} [description] - Listing description.
 * @property {string[]} [media] - Listing media URLs.
 * @property {string} endsAt - ISO timestamp when the auction ended.
 * @property {number} [finalBid] - Final winning bid amount (if returned by the API).
 */

/**
 * Build a profile URL with an optional query string.
 *
 * @param {string} name - Profile name.
 * @param {string} [queryString] - Optional query string (starting with `?`).
 * @returns {string} Relative API path for the profile.
 * @private
 */
const buildProfileUrl = (name, queryString) => {
  const encodedName = encodeURIComponent(String(name || ''));
  const qs = typeof queryString === 'string' && queryString.length > 0 ? queryString : '';
  return `/auction/profiles/${encodedName}${qs}`;
};

/**
 * Build the URL for updating profile media (avatar).
 *
 * @param {string} name - Profile name.
 * @returns {string} Relative API path for the profile media.
 * @private
 */
const buildProfileMediaUrl = (name) => {
  const encodedName = encodeURIComponent(String(name || ''));
  return `/auction/profiles/${encodedName}/media`;
};

/**
 * Build the URL for fetching profile bids.
 *
 * @param {string} name - Profile name.
 * @param {string} [queryString] - Optional query string.
 * @returns {string} Relative API path for the profile bids.
 * @private
 */
const buildProfileBidsUrl = (name, queryString) => {
  const encodedName = encodeURIComponent(String(name || ''));
  const qs = typeof queryString === 'string' && queryString.length > 0 ? queryString : '';
  return `/auction/profiles/${encodedName}/bids${qs}`;
};

/**
 * Build the URL for fetching profile wins.
 *
 * @param {string} name - Profile name.
 * @param {string} [queryString] - Optional query string.
 * @returns {string} Relative API path for the profile wins.
 * @private
 */
const buildProfileWinsUrl = (name, queryString) => {
  const encodedName = encodeURIComponent(String(name || ''));
  const qs = typeof queryString === 'string' && queryString.length > 0 ? queryString : '';
  return `/auction/profiles/${encodedName}/wins${qs}`;
};

/**
 * Get a profile by name.
 *
 * @param {string} name - Profile name.
 * @param {string} [queryString] - Optional query string, e.g. `"?_listings=true&_wins=true"`.
 * @returns {Promise<Profile>} A promise that resolves to the profile data.
 */
export const getProfile = async (name, queryString) => {
  const url = buildProfileUrl(name, queryString);
  const data = await request(url, { auth: true });
  return data;
};

/**
 * Update the avatar image for a profile.
 *
 * @param {string} name - Profile name.
 * @param {string} avatar - URL to the new avatar image.
 * @returns {Promise<Profile>} A promise that resolves to the updated profile.
 */
export const updateAvatar = async (name, avatar) => {
  const url = buildProfileMediaUrl(name);
  const data = await request(url, {
    method: 'PUT',
    json: { avatar },
    auth: true,
  });
  return data;
};

/**
 * Update profile data (e.g., bio or other fields supported by the API).
 *
 * @param {string} name - Profile name.
 * @param {Object} payload - Partial profile data to update.
 * @returns {Promise<Profile>} A promise that resolves to the updated profile.
 */
export const updateProfile = async (name, payload) => {
  const url = buildProfileUrl(name);
  const data = await request(url, {
    method: 'PUT',
    json: payload,
    auth: true,
  });
  return data;
};

/**
 * Get a list of bids placed by a profile.
 *
 * @param {string} name - Profile name.
 * @param {string} [queryString] - Optional query string, e.g. `"?_listings=true"`.
 * @returns {Promise<ProfileBid[]>} A promise that resolves to an array of bids.
 */
export const getProfileBids = async (name, queryString) => {
  const url = buildProfileBidsUrl(name, queryString);
  const data = await request(url, { auth: true });
  return data;
};

/**
 * Get a list of auctions won by a profile.
 *
 * @param {string} name - Profile name.
 * @param {string} [queryString] - Optional query string for includes/filters.
 * @returns {Promise<ProfileWin[]>} A promise that resolves to an array of winning listings.
 */
export const getProfileWins = async (name, queryString) => {
  const url = buildProfileWinsUrl(name, queryString);
  const data = await request(url, { auth: true });
  return data;
};
