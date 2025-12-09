import { request } from './httpClient.js';

// Get listings, with a default query for the index page

export const getListings = (queryString) => {
  const defaultQuery = '?_active=true&_seller=true&_bids=true&sort=created&sortOrder=desc';

  const qs = typeof queryString == 'string' && queryString.length > 0 ? queryString : defaultQuery;

  return request('/auction/listings' + qs);
};

// Search listings by title/description

export const searchListings = (queryString) => {
  const qs = typeof queryString == 'string' && queryString.length > 0 ? queryString : '';

  return request('/auction/listings/search' + qs);
};

export const getListingById = (id, queryString) => {
  const qs = queryString ? queryString : '';
  return request('/auction/listings/' + id + qs);
};

export const createListing = (payload) => {
  return request('/auction/listings', {
    method: 'POST',
    json: payload,
    auth: true,
  });
};

export const updateListing = (id, payload) => {
  return request('/auction/listings/' + id, {
    method: 'PUT',
    json: payload,
    auth: true,
  });
};

export const deleteListing = (id) => {
  return request('/auction/listings/' + id, {
    method: 'DELETE',
    auth: true,
  });
};

export const placeBid = (id, amount) => {
  return request('/auction/listings/' + id + '/bids', {
    method: 'POST',
    json: { amount },
    auth: true,
  });
};
