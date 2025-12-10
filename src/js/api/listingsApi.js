import { request } from './httpClient.js';

/**
 * A bid placed on a listing.
 *
 * @typedef {Object} ListingBid
 * @property {number} amount - Bid amount.
 * @property {string} created - ISO timestamp for when the bid was created.
 * @property {Object} bidder - Information about the bidder.
 * @property {string} bidder.name - Name of the bidder.
 */

/**
 * A listing in the StudioBid auction system.
 *
 * @typedef {Object} Listing
 * @property {string} id - Listing ID.
 * @property {string} title - Listing title.
 * @property {string} [description] - Optional description of the listing.
 * @property {string[]} [media] - Array of image URLs for the listing.
 * @property {string} [endsAt] - ISO timestamp for when the auction ends.
 * @property {Object} [seller] - Information about the seller.
 * @property {string} [seller.name] - Seller's name.
 * @property {Object} [_count] - Counts for related resources.
 * @property {number} [_count.bids] - Number of bids placed on the listing.
 * @property {ListingBid[]} [bids] - Array of bids associated with the listing.
 */

/**
 * Get listings, with a default query suitable for the index page.
 *
 * If no query string is provided, it defaults to:
 * `?_active=true&_seller=true&_bids=true&sort=created&sortOrder=desc`
 *
 * @param {string} [queryString] - Optional custom query string, starting with `?`.
 * @returns {Promise<Listing[]>} A promise that resolves to an array of listings.
 */
export const getListings = (queryString) => {
  const defaultQuery = '?_active=true&_seller=true&_bids=true&sort=created&sortOrder=desc';

  const qs = typeof queryString == 'string' && queryString.length > 0 ? queryString : defaultQuery;

  return request('/auction/listings' + qs);
};

/**
 * Search listings by title/description using the search endpoint.
 *
 * @param {string} [queryString] - Query string, usually starting with `?q=searchTerm` and optional filters.
 * @returns {Promise<Listing[]>} A promise that resolves to an array of matching listings.
 */
export const searchListings = (queryString) => {
  const qs = typeof queryString == 'string' && queryString.length > 0 ? queryString : '';

  return request('/auction/listings/search' + qs);
};

/**
 * Fetch a single listing by its ID.
 *
 * @param {string} id - Listing ID.
 * @param {string} [queryString] - Optional query string for includes, e.g. `"?_seller=true&_bids=true"`.
 * @returns {Promise<Listing>} A promise that resolves to the requested listing.
 */
export const getListingById = (id, queryString) => {
  const qs = queryString ? queryString : '';
  return request('/auction/listings/' + id + qs);
};

/**
 * Create a new listing.
 *
 * @param {Object} payload - Listing data to send to the API.
 * @param {string} payload.title - Title of the listing.
 * @param {string} [payload.description] - Description of the listing.
 * @param {string[]} [payload.media] - Array of image URLs.
 * @param {string} payload.endsAt - ISO timestamp for when the auction should end.
 * @returns {Promise<Listing>} A promise that resolves to the created listing.
 */
export const createListing = (payload) => {
  return request('/auction/listings', {
    method: 'POST',
    json: payload,
    auth: true,
  });
};

/**
 * Update an existing listing.
 *
 * @param {string} id - ID of the listing to update.
 * @param {Object} payload - Partial listing data to update.
 * @returns {Promise<Listing>} A promise that resolves to the updated listing.
 */
export const updateListing = (id, payload) => {
  return request('/auction/listings/' + id, {
    method: 'PUT',
    json: payload,
    auth: true,
  });
};

/**
 * Delete a listing by ID.
 *
 * @param {string} id - ID of the listing to delete.
 * @returns {Promise<void>} A promise that resolves when the listing is deleted.
 */
export const deleteListing = (id) => {
  return request('/auction/listings/' + id, {
    method: 'DELETE',
    auth: true,
  });
};

/**
 * Place a bid on a listing.
 *
 * @param {string} id - ID of the listing to bid on.
 * @param {number} amount - Bid amount.
 * @returns {Promise<ListingBid>} A promise that resolves to the created bid data.
 */
export const placeBid = (id, amount) => {
  return request('/auction/listings/' + id + '/bids', {
    method: 'POST',
    json: { amount },
    auth: true,
  });
};
