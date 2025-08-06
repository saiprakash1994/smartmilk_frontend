import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { baseQueryReauth } from '../../../store/baseQueryReauth';

export const UploadApi = createApi({
    reducerPath: 'UploadApi',
    baseQuery: baseQueryReauth,

    tagTypes: ['uploads'],
    keepUnusedDataFor: 300, // Keep data for 5 minutes to reduce refetches
    endpoints: () => ({

    })
});