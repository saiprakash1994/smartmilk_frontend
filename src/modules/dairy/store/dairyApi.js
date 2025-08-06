import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryReauth } from '../../../store/baseQueryReauth';

export const DairyApi = createApi({
    reducerPath: 'DairyApi',
    baseQuery: baseQueryReauth,
    tagTypes: ['getAll'],
    keepUnusedDataFor: 300,
    endpoints: () => ({}),
});