import { Outlet, useNavigate } from "react-router-dom"
import './DairyLayout'
const DairyLayout = () => {
    const navigation = useNavigate();

    return (<>
        <Outlet></Outlet>
    </>)
}

export default DairyLayout