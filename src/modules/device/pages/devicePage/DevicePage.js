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
    Alert,
    OverlayTrigger,
    Tooltip
} from "react-bootstrap";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { useDeleteDeviceMutation, useGetAllDevicesQuery, useGetDeviceByCodeQuery } from "../../store/deviceEndPoint";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { roles } from "../../../../shared/utils/appRoles";
import { deleteDevice, setDevices } from "../../store/deviceSlice";
import {
    FaPlus,
    FaEdit,
    FaTrash,
    FaSearch,
    FaDesktop,
    FaEnvelope,
    FaCircle,
    
    FaSort,
    
    FaCog,
    FaBuilding,
    
    FaRegClock,
    FaMapMarkerAlt,
    FaQuestionCircle,
    FaServer,
    FaCheckCircle,
    FaCheck,
    FaTimesCircle,
    FaTimes
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
        data: devicesByCode = [],
        isLoading: isdevicesByCodeLoading,
        isError: isdevicesByCodeError
    } = useGetDeviceByCodeQuery(userInfo?.dairyCode || '', { skip: userType !== roles.DAIRY || !userInfo?.dairyCode });

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

    // Only show devices for DAIRY user
    const devices = devicesByCode;
    const isLoading = isdevicesByCodeLoading;
    const isError = isdevicesByCodeError;

    // Filter devices based on search and status
    const filteredDevices = devices.filter(device => {
        const matchesSearch = device.deviceid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.dairyCode?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || device.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Stats
    const statsDevices = devices;

    const getStatusBadge = (status) => {
        const statusConfig = {
            'active': { variant: 'success', text: 'Active' },
            'deactive': { variant: 'dark', text: 'Inactive' },
            // 'maintenance': { variant: 'warning', text: 'Maintenance' },
            // 'offline': { variant: 'danger', text: 'Offline' }
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
        if (userType === roles.DAIRY && devicesByCode && !isdevicesByCodeLoading && !isdevicesByCodeError) {
            dispatch(setDevices(devicesByCode));
        }
    }, [devicesByCode, isdevicesByCodeLoading, isdevicesByCodeError, userType, dispatch]);

    return (
        <div className="device-page"  >
            <Container fluid className="device-container">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap  device-header-search">
                   
  <div className="device-header">
    {/* <div className="d-flex align-items-center"> */}
      
        <h4 className="device-title" style={{ color: 'whitesmoke', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaDesktop  />
            Device Management
          </span>
          <span className="device-subtitle" style={{ color: 'whitesmoke', opacity: 0.9, fontWeight: 400, fontSize: '1rem', marginLeft: '40px' }}>
            Manage and monitor your dairy devices
          </span>
        </h4>
      
    {/* </div> */}
  </div>

  {/* Filters Section */}
  <div className="d-flex align-items-end gap-3 device-filters-section">
    <Form.Group>
      <Form.Label className="filter-label mb-1" style={{ color: 'whitesmoke', fontSize: '0.85rem', fontWeight: 500 }}>
        <FaSearch className="me-1" />
        Search
      </Form.Label>
      <Form.Control
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="filter-control"
        style={{ background: 'rgba(255,255,255,0.9)', color: '#2b50a1', border: 'none', height: '38px', width: '200px' }}
      />
    </Form.Group>
    <Form.Group>
      <Form.Label className="filter-label mb-1" style={{ color: 'whitesmoke', fontSize: '0.85rem', fontWeight: 500 }}>
        <FaSort className="me-1" />
        Status
      </Form.Label>
      <Form.Select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="filter-control"
        style={{ background: 'rgba(255,255,255,0.9)', color: '#2b50a1', border: 'none', height: '38px', width: '150px' }}
      >
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="deactive">Inactive</option>
        {/* <option value="maintenance">Maintenance</option> */}
        {/* <option value="offline">Offline</option> */}
      </Form.Select>
    </Form.Group>
    </div>

    <Button
        variant="light"
        onClick={createDevice}
        className="add-device-btn"
        // style={{ background: 'whitesmoke', borderRadius:"12px",padding:"5px",color: '#2b50a1', fontSize:'1.21em',fontWeight: 700 }}
    >
        <FaPlus className="me-1" />
        Add Device
    </Button>
    </div>

                {/* Stats Cards */}
                <div className="stats-row justify-content-center" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Card className="stats-card total-devices">
                        <Card.Body >
                            <div className="stats-flex" style={{ display: 'flex', alignItems: 'center' }}>
                                <div className="stats-icon" >
                                    <FaDesktop />
                                </div>
                                <div className="stats-content" style={{ flexGrow: 1, textAlign: 'center' }}>
                                    <h3 className="stats-value">{statsDevices.length}</h3>
                                    <p className="stats-label">Total Devices</p>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                    <Card className="stats-card active-devices">
                        <Card.Body >
                            <div className="stats-flex" style={{ display: 'flex', alignItems: 'center' }}>
                                <div className="stats-icon" >
                                    {/* <FaCircle className="circle-bg" /> */}
                                    <FaCheck className="check-fg" />
                                </div>
                                <div className="stats-content" style={{ flexGrow: 1, textAlign: 'center' }}>
                                    <h3 className="stats-value">{statsDevices.filter(d => d.status === 'active').length}</h3>
                                    <p className="stats-label">Active Devices</p>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                    <Card className="stats-card inactive-devices">
                        <Card.Body >
                            <div className="stats-flex" style={{ display: 'flex', alignItems: 'center' }}>
                                <div className="stats-icon" >
                                    {/* <FaCircle className="circle-bg" /> */}
                                    <FaTimes className="times-fg" />
                                </div>
                                <div className="stats-content" style={{ flexGrow: 1, textAlign: 'center' }}>
                                    <h3 className="stats-value">{statsDevices.filter(d => d.status === 'deactive').length}</h3>
                                    <p className="stats-label">Inactive Devices</p>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </div>

                {/* Devices Grid */}
                <Card className="devices-grid-card" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', border: 'none', borderRadius: 18, boxShadow: '0 8px 32px rgba(43,80,161,0.10)' }}>
                    
                    <Card.Body >
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
                            <div className="no-data-section modern-empty-state">
                                <FaQuestionCircle className="no-data-icon" size={48} />
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
                                {filteredDevices.map((device, index) => (
                                    <Col key={device._id} lg={3} md={6} sm={12}>
                                        <Card className={`device-card advanced modern-hover status-${device.status || 'unknown'}`}>
                                            {/* Enhanced Status Bar */}
                                            <div className={`device-card-status-bar status-${device.status || 'unknown'}`}>
                                                <div className="status-indicator">
                                                    {getStatusIcon(device.status)}
                                                </div>
                                            </div>
                                            <Card.Body className="p-4">
                                                <div className="device-card-header">
                                                    <div className="device-icon-container">
                                                        <div className="device-icon device-image" >
                                                            <FaDesktop size={32} />
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
                                                            <FaEnvelope className="detail-icon" style={{ fontSize:'1.2em',color: '#2b50a1' }} />
                                                            <div className="detail-content">
                                                                {/* <span className="detail-label">Email</span> */}
                                                                <span className="detail-value">{device.email}</span>
                                                            </div>
                                                        </div>
                                                        
                                                    </div>
                                                </div>
                                                <div className="device-card-footer">
                                                    <div className="device-actions btn-group">
                                                        <OverlayTrigger placement="top" overlay={<Tooltip>Edit Device</Tooltip>}>
                                                        
                                                        <div >
                                                            <Button
                                                                size="sm"
                                                                // variant="info"
                                                                style={{
                                                                width: '36px',
                                                                height: '36px',
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '1.2rem',
                                                                padding: 0,
                                                                // marginRight:'30px',
                                                                color: 'whitesmoke',
                                                                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                                                }}
                                                                onClick={() => navigate(`edit/${device.deviceid}`)}
                                                            >
                                                                <FaEdit />
                                                            </Button>
                                                            </div>


                                                        </OverlayTrigger>
                                                        
                                                        <OverlayTrigger placement="top" overlay={<Tooltip>Device Settings</Tooltip>}>
                                                            <div className="gap-4"><Button
                                                                 size="sm"
                                                                 // variant="info"
                                                                 style={{
                                                                 width: '36px',
                                                                 height: '36px',
                                                                 borderRadius: '50%',
                                                                 display: 'flex',
                                                                 alignItems: 'center',
                                                                 justifyContent: 'center',
                                                                 fontSize: '1.2rem',
                                                                 padding: 0,
                                                                //  marginRight:'30px',
                                                                 color: 'whitesmoke',
                                                                 background: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',                                                                }}
                                                                // className="action-btn secondary"
                                                                onClick={() => {
                                                                    navigate('/settings', {
                                                                        state: {
                                                                            selectedDeviceId: device.deviceid,
                                                                            selectedDairyCode: device.dairyCode?.substring(0, 3) || ''
                                                                        }
                                                                    });
                                                                }}
                                                            >
                                                                <FaCog />
                                                            </Button>
                                                            </div>
                                                        </OverlayTrigger>
                                                        <OverlayTrigger placement="top" overlay={<Tooltip>Delete Device</Tooltip>}>
                                                            <div>
                                                            <Button
                                                                style={{
                                                                    width: '36px',
                                                                    height: '36px',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '1.2rem',
                                                                    padding: 0,
                                                                    // marginRight:'30px',
                                                                    color: 'whitesmoke',
                                                                    background: 'linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)',
                                                                }}
                                                                onClick={() => handleDelete(device.deviceid)}
                                                            >
                                                                <FaTrash />
                                                            </Button>
                                                            </div>
                                                        </OverlayTrigger>
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
        </div>
    );
};

export default DevicePage;

<style>
{`
@media (max-width: 768px) {
  .device-header-bar {
    flex-direction: column !important;
    align-items: stretch !important;
    row-gap: 0 !important;
  }
  .device-header {
    width: 100%;
    text-align: center;
    margin-bottom: 12px;
  }
  .device-filters-section {
    width: 100%;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 12px !important;
    margin-bottom: 12px;
  }
  .add-device-btn {
    width: 100%;
    margin-top: 8px;
    display: block;
  }
}
`}
</style>