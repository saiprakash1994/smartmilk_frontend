// store.js
import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../modules/authentication/store/authenticateApi';
import userInfoSlice from '../modules/authentication/store/userInfoSlice';
import deviceSlice from '../modules/device/store/deviceSlice'
import { DairyApi } from '../modules/dairy/store/dairyApi';
import { DeviceApi } from '../modules/device/store/deviceApi';
import { RecordApi } from '../modules/records/store/recordApi';
import { UploadApi } from '../modules/uploads/store/uploadApi';

const store = configureStore({
    reducer: {
        userInfoSlice,
        deviceSlice,
        [authApi.reducerPath]: authApi.reducer,
        [DairyApi.reducerPath]: DairyApi.reducer,
        [DeviceApi.reducerPath]: DeviceApi.reducer,
        [RecordApi.reducerPath]: RecordApi.reducer,
        [UploadApi.reducerPath]: UploadApi.reducer,




    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(authApi.middleware, DairyApi.middleware, DeviceApi.middleware, RecordApi.middleware, UploadApi.middleware),
});

console.log('Initial Store State:', store.getState());
store.subscribe(() => {
    console.log("Redux store updated:", store.getState());
});

export default store;
