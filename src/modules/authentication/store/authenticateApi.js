import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryReauth } from '../../../store/baseQueryReauth';

export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: baseQueryReauth,
    endpoints: () => ({}),
});
