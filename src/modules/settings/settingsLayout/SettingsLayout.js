import { Outlet, useNavigate } from "react-router-dom"
import './SettingsLayout'
const SettingsLayout = () => {
    const navigation = useNavigate();

    return (<>
        <Outlet></Outlet>
    </>)
}

export default SettingsLayout