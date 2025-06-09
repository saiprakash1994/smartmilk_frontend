import { Outlet, useNavigate } from "react-router-dom"
import './DashboardLayout'
const DashBoardLayout = () => {
    const navigation = useNavigate();

    return (<>
        <Outlet></Outlet>
    </>)
}

export default DashBoardLayout