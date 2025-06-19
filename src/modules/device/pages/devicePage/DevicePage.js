import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
    Card, 
    Button, 
    Table, 
    Badge, 
    Container, 
    Row, 
    Col, 
    Form,
    Spinner,
    Alert
} from "react-bootstrap";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { useDeleteDeviceMutation, useGetAllDevicesQuery, useGetDeviceByCodeQuery } from "../../store/deviceEndPoint";
import { useGetAllDairysQuery } from "../../../dairy/store/dairyEndPoint";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { roles } from "../../../../shared/utils/appRoles";
import { deleteDevice, setDevices } from "../../store/deviceSlice";
import DairySkeletonRow from "../../../../shared/utils/skeleton/DairySkeletonRow";
import { 
    FaPlus, 
    FaEdit, 
    FaTrash, 
    FaSearch, 
    FaDesktop, 
    FaEnvelope, 
    FaCircle,
    FaFilter,
    FaSort,
    FaEye,
    FaCog,
    FaBuilding,
    FaIndustry
} from "react-icons/fa";
import './DevicePage.scss';

const DevicePage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const userType = UserTypeHook();
    const userInfo = useSelector((state) => state?.userInfoSlice?.userInfo);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedDairy, setSelectedDairy] = useState(null);

    const {
        data: allDevices = [],
        isLoading: isAllLoading,
        isError: isAllError
    } = useGetAllDevicesQuery(undefined, { skip: userType !== roles.ADMIN });
    
    const {
        data: devicesByCode = [],
        isLoading: isdevicesByCodeLoading,
        isError: isdevicesByCodeError
    } = useGetDeviceByCodeQuery(userInfo?.dairyCode || '', { skip: userType !== roles.DAIRY });
    
    const {
        data: dairies = [],
        isLoading: isDairiesLoading,
        isError: isDairiesError
    } = useGetAllDairysQuery(undefined, { skip: userType !== roles.ADMIN });
    
    const [deleteDeviceById] = useDeleteDeviceMutation();

    const createDevice = () => navigate('deviceadd');

    const handleDelete = async (deviceid) => {
        if (!window.confirm("Are you sure you want to delete this device?")) return;
        try {
            const res = await deleteDeviceById(deviceid).unwrap();
            dispatch(deleteDevice(res?.device));
            successToast("Device deleted successfully!");
        } catch (err) {
            console.error("Delete error:", err);
            errorToast("Failed to delete device.");
        }
    };

    const devices = userType === roles.ADMIN 
        ? (selectedDairy ? allDevices.filter(device => device.dairyCode === selectedDairy.dairyCode) : allDevices)
        : devicesByCode;
    const isLoading = userType === roles.ADMIN ? isAllLoading : isdevicesByCodeLoading;
    const isError = userType === roles.ADMIN ? isAllError : isdevicesByCodeError;

    // Filter devices based on search and status
    const filteredDevices = devices.filter(device => {
        const matchesSearch = device.deviceid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            device.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            device.dairyCode?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || device.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // For admin: get unique dairy codes from allDevices
    const dairyCodeList = userType === roles.ADMIN ? Array.from(new Set(allDevices.map(d => d.dairyCode))).filter(Boolean) : [];
    // For admin: filter devices by selected dairy code
    const adminFilteredDevices = userType === roles.ADMIN && selectedDairy ? allDevices.filter(device => device.dairyCode === selectedDairy) : [];

    // Use the correct device list for stats
    const statsDevices = userType === roles.ADMIN ? adminFilteredDevices : devices;

    const getStatusBadge = (status) => {
        const statusConfig = {
            'active': { variant: 'success', text: 'Active' },
            'deactive': { variant: 'dark', text: 'Inactive' },
            'maintenance': { variant: 'warning', text: 'Maintenance' },
            'offline': { variant: 'danger', text: 'Offline' }
        };
        
        const config = statusConfig[status] || { variant: 'secondary', text: status };
        return <Badge bg={config.variant}>{config.text}</Badge>;
    };

    const getStatusIcon = (status) => {
        const statusColors = {
            'active': '#28a745',
            'deactive': '#6c757d',
            'maintenance': '#ffc107',
            'offline': '#dc3545'
        };
        return <FaCircle style={{ color: statusColors[status] || '#6c757d', fontSize: '8px' }} />;
    };

    useEffect(() => {
        if (userType === roles.ADMIN && allDevices && !isAllLoading && !isAllError) {
            dispatch(setDevices(allDevices));
        }
    }, [allDevices, isAllLoading, isAllError, userType, dispatch]);

    useEffect(() => {
        if (userType === roles.DAIRY && devicesByCode && !isdevicesByCodeLoading && !isdevicesByCodeError) {
            dispatch(setDevices(devicesByCode));
        }
    }, [devicesByCode, isdevicesByCodeLoading, isdevicesByCodeError, userType, dispatch]);

    return (
        <div className="device-page">
            {userType === roles.ADMIN && !selectedDairy ? (
                <Container fluid className="dairy-selection-container">
                    <div className="dairy-selection-card-modern">
                        <div className="dairy-selection-icon">
                            <FaBuilding size={40} />
                        </div>
                        <h3 className="dairy-selection-title">Select Dairy</h3>
                        <p className="dairy-selection-desc">Choose a dairy to view and manage its devices</p>
                        <Form.Group>
                            <Form.Select
                                value={selectedDairy || ""}
                                onChange={e => setSelectedDairy(e.target.value)}
                                className="dairy-select-modern"
                            >
                                <option value="">-- Select Dairy --</option>
                                {dairyCodeList.map(code => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </div>
                </Container>
            ) : (
                <Container fluid className="device-container">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div className="device-header">
                            <div className="d-flex align-items-center">
                                <div>
                                    <h4 className="device-title">
                                        <FaDesktop className="me-2" />
                                        Device Management
                                        {/* {userType === roles.ADMIN && selectedDairy && (
                                            <span className="selected-dairy-badge ms-2">
                                                - {selectedDairy}
                                            </span>
                                        )} */}
                                    </h4>
                                    <p className="device-subtitle">
                                        {userType === roles.ADMIN 
                                            ? (selectedDairy 
                                                ? `Manage and monitor devices for ${selectedDairy}`
                                                : "Manage and monitor your devices across all dairies"
                                              )
                                            : "Manage and monitor your dairy devices"
                                        }
                                    </p>
                                </div>
                                {userType === roles.ADMIN && selectedDairy && (
                                    <Button 
                                        variant="outline-secondary" 
                                        size="sm" 
                                        className="ms-3"
                                        onClick={() => {
                                            setSelectedDairy("");
                                            setSearchTerm("");
                                            setStatusFilter("all");
                                        }}
                                    >
                                        ← Change Dairy
                                    </Button>
                                )}
                            </div>
                        </div>
                        <Button variant="primary" onClick={createDevice} className="add-device-btn">
                            <FaPlus className="me-2" />
                            Add Device
                        </Button>
                    </div>

                    {/* Stats Cards */}
                    <Row className="g-4 mb-4">
                        <Col lg={4} md={6}>
                            <Card className="stats-card total-devices">
                                <Card.Body className="p-4">
                                    <div className="stats-icon">
                                        <FaDesktop />
                                    </div>
                                    <div className="stats-content">
                                        <h3 className="stats-value">{statsDevices.length}</h3>
                                        <p className="stats-label">Total Devices</p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={4} md={6}>
                            <Card className="stats-card active-devices">
                                <Card.Body className="p-4">
                                    <div className="stats-icon">
                                        <FaCircle style={{ color: '#28a745' }} />
                                    </div>
                                    <div className="stats-content">
                                        <h3 className="stats-value">
                                            {statsDevices.filter(d => d.status === 'active').length}
                                        </h3>
                                        <p className="stats-label">Active Devices</p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={4} md={6}>
                            <Card className="stats-card inactive-devices">
                                <Card.Body className="p-4">
                                    <div className="stats-icon">
                                        <FaCircle style={{ color: '#6c757d' }} />
                                    </div>
                                    <div className="stats-content">
                                        <h3 className="stats-value">
                                            {statsDevices.filter(d => d.status === 'deactive').length}
                                        </h3>
                                        <p className="stats-label">Inactive Devices</p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Filters Section */}
                    <Card className="filters-card mb-4">
                        <Card.Body className="p-4">
                            <div className="filters-header mb-3">
                                <h6 className="filters-title">
                                    <FaFilter className="me-2" />
                                    Filter & Search
                                </h6>
                            </div>
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="filter-label">
                                            <FaSearch className="me-2" />
                                            Search Devices
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Search by device ID, email, or dairy code..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="filter-control"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="filter-label">
                                            <FaSort className="me-2" />
                                            Status Filter
                                        </Form.Label>
                                        <Form.Select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="filter-control"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="active">Active</option>
                                            <option value="deactive">Inactive</option>
                                            <option value="maintenance">Maintenance</option>
                                            <option value="offline">Offline</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <div className="d-flex align-items-end h-100">
                                        <Badge bg="light" text="dark" className="filter-badge">
                                            {filteredDevices.length} of {devices.length} devices
                                        </Badge>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Devices Grid */}
                    <Card className="devices-grid-card">
                        <Card.Header className="grid-header">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="grid-title">
                                    <FaDesktop className="me-2" />
                                    Device List
                                </h5>
                                <div className="grid-actions">
                                    <Badge bg="info" className="device-count-badge">
                                        {(userType === roles.ADMIN ? adminFilteredDevices.length : filteredDevices.length)} Devices
                                    </Badge>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-4">
                            {isLoading ? (
                                <div className="loading-section">
                                    <Spinner animation="border" variant="primary" />
                                    <p>Loading devices...</p>
                                </div>
                            ) : isError ? (
                                <Alert variant="danger" className="m-4">
                                    <FaDesktop className="me-2" />
                                    Error loading devices. Please try again.
                                </Alert>
                            ) : (userType === roles.ADMIN ? adminFilteredDevices.length === 0 : filteredDevices.length === 0) ? (
                                <div className="no-data-section">
                                    <FaDesktop className="no-data-icon" />
                                    <h5>No Devices Found</h5>
                                    <p>No devices match your current filters.</p>
                                    <Button variant="primary" onClick={() => {
                                        setSearchTerm("");
                                        setStatusFilter("all");
                                    }}>
                                        Clear Filters
                                    </Button>
                                </div>
                            ) : (
                                <Row className="g-4">
                                    {(userType === roles.ADMIN ? adminFilteredDevices : filteredDevices).map((device, index) => (
                                        <Col key={device._id} lg={3} md={6} sm={12}>
                                            <Card className="device-card advanced">
                                                <div className="device-card-status-bar">
                                                    <div className="status-indicator">
                                                        {getStatusIcon(device.status)}
                                                    </div>
                                                </div>
                                                
                                                <Card.Body className="p-4">
                                                    <div className="device-card-header">
                                                        <div className="device-icon-container">
                                                            <div className="device-icon">
                                                                <FaDesktop />
                                                            </div>
                                                            <div className="device-info">
                                                                <h6 className="device-name">{device.deviceid}</h6>
                                                                <div className="device-meta">
                                                                    <span className="device-dairy">
                                                                        <FaBuilding className="me-1" />
                                                                        {device.dairyCode || 'N/A'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="device-status-badge">
                                                            {getStatusBadge(device.status)}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="device-card-content">
                                                        <div className="device-details">
                                                            <div className="detail-item">
                                                                <FaEnvelope className="detail-icon" />
                                                                <div className="detail-content">
                                                                    <span className="detail-label">Email</span>
                                                                    <span className="detail-value">{device.email}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="device-card-footer">
                                                        <div className="device-actions">
                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                className="action-btn primary"
                                                                onClick={() => navigate(`edit/${device.deviceid}`)}
                                                                title="Edit Device"
                                                            >
                                                                <FaEdit />
                                                                <span>Edit</span>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-info"
                                                                className="action-btn secondary"
                                                                onClick={() => {
                                                                    // Navigate to settings page with device pre-selected
                                                                    navigate('/settings', { 
                                                                        state: { 
                                                                            selectedDeviceId: device.deviceid,
                                                                            selectedDairyCode: device.dairyCode?.substring(0, 3) || ''
                                                                        }
                                                                    });
                                                                }}
                                                                title="Device Settings"
                                                            >
                                                                <FaCog />
                                                                <span>Settings</span>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-danger"
                                                                className="action-btn danger"
                                                                onClick={() => handleDelete(device.deviceid)}
                                                                title="Delete Device"
                                                            >
                                                                <FaTrash />
                                                                <span>Delete</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            )}
                        </Card.Body>
                    </Card>
                </Container>
            )}
        </div>
    );
};

export default DevicePage;