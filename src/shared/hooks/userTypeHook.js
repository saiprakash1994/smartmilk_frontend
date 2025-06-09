import { useEffect, useState } from "react"
import { useSelector } from "react-redux";

export const UserTypeHook = () => {
    const [type, SetType] = useState('')
    const userInfo = useSelector((state) => state?.userInfoSlice?.userInfo);
    useEffect(() => {
        SetType(userInfo.role)
    }, [userInfo.role])
    return type
}