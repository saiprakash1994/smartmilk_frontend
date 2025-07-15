import { DeviceApi } from "./deviceApi";

export const deviceDetails = DeviceApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllDevices: builder.query({
            query: () => `device/getall`,
            providesTags: ['device']
        }),
        getDeviceById: builder.query({
            query: (deviceid) => `device/deviceid/${deviceid}`,
            providesTags: ['device']

        }),
        getDeviceByCode: builder.query({
            query: (dairyCode) => `device/devicecode/${dairyCode}`,
            providesTags: ['device']

        }),

        createDevice: builder.mutation({
            query: (body) => ({
                url: 'device/add',
                method: 'POST',
                body
            }),
            invalidatesTags: ['device']
        }),

        editDevice: builder.mutation({
            query: ({ id, ...body }) => ({

                url: `device/edit/${id}`,
                method: 'PUT',
                body
            }),
            invalidatesTags: ['device']
        }),

        deleteDevice: builder.mutation({
            query: (deviceid) => ({
                url: `device/delete/${deviceid}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['device']
        }),
        addMember: builder.mutation({
            query: (body) => ({
                url: 'device/addMember',
                method: 'POST',
                body
            }),
            invalidatesTags: ['device']
        }),
        editMember: builder.mutation({
            query: (body) => ({
                url: 'device/editMember',
                method: 'PUT',
                body
            }),
            invalidatesTags: ['device']
        }),
        deleteMember: builder.mutation({
            query: (body) => ({
                url: 'device/deleteMember',
                method: 'DELETE',
                body
            }),
            invalidatesTags: ['device']
        }),
    }),
});

export const {
    useGetAllDevicesQuery,
    useGetDeviceByCodeQuery,
    useGetDeviceByIdQuery,
    useCreateDeviceMutation,
    useEditDeviceMutation,
    useDeleteDeviceMutation,
    useAddMemberMutation,
    useEditMemberMutation,
    useDeleteMemberMutation
} = deviceDetails;
