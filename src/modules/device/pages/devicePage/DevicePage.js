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
    FaBuilding
} from "react-icons/fa";
import './DevicePage.scss';

const DevicePage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const userType = UserTypeHook();
    const userInfo = useSelector((state) => state?.userInfoSlice?.userInfo);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

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

    const devices = userType === roles.ADMIN ? allDevices : devicesByCode;
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
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="DEVICES" pageItems={filteredDevices.length} />
                <Button variant="primary" onClick={createDevice} className="add-device-btn">
                    <FaPlus className="me-2" />
                    Add Device
                </Button>
            </div>

            <Container fluid className="device-container">
                {/* Stats Cards */}
                <Row className="g-4 mb-4">
                    <Col lg={3} md={6}>
                        <Card className="stats-card total-devices">
                            <Card.Body className="p-4">
                                <div className="stats-icon">
                                    <FaDesktop />
                                </div>
                                <div className="stats-content">
                                    <h3 className="stats-value">{devices.length}</h3>
                                    <p className="stats-label">Total Devices</p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={3} md={6}>
                        <Card className="stats-card active-devices">
                            <Card.Body className="p-4">
                                <div className="stats-icon">
                                    <FaCircle style={{ color: '#28a745' }} />
                                </div>
                                <div className="stats-content">
                                    <h3 className="stats-value">
                                        {devices.filter(d => d.status === 'active').length}
                                    </h3>
                                    <p className="stats-label">Active Devices</p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={3} md={6}>
                        <Card className="stats-card inactive-devices">
                            <Card.Body className="p-4">
                                <div className="stats-icon">
                                    <FaCircle style={{ color: '#6c757d' }} />
                                </div>
                                <div className="stats-content">
                                    <h3 className="stats-value">
                                        {devices.filter(d => d.status === 'deactive').length}
                                    </h3>
                                    <p className="stats-label">Inactive Devices</p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={3} md={6}>
                        <Card className="stats-card maintenance-devices">
                            <Card.Body className="p-4">
                                <div className="stats-icon">
                                    <FaCog />
                                </div>
                                <div className="stats-content">
                                    <h3 className="stats-value">
                                        {devices.filter(d => d.status === 'maintenance').length}
                                    </h3>
                                    <p className="stats-label">In Maintenance</p>
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

                {/* Devices Table */}
                <Card className="devices-table-card">
                    <Card.Header className="table-header">
                        <h5 className="table-title">
                            <FaDesktop className="me-2" />
                            Device Management
                        </h5>
                    </Card.Header>
                    <Card.Body className="p-0">
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
                        ) : filteredDevices.length === 0 ? (
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
                            <div className="table-responsive">
                                <Table hover className="devices-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>
                                                <FaDesktop className="me-2" />
                                                Device ID
                                            </th>
                                            <th>
                                                <FaBuilding className="me-2" />
                                                Dairy Code
                                            </th>
                                            <th>
                                                <FaEnvelope className="me-2" />
                                                Email
                                            </th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDevices.map((device, index) => (
                                            <tr key={device._id} className="device-row">
                                                <td className="device-index">{index + 1}</td>
                                                <td className="device-id">
                                                    <strong>{device.deviceid}</strong>
                                                </td>
                                                <td className="device-dairy">
                                                    <Badge bg="info" className="dairy-badge">
                                                        {device.dairyCode || 'N/A'}
                                                    </Badge>
                                                </td>
                                                <td className="device-email">{device.email}</td>
                                                <td className="device-status">
                                                    <div className="status-indicator">
                                                        {getStatusIcon(device.status)}
                                                        {getStatusBadge(device.status)}
                                                    </div>
                                                </td>
                                                <td className="device-actions">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        className="action-btn me-2"
                                                        onClick={() => navigate(`edit/${device.deviceid}`)}
                                                        title="Edit Device"
                                                    >
                                                        <FaEdit />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        className="action-btn"
                                                        onClick={() => handleDelete(device.deviceid)}
                                                        title="Delete Device"
                                                    >
                                                        <FaTrash />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default DevicePage;