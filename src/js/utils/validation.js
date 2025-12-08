export const isNonEmptyString = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  return value.trim().length > 0;
};

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
