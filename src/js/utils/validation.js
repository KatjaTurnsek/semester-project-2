/**
 * Check if a value is a non-empty string after trimming.
 *
 * @param {unknown} value - Any value to test.
 * @returns {boolean} True if value is a non-empty string, otherwise false.
 */
export const isNonEmptyString = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  return value.trim().length > 0;
};

/**
 * Convert a date-like value into a readable local date/time string.
 *
 * Returns an empty string if the value is missing or invalid.
 *
 * @param {string|number|Date|null|undefined} value - Value that can be passed to `new Date()`.
 * @returns {string} Localized date/time or empty string on failure.
 */
export const toReadableDateTime = (value) => {
  if (!value) {
    return '';
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return '';
  }

  return d.toLocaleString();
};
