import { DairyApi } from "./dairyApi";

export const dairyDetails = DairyApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllDairys: builder.query({
            query: () => `dairy`,
            providesTags: ['getAll'],
            refetchOnMountOrArgChange: false, // Prevent refetch on mount if data exists
            refetchOnFocus: false, // Prevent refetch when window regains focus
        }),

        getDairyById: builder.query({
            query: (id) => `dairy/${id}`,
            refetchOnMountOrArgChange: false, // Prevent refetch on mount if data exists
            refetchOnFocus: false, // Prevent refetch when window regains focus
        }),

        createDairy: builder.mutation({
            query: (body) => ({
                url: 'dairy/add',
                method: 'POST',
                body
            }),
            invalidatesTags: ['getAll']
        }),

        editDairy: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `dairy/edit/${id}`,
                method: 'PUT',
                body
            }),
            invalidatesTags: ['getAll']
        }),

        deleteDairy: builder.mutation({
            query: (id) => ({
                url: `dairy/delete/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['getAll']
        }),
    }),
});

export const {
    useGetAllDairysQuery,
    useGetDairyByIdQuery,
    useCreateDairyMutation,
    useEditDairyMutation,
    useDeleteDairyMutation,
} = dairyDetails;
