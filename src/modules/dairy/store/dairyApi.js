import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { APIUrl } from '../../../ApiUrl/apiUrl';
import { AppConstants, getItemFromLocalStorage } from '../../../shared/utils/localStorage';

export const DairyApi = createApi({
    reducerPath: 'DairyApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${APIUrl.URL}`,
        prepareHeaders: (headers) => {
            const token = getItemFromLocalStorage(AppConstants.accessToken);
            console.log('Token:', token);
            if (token) {
                headers.set('Authorization', `Bearer ${token}`); // Use Bearer convention unless your backend expects raw
            }
            return headers;
        }
    }),
    tagTypes: ['getAll'],
    endpoints: () => ({})
});
