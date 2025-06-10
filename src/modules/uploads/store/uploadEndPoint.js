import { UploadApi } from "./uploadApi";

export const uploadDocuments = UploadApi.injectEndpoints({
    endpoints: (builder) => ({
        uploadSnfBuf: builder.mutation({
            query: ({ formData }) => ({
                url: 'upload/snf-buf-table',
                method: 'POST',
                body: formData
            }),
        }),
        uploadSnfCow: builder.mutation({
            query: ({ formData }) => ({
                url: 'upload/snf-cow-table',
                method: 'POST',
                body: formData
            }),
        }),
        uploadFatBuf: builder.mutation({
            query: ({ formData }) => ({
                url: 'upload/fat-buf-table',
                method: 'POST',
                body: formData
            }),
        }),
        uploadFatCow: builder.mutation({
            query: ({ formData }) => ({
                url: 'upload/fat-cow-table',
                method: 'POST',
                body: formData
            }),
        }),
        uploadMember: builder.mutation({
            query: ({ formData }) => ({
                url: 'upload/upload-members',
                method: 'POST',
                body: formData
            }),
        }),
    })
})

export const {
    useUploadSnfBufMutation,
    useUploadFatBufMutation,
    useUploadFatCowMutation,
    useUploadMemberMutation,
    useUploadSnfCowMutation,


} =
    uploadDocuments;