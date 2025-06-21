import './MainLayout.scss'
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AppConstants, getItemFromLocalStorage } from "../../shared/utils/localStorage";
import Header from '../../shared/components/Header/Header';
import SideBar from '../../shared/components/SideBar/SideBar';
import { adduserInfo } from '../authentication/store/userInfoSlice';

const MainLayout = () => {
    const dispatch = useDispatch();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    useEffect(() => {
        const userInfo = getItemFromLocalStorage(AppConstants.userInfo);
        if (userInfo) {
            dispatch(adduserInfo(userInfo))
        }
    }, [])

    // Lock body scroll when sidebar is open on mobile
    useEffect(() => {
        if (window.innerWidth <= 900) {
            document.body.style.overflow = sidebarOpen ? 'hidden' : '';
        }
    }, [sidebarOpen]);

    const handleHamburger = () => setSidebarOpen(true);
    const handleSidebarClose = () => setSidebarOpen(false);
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900;

    // Sidebar expand/collapse handlers for desktop
    const handleSidebarHover = () => { if (!isMobile) setSidebarExpanded(true); };
    const handleSidebarLeave = () => { if (!isMobile) setSidebarExpanded(false); };

    return <>
        <div className="main bg-white h-100">
            <Header onHamburger={handleHamburger} />
            {isMobile && sidebarOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(30, 41, 59, 0.35)',
                        zIndex: 1039
                    }}
                    onClick={handleSidebarClose}
                />
            )}
            <div className={`main-container${sidebarExpanded ? ' sidebar-expanded' : ''}`}>
                <div className={`main-sidebar${sidebarExpanded ? ' sidebar-expanded' : ''}`}>
                    <SideBar
                        sidebarOpen={sidebarOpen}
                        onClose={handleSidebarClose}
                        sidebarExpanded={sidebarExpanded}
                        onSidebarHover={handleSidebarHover}
                        onSidebarLeave={handleSidebarLeave}
                    />
                </div>
                <div className="p-2 w-100 main-placeholder overflow-y"><Outlet /></div>
            </div>
        </div>
    </>
}
export default MainLayout;