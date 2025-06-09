import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    devices: [], // all devices
};

const deviceSlice = createSlice({
    name: 'deviceSlice',
    initialState,
    reducers: {
        setDevices: (state, action) => {
            state.devices = action.payload;
        },
        addDevice: (state, action) => {
            state.devices.push(action.payload);
        },
        updateDevice: (state, action) => {
            const updated = action.payload;
            const index = state.devices.findIndex(d => d.deviceid === updated.deviceid);
            if (index !== -1) {
                state.devices[index] = updated;
            }
        },
        deleteDevice: (state, action) => {
            state.devices = state.devices.filter(d => d.deviceid !== action.payload);
        },

    },
});

export const {
    setDevices,
    addDevice,
    updateDevice,
    deleteDevice,

} = deviceSlice.actions;

export default deviceSlice.reducer;
