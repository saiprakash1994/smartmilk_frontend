import { RecordApi } from "./recordApi";

export const recordDetails = RecordApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllRecords: builder.query({
            query: (body) => {
                const basePath = "reports/datewise-report";
                const params = body?.params || {};
                const queryString = new URLSearchParams(params).toString();
                return `${basePath}?${queryString}`;
            },
            providesTags: ["devicerecords"],
        }),
        getMultipleRecords: builder.query({
            query: (body) => {
                const basePath = "reports/datewise-report/multiple";
                const params = body?.params || {};
                const queryString = new URLSearchParams(params).toString();
                return `${basePath}?${queryString}`;
            },
            providesTags: ["multidevicerecords"],
        }),
        getMemberCodewiseReport: builder.query({
            query: (body) => {
                const basePath = "reports/codewise-report";
                const params = body?.params || {};
                const queryString = new URLSearchParams(params).toString();
                return `${basePath}?${queryString}`;
            },
            providesTags: ["membercodereports"],
        }),

    }),
});

export const {

    useGetAllRecordsQuery,
    useLazyGetAllRecordsQuery,
    useGetMultipleRecordsQuery,
    useGetMemberCodewiseReportQuery
} = recordDetails;
