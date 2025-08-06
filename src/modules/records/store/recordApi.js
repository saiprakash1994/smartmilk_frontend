import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryReauth } from '../../../store/baseQueryReauth';

export const RecordApi = createApi({
    reducerPath: 'RecordApi',
    baseQuery: baseQueryReauth,
    tagTypes: [
        "devicerecords",
        "multidevicerecords",
        "membercodereports",
        "absentmemberreports",
        "cumulativereports",
        "datewisedetailedreports",
        "datewisesummaryreports"
    ],
    endpoints: () => ({}),
});
