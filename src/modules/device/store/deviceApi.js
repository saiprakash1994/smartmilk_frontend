import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryReauth } from "../../../store/baseQueryReauth";

export const DeviceApi = createApi({
    reducerPath: "DeviceApi",
    baseQuery: baseQueryReauth,
    tagTypes: ["device"],
    keepUnusedDataFor: 300,
    endpoints: () => ({}),
});