import { authApi } from "./authenticateApi";


export const authEndPoints = authApi.injectEndpoints({
    endpoints: (builder) => ({


        login: builder.mutation({
            query: (body) => ({
                url: `auth/login`,
                method: 'POST',
                body: body
            }),
        }),

    })
})

export const {
    useLoginMutation
} = authEndPoints;