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
            refetchOnMountOrArgChange: false, // Prevent refetch on mount if data exists
            refetchOnFocus: false, // Prevent refetch when window regains focus
        }),
        getMemberCodewiseReport: builder.query({
            query: (body) => {
                const basePath = "reports/codewise-report";
                const params = body?.params || {};
                const queryString = new URLSearchParams(params).toString();
                return `${basePath}?${queryString}`;
            },
            providesTags: ["membercodereports"],
            refetchOnMountOrArgChange: false, // Prevent refetch on mount if data exists
            refetchOnFocus: false, // Prevent refetch when window regains focus
        }),
        getAbsentMemberReport: builder.query({
            query: (body) => {
                const basePath = "reports/absent-members-report";
                const params = body?.params || {};
                const queryString = new URLSearchParams(params).toString();
                return `${basePath}?${queryString}`;
            },
            providesTags: ["absentmemberreports"],
            refetchOnMountOrArgChange: false, // Prevent refetch on mount if data exists
            refetchOnFocus: false, // Prevent refetch when window regains focus
        }),
        getCumulativeReport: builder.query({
            query: (body) => {
                const basePath = "reports/cumulative-report";
                const params = body?.params || {};
                const queryString = new URLSearchParams(params).toString();
                return `${basePath}?${queryString}`;
            },
            providesTags: ["cumulativereports"],
            refetchOnMountOrArgChange: false, // Prevent refetch on mount if data exists
            refetchOnFocus: false, // Prevent refetch when window regains focus
        }),
        getDatewiseDetailedReport: builder.query({
            query: (body) => {
                const basePath = "reports/datewise-detailed-report";
                const params = body?.params || {};
                const queryString = new URLSearchParams(params).toString();
                return `${basePath}?${queryString}`;
            },
            providesTags: ["datewisedetailedreports"],
            refetchOnMountOrArgChange: false, // Prevent refetch on mount if data exists
            refetchOnFocus: false, // Prevent refetch when window regains focus
        }),
        getDatewiseSummaryReport: builder.query({
            query: (body) => {
                const basePath = "reports/datewise-summary-report";
                const params = body?.params || {};
                const queryString = new URLSearchParams(params).toString();
                return `${basePath}?${queryString}`;
            },
            providesTags: ["datewisesummaryreports"],
            refetchOnMountOrArgChange: false, // Prevent refetch on mount if data exists
            refetchOnFocus: false, // Prevent refetch when window regains focus
        }),
    }),
});

export const {

    useGetAllRecordsQuery,
    useLazyGetAllRecordsQuery,
    useGetMultipleRecordsQuery,
    useGetMemberCodewiseReportQuery,
    useGetAbsentMemberReportQuery,
    useGetCumulativeReportQuery,
    useGetDatewiseDetailedReportQuery,
    useGetDatewiseSummaryReportQuery
} = recordDetails;
