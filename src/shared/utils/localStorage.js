export const setItemToLocalStorage = (key, data) => {
  // Avoid storing undefined explicitly; remove the key instead
  if (data === undefined) {
    localStorage.removeItem(key);
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    // Fallback to string storage if JSON serialization fails
    localStorage.setItem(key, String(data));
  }
};

export const getItemFromLocalStorage = (key) => {
  const rawValue = localStorage.getItem(key);

  // Treat missing, empty string, or stringified undefined/null as absent
  if (
    rawValue === null ||
    rawValue === "" ||
    rawValue === "undefined" ||
    rawValue === "null"
  ) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    // If it's not valid JSON, return the raw string value
    return rawValue;
  }
};

export const clearLocalStorage = () => {
  localStorage.clear();
};

export const AppConstants = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  userInfo: "userInfo",
};
