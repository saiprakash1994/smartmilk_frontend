import { authApi } from "./authenticateApi";

export const authEndPoints = authApi.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (body) => ({
                url: `auth/login`,
                method: "POST",
                body,
            }),
        }),

        logout: builder.mutation({
            query: (body) => ({
                url: `auth/logout`,
                method: "POST",
                body,
            }),
        }),
    }),
});

export const { useLoginMutation, useLogoutMutation } = authEndPoints;
