import { lazy } from 'react';

const MainLayout = lazy(() => import('../modules/mainlayout/MainLayout'))
// Dashboard 
const DashBoardLayout = lazy(() => import('../modules/dashboard/dashboardLayout/DashboardLayout'));
const DashBoardPage = lazy(() => import('../modules/dashboard/pages/DashboardPage/DashBoardPage'));
// Dairy 
const DairyLayout = lazy(() => import('../modules/dairy/dairyLayout/DairyLayout'));
const DairyPage = lazy(() => import('../modules/dairy/pages/dairyPage/DairyPage'));
const DairyAdd = lazy(() => import('../modules/dairy/pages/adddairy/DairyAdd'));

// Device
const DeviceLayout = lazy(() => import('../modules/device/deviceLayout/DeviceLayout'));
const DevicePage = lazy(() => import('../modules/device/pages/devicePage/DevicePage'));
const DeviceAdd = lazy(() => import('../modules/device/pages/addDevice/DeviceAdd'));


// Records
const RecordsLayout = lazy(() => import('../modules/records/recordsLayout/RecordLayout'));
const RecordsPage = lazy(() => import('../modules/records/pages/recordsPage/RecordsPage'));
const MemberRecords = lazy(() => import('../modules/records/pages/memberRecords/MemberRecords'));

// settings
const SettingsLayout = lazy(() => import('../modules/settings/settingsLayout/SettingsLayout'));
const SettingsPage = lazy(() => import('../modules/settings/pages/settingsPage/SettingsPage'));

// uploads
const UploadsLayout = lazy(() => import('../modules/uploads/uploadsLayout/uploadsLayout'));
const UploadsPage = lazy(() => import('../modules/uploads/pages/uploadsPage/UploadsPage'));
const NotFoundPage = lazy(() => import('../shared/components/pageNotFound/NotFoundPage'))
export {
    MainLayout,
    DairyLayout,
    DairyPage,
    DashBoardLayout,
    DashBoardPage,
    DairyAdd,
    DeviceAdd,
    DevicePage,
    DeviceLayout,
    RecordsPage,
    MemberRecords,
    RecordsLayout,
    SettingsLayout,
    SettingsPage,
    UploadsLayout,
    UploadsPage,
    NotFoundPage
}