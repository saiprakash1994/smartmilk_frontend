import { useLocation, useNavigate } from "react-router-dom";
import './Sidebar.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";
import { useCallback, useEffect, useState } from "react";
import { Admin, Dairy, Device } from "../../utils/appConstants";
import { UserTypeHook } from "../../hooks/userTypeHook";
import { roles } from "../../utils/appRoles";

const SideBar = ({ sidebarOpen, onClose, sidebarExpanded, onSidebarHover, onSidebarLeave }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOptions, setSidebarOptions] = useState(Device)
    const userType = UserTypeHook();
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900;
    // Sidebar is expanded if open on mobile, or if parent says expanded on desktop
    const isSidebarExpanded = isMobile ? sidebarOpen : !!sidebarExpanded;

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

    const handleMenuClick = (title) => {
        navigate(`/${title}`);
        if (isMobile && onClose) onClose();
    };

    return (
        <div
            className={`appSidebar${isSidebarExpanded ? ' expanded' : ''} text-white h-100`}
            onMouseEnter={() => !isMobile && onSidebarHover && onSidebarHover()}
            onMouseLeave={() => !isMobile && onSidebarLeave && onSidebarLeave()}
            style={{ zIndex: 1041 }}
        >
            <div style={{ width: '100%' }}>
                {sidebarOptions.map(({ title, icon, tooltip }) => (
                    <OverlayTrigger
                        key={title}
                        placement="right"
                        delay={{ show: 250, hide: 400 }}
                        overlay={<Tooltip id={`tooltip-${title}`}>{tooltip}</Tooltip>}
                    >
                        <div
                            className={`module ${isActivePath(title)}`}
                            onClick={() => handleMenuClick(title)}
                        >
                            <FontAwesomeIcon icon={icon} className="module-appIcon" />
                            <span className="module-label">{title.charAt(0).toUpperCase() + title.slice(1)}</span>
                        </div>
                    </OverlayTrigger>
                ))}
            </div>
            <div style={{ width: '100%' }}>
                <p className="appVersion">V 0.0.1</p>
            </div>
        </div>
    );
};

export default SideBar;
