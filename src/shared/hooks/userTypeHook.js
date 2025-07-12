import { useSelector } from "react-redux";

export const UserTypeHook = () => {
    const userInfo = useSelector((state) => state?.userInfoSlice?.userInfo);
    return userInfo?.role || '';
};