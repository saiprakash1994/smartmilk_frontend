import { Outlet, useNavigate } from "react-router-dom"
import './DeviceLayout'
const DeviceLayout = () => {
    const navigation = useNavigate();

    return (<>
        <Outlet></Outlet>
    </>)
}

export default DeviceLayout