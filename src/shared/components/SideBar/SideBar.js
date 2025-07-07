import { useLocation, useNavigate } from "react-router-dom";
import './Sidebar.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";
import { useCallback, useEffect, useState } from "react";
import { Dairy, Device } from "../../utils/appConstants";
import { UserTypeHook } from "../../hooks/userTypeHook";
import { roles } from "../../utils/appRoles";
import { useSelector } from "react-redux";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import React from "react";

const SideBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOptions, setSidebarOptions] = useState(Device)
    const userType = UserTypeHook();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);

    const isActivePath = useCallback((path) => {
        return location.pathname.includes(path) ? 'module-active' : '';
    }, [location.pathname]);
    useEffect(() => {
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
            {/* Sidebar Options with Profile Section after Uploads */}
            <div>
                {sidebarOptions.map(({ title, icon, tooltip }, idx) => (
                    <React.Fragment key={title}>
                        <OverlayTrigger
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
                        {/* Insert profile section after uploads icon */}
                        {title === 'uploads' && (
                            <div
                                className={`module${(
                                    (userType === roles.DAIRY && location.pathname === `/dairy/edit/${userInfo?.dairyCode}`) ||
                                    (userType === roles.DEVICE && location.pathname === `/device/edit/${userInfo?.deviceid}`)
                                ) ? ' module-active' : ''}`}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => {
                                    if (userType === roles.DAIRY && userInfo?.dairyCode) {
                                        navigate(`/dairy/edit/${userInfo.dairyCode}`);
                                    } else if (userType === roles.DEVICE && userInfo?.deviceid) {
                                        navigate(`/device/edit/${userInfo.deviceid}`);
                                    }
                                }}
                            >
                                <FontAwesomeIcon icon={faUser} size="lg" className="module-appIcon" />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            <div>
                <p className="appVersion">V 0.0.1</p>
            </div>
        </div>
    );
};

export default SideBar;
