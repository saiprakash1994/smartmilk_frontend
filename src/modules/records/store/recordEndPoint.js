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
        getAbsentMemberReport: builder.query({
            query: (body) => {
                const basePath = "reports/absent-members-report";
                const params = body?.params || {};
                const queryString = new URLSearchParams(params).toString();
                return `${basePath}?${queryString}`;
            },
            providesTags: ["absentmemberreports"],
        }),
        getCumulativeReport: builder.query({
            query: (body) => {
                const basePath = "reports/cumulative-report";
                const params = body?.params || {};
                const queryString = new URLSearchParams(params).toString();
                return `${basePath}?${queryString}`;
            },
            providesTags: ["cumulativereports"],
        }),
    }),
});

export const {

    useGetAllRecordsQuery,
    useLazyGetAllRecordsQuery,
    useGetMultipleRecordsQuery,
    useGetMemberCodewiseReportQuery,
    useGetAbsentMemberReportQuery,
    useGetCumulativeReportQuery
} = recordDetails;
