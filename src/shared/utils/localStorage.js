export const setItemToLocalStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getItemFromLocalStorage = (key) => {
  const getItem = localStorage.getItem(key);
  console.log("getItem", getItem);
  if (getItem !== undefined && getItem !== "" && getItem !== null) {
    return JSON.parse(getItem);
  }
  return getItem;
};

export const clearLocalStorage = () => {
  localStorage.clear();
};

export const AppConstants = {
  accessToken: "accessToken",
  userInfo: "userInfo",
};
