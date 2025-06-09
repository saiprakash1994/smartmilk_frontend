import { createSlice } from '@reduxjs/toolkit';

export const userInfoSlice = createSlice({
    name: 'userInfoSlice',
    initialState: {
        userInfo: {

        }
    },
    reducers: {
        adduserInfo: (state, action) => {
            state.userInfo = action.payload;
        },
        clearUserInfo: (state) => {
            state.userInfo = {};
        }
    }
})



export const { adduserInfo, clearUserInfo } = userInfoSlice.actions;

export default userInfoSlice.reducer;