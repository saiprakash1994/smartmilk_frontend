import { Outlet, useNavigate } from "react-router-dom"
import './uploadsLayout'
const UploadsLayout = () => {
    const navigation = useNavigate();

    return (<>
        <Outlet></Outlet>
    </>)
}

export default UploadsLayout