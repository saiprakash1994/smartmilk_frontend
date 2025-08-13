import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { APIUrl } from "../ApiUrl/apiUrl";
import {
  AppConstants,
  clearLocalStorage,
  getItemFromLocalStorage,
  setItemToLocalStorage,
} from "../shared/utils/localStorage";

let refreshInProgress = false;

const baseQuery = fetchBaseQuery({
  baseUrl: `${APIUrl.URL}`,
  prepareHeaders: (headers) => {
    const token = getItemFromLocalStorage(AppConstants.accessToken);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const handleLogout = (api) => {
  clearLocalStorage();
  api.dispatch({ type: "userInfoSlice/clearUserInfo" });
};

export const baseQueryReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // Handle token expiration based on both status and message
  const isTokenExpired =
    result.error &&
    (result.error.status === 401 ||
      result.error.data?.message?.toLowerCase().includes("jwt expired"));

  if (isTokenExpired) {
    if (!refreshInProgress) {
      refreshInProgress = true;
      const refreshToken = await getItemFromLocalStorage(
        AppConstants.refreshToken
      );

      if (refreshToken) {
        try {
          const refreshResult = await baseQuery(
            { url: "/auth/refresh", method: "POST", body: { refreshToken } },
            api,
            extraOptions
          );

          refreshInProgress = false;

          if (refreshResult.data) {
            const newAccessToken = refreshResult.data.accessToken;
            await setItemToLocalStorage(
              AppConstants.accessToken,
              newAccessToken
            );

            // ✅ Ensure the retry uses the new token
            result = await baseQuery(args, api, extraOptions);
          } else {
            await handleLogout(api);
          }
        } catch (err) {
          console.error("Token refresh failed:", err);
          refreshInProgress = false;
          await handleLogout(api);
        }
      } else {
        refreshInProgress = false;
        await handleLogout(api);
      }
    }
  }

  return result;
};
