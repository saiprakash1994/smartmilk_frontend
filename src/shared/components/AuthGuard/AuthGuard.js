import { useEffect } from "react"
import { getItemFromLocalStorage, clearLocalStorage } from "../../utils/localStorage"
import { useLocation, useNavigate } from "react-router-dom"

export const AuthGuard = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const hasKey = !!getItemFromLocalStorage('accessToken');
        if (!hasKey) {
            clearLocalStorage();
            navigate('/login');
        }
    }, [location]);

    return <>{children}</>;
};