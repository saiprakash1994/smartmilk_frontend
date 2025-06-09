import { useLocation, useNavigate } from "react-router-dom";
import './Sidebar.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";
import { useCallback, useEffect, useState } from "react";
import { Admin, Dairy, Device } from "../../utils/appConstants";
import { UserTypeHook } from "../../hooks/userTypeHook";
import { roles } from "../../utils/appRoles";

const SideBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOptions, setSidebarOptions] = useState(Device)
    const userType = UserTypeHook();


    const isActivePath = useCallback((path) => {
        return location.pathname.includes(path) ? 'module-active' : '';
    }, [location.pathname]);
    useEffect(() => {
        if (userType === roles.ADMIN) {
            setSidebarOptions(Admin);
            return;
        }
        if (userType === roles.DAIRY) {
            setSidebarOptions(Dairy);
            return;
        }
        if (userType === roles.DEVICE) {
            setSidebarOptions(Device);
            return;
        }
    }, [userType])
    return (
        <div className="appSidebar text-white h-100">
            <div>
                {sidebarOptions.map(({ title, icon, tooltip }) => (
                    <OverlayTrigger
                        key={title}
                        placement="right"
                        delay={{ show: 250, hide: 400 }}
                        overlay={<Tooltip id={`tooltip-${title}`}>{tooltip}</Tooltip>}
                    >
                        <p
                            className={`module ${isActivePath(title)}`}
                            onClick={() => navigate(`/${title}`)}
                        >
                            <FontAwesomeIcon icon={icon} className="module-appIcon" />
                        </p>
                    </OverlayTrigger>
                ))}
            </div>
            <div>
                <p className="appVersion">V 0.0.1</p>
            </div>
        </div>
    );
};

export default SideBar;
