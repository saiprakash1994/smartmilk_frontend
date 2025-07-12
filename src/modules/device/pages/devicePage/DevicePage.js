import React, { useRef, useState, useEffect, useMemo } from "react";
import { FaTable, FaPlus, FaSearch, FaTabletAlt, FaEnvelope } from "react-icons/fa";
import { Tab, Nav, Row, Col, Card, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import './DevicePage.scss';
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { useDeleteDeviceMutation, useGetAllDevicesQuery, useGetDeviceByCodeQuery } from "../../store/deviceEndPoint";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { roles } from "../../../../shared/utils/appRoles";
import { deleteDevice, setDevices } from "../../store/deviceSlice";
import DairySkeletonRow from "../../../../shared/utils/skeleton/DairySkeletonRow";
import Table from "react-bootstrap/Table";
import Pagination from "react-bootstrap/Pagination";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useGetAllDairysQuery } from '../../../dairy/store/dairyEndPoint';

const DevicePage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const userType = UserTypeHook();
    const userInfo = useSelector((state) => state?.userInfoSlice?.userInfo);
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
    const { data: dairies = [] } = useGetAllDairysQuery(undefined, { skip: userType !== roles.ADMIN });
    const [selectedDairyCode, setSelectedDairyCode] = useState("");

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deviceIdToDelete, setDeviceIdToDelete] = useState(null);

    const getResponsivePageSize = () => {
        if (window.innerWidth >= 1200) return 12;
        if (window.innerWidth >= 800) return 8;
        return 4;
    };

    const [pageSize, setPageSize] = useState(getResponsivePageSize());


    const handleDeleteClick = (id) => {
        setDeviceIdToDelete(id);
        setShowDeleteModal(true);
    };
    const handleDeleteConfirm = async () => {
        setShowDeleteModal(false);
        if (!deviceIdToDelete) return;
        try {
            const res = await deleteDeviceById(deviceIdToDelete).unwrap();
            dispatch(deleteDevice(res?.device));
            successToast("Device deleted.");
        } catch (err) {
            console.error("Delete error:", err);
            errorToast("Failed to delete device.");
        }
        setDeviceIdToDelete(null);
    };
    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setDeviceIdToDelete(null);
    };

    const devices = userType === roles.ADMIN ? allDevices : devicesByCode;
    const isLoading = userType === roles.ADMIN ? isAllLoading : isdevicesByCodeLoading;
    const isError = userType === roles.ADMIN ? isAllError : isdevicesByCodeError;

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

    // Filtered devices for card grid (only the selected device)
    const filteredDevices = useMemo(() => {
        const q = search.toLowerCase();
        return devices.filter(device => {
            const matchesSearch = device?.deviceid?.toLowerCase().includes(q) || device?.email?.toLowerCase().includes(q);
            const matchesDairy = !selectedDairyCode || device?.dairyCode === selectedDairyCode;
            return matchesSearch && matchesDairy;
        });
    }, [devices, search, selectedDairyCode]);
    const totalPages = Math.ceil(filteredDevices.length / pageSize);
    const paginatedDevices = filteredDevices.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => { setPage(1); }, [search]);

    // Responsive page size


    useEffect(() => {
        const handleResize = () => {
            const newSize = getResponsivePageSize();
            setPageSize(prev => {
                if (prev !== newSize) setPage(1);
                return newSize;
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="device-page-modern">
            <Card className="device-main-card">
                <Card.Body className="p-0">
                    {/* Admin Dairy Select Only */}
                    {userType === roles.ADMIN && (
                        <div className="dairy-select-bar p-3 pb-0">
                            <Form.Group className="mb-3" style={{ maxWidth: 320 }}>
                                <Form.Label className="form-label-modern">Select Dairy</Form.Label>
                                <Form.Select
                                    value={selectedDairyCode}
                                    onChange={e => { setSelectedDairyCode(e.target.value); setPage(1); }}
                                    className="form-select-modern"
                                >
                                    <option value="">-- Select Dairy --</option>
                                    {dairies.map(dairy => (
                                        <option key={dairy.dairyCode} value={dairy.dairyCode}>{dairy.dairyName} ({dairy.dairyCode})</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </div>
                    )}
                    {/* Only show device grid if dairy is selected (for admin) or for dairy user */}
                    {((userType === roles.ADMIN && selectedDairyCode) || userType !== roles.ADMIN) ? (
                        <Tab.Container id="device-tabs" defaultActiveKey="deviceList">
                            <Row className="g-0">
                                <Col md={12} className="device-content">
                                    <Tab.Content className="device-tab-content">
                                        <Tab.Pane eventKey="deviceList" className="device-tab-pane">
                                            <div className="device-tab-header d-flex align-items-center justify-content-between mb-4">
                                                <div className="d-flex align-items-center gap-3">
                                                    <h5 className="mb-0"><FaTabletAlt className="me-2" />Device List</h5>
                                                    <Form className="device-search-form ms-3">
                                                        <div className="input-group">
                                                            <span className="input-group-text"><FaSearch /></span>
                                                            <Form.Control
                                                                type="text"
                                                                placeholder="Search by device id or email..."
                                                                value={search}
                                                                onChange={e => setSearch(e.target.value)}
                                                                aria-label="Search devices"
                                                            />
                                                        </div>
                                                    </Form>
                                                </div>
                                                <Button className="device-add-btn" onClick={() => navigate('deviceadd')}>
                                                    <FaPlus className="me-2" /> Add Device
                                                </Button>
                                            </div>
                                            <div className="device-section">
                                                {/* Device count */}
                                                <div className="device-count mb-2 ms-1" style={{ fontWeight: 500, color: '#2c3e50' }}>
                                                    {filteredDevices.length !== devices.length && search ? (
                                                        <>Showing {filteredDevices.length} of {devices.length} devices</>
                                                    ) : (
                                                        <>Showing {filteredDevices.length} devices</>
                                                    )}
                                                </div>
                                                <div className="device-card-grid">
                                                    {isLoading ? (
                                                        Array.from({ length: pageSize }).map((_, i) => (
                                                            <div className="device-card-item" key={i}>
                                                                <DairySkeletonRow />
                                                            </div>
                                                        ))
                                                    ) : paginatedDevices.length === 0 ? (
                                                        <div className="device-empty-state w-100">
                                                            <span role="img" aria-label="No devices" style={{ fontSize: 32, marginBottom: 8 }}>📱</span>
                                                            <div>No devices found</div>
                                                        </div>
                                                    ) : (
                                                        paginatedDevices?.map((device, index) => {
                                                            const status = device?.status ? device.status.charAt(0).toUpperCase() + device.status.slice(1) : 'Unknown';
                                                            let statusColor = '#b0b7c3';
                                                            if (device?.status?.toLowerCase() === 'active') statusColor = '#27ae60';
                                                            else if (device?.status?.toLowerCase() === 'inactive') statusColor = '#e74c3c';
                                                            else if (device?.status?.toLowerCase() === 'pending') statusColor = '#f1c40f';
                                                            return (
                                                                <div className="device-card-item fade-in position-relative" key={device?._id} tabIndex={0}>
                                                                    <div className="d-flex align-items-center justify-content-between mb-2 w-100">
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="device-card-avatar me-3">
                                                                                <span>{device?.deviceid?.[0]?.toUpperCase()}</span>
                                                                            </div>
                                                                            <div>
                                                                                <div className="device-card-item-title mb-0" title={device?.deviceid}>
                                                                                    {device?.deviceid}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="device-card-serial">#{(page - 1) * pageSize + index + 1}</div>
                                                                    </div>
                                                                    <div className="device-card-item-email mb-2" title={device?.email}>
                                                                        {device?.email}
                                                                    </div>
                                                                    <div className="device-card-status mb-3">
                                                                        <span className="device-status-badge" style={{ background: statusColor, color: '#fff', padding: '4px 12px', borderRadius: '12px', fontWeight: 600, fontSize: '0.98rem' }}>{status}</span>
                                                                    </div>
                                                                    <div className="d-flex justify-content-end align-items-center mt-auto device-card-item-actions gap-2">
                                                                        <Button
                                                                            variant="outline-primary"
                                                                            size="sm"
                                                                            title="Edit"
                                                                            aria-label={`Edit ${device?.deviceid}`}
                                                                            onClick={() => navigate(`edit/${device.deviceid}`)}
                                                                            className="device-action-btn"
                                                                        >
                                                                            <FiEdit2 />
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline-danger"
                                                                            size="sm"
                                                                            title="Delete"
                                                                            aria-label={`Delete ${device?.deviceid}`}
                                                                            onClick={() => handleDeleteClick(device.deviceid)}
                                                                            className="device-action-btn"
                                                                        >
                                                                            <FiTrash2 />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                                {totalPages > 1 && (
                                                    <div className="d-flex justify-content-between align-items-center mt-3">
                                                        <div className="pagination-summary ms-2" style={{ fontWeight: 500, color: '#2c3e50', fontSize: '0.98rem' }}>
                                                            Page {page} of {totalPages}
                                                        </div>
                                                        <Pagination className="mb-0">
                                                            <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
                                                            <Pagination.Prev onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
                                                            {Array.from({ length: totalPages }).map((_, i) => (
                                                                <Pagination.Item
                                                                    key={i}
                                                                    active={i + 1 === page}
                                                                    onClick={() => setPage(i + 1)}
                                                                >
                                                                    {i + 1}
                                                                </Pagination.Item>
                                                            ))}
                                                            <Pagination.Next onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
                                                            <Pagination.Last onClick={() => setPage(totalPages)} disabled={page === totalPages} />
                                                        </Pagination>
                                                    </div>
                                                )}
                                            </div>
                                        </Tab.Pane>
                                    </Tab.Content>
                                </Col>
                            </Row>
                        </Tab.Container>
                    ) : userType === roles.ADMIN && !selectedDairyCode ? (
                        <div className="text-center py-5 text-secondary">Please select a dairy to view devices.</div>
                    ) : null}
                </Card.Body>
            </Card>
        </div>
    );
};

export default DevicePage;