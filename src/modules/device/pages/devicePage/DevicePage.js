import React, { useRef, useState, useEffect } from "react";
import { FaTable, FaPlus, FaSearch } from "react-icons/fa";
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

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);

    const handleDeleteClick = (id) => {
        setSelectedDeviceId(id);
        setShowDeleteModal(true);
    };
    const handleDeleteConfirm = async () => {
        setShowDeleteModal(false);
        if (!selectedDeviceId) return;
        try {
            const res = await deleteDeviceById(selectedDeviceId).unwrap();
            dispatch(deleteDevice(res?.device));
            successToast("Device deleted.");
        } catch (err) {
            console.error("Delete error:", err);
            errorToast("Failed to delete device.");
        }
        setSelectedDeviceId(null);
    };
    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setSelectedDeviceId(null);
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

    // Filtering and pagination
    const filteredDevices = devices.filter(device => {
        const q = search.toLowerCase();
        return (
            device?.deviceid?.toLowerCase().includes(q) ||
            device?.email?.toLowerCase().includes(q)
        );
    });
    const totalPages = Math.ceil(filteredDevices.length / pageSize);
    const paginatedDevices = filteredDevices.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => { setPage(1); }, [search]);

    return (
        <div className="device-page-modern">
            <Card className="device-main-card">
                <Card.Body className="p-0">
                    <Tab.Container id="device-tabs" defaultActiveKey="deviceList">
                        <Row className="g-0">
                            <Col md={3} className="device-sidebar">
                                <Nav variant="pills" className="flex-column device-nav">
                                    <Nav.Item>
                                        <Nav.Link eventKey="deviceList" className="device-nav-link">
                                            <FaTable className="me-2" /> Device List
                                        </Nav.Link>
                                    </Nav.Item>
                                    {/* Future: Add more tabs here */}
                                </Nav>
                            </Col>
                            <Col md={9} className="device-content">
                                <Tab.Content className="device-tab-content">
                                    <Tab.Pane eventKey="deviceList" className="device-tab-pane">
                                        <div className="device-tab-header d-flex align-items-center justify-content-between mb-4">
                                            <div className="d-flex align-items-center gap-3">
                                                <h5 className="mb-0"><FaTable className="me-2" />Device List</h5>
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
                                            <div className="table-responsive">
                                                <Table className="device-table" hover>
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Device Id</th>
                                                            <th>Email</th>
                                                            <th>Status</th>
                                                            <th className="actions-col">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {isLoading ? (
                                                            Array.from({ length: 10 }).map((_, i) => <DairySkeletonRow key={i} />)
                                                        ) : isError ? (
                                                            <tr>
                                                                <td colSpan="5" className="text-danger text-center">Error loading devices</td>
                                                            </tr>
                                                        ) : paginatedDevices.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="5" className="text-center">No devices found</td>
                                                            </tr>
                                                        ) : (
                                                            paginatedDevices?.map((device, index) => (
                                                                <tr key={device?._id} className="device-row fade-in" tabIndex={0}>
                                                                    <td>{(page - 1) * pageSize + index + 1}</td>
                                                                    <td>{device?.deviceid}</td>
                                                                    <td>{device?.email}</td>
                                                                    <td>
                                                                        <span className={`device-status-badge device-status-${(device?.status || '').toLowerCase()}`}>
                                                                            {device?.status ? device.status.charAt(0).toUpperCase() + device.status.slice(1) : 'Unknown'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="actions-col">
                                                                        <Button
                                                                            variant="outline-primary"
                                                                            size="sm"
                                                                            className="me-2"
                                                                            title="Edit"
                                                                            aria-label={`Edit ${device?.deviceid}`}
                                                                            onClick={() => navigate(`edit/${device.deviceid}`)}
                                                                        >
                                                                            Edit
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline-danger"
                                                                            size="sm"
                                                                            title="Delete"
                                                                            aria-label={`Delete ${device?.deviceid}`}
                                                                            onClick={() => handleDeleteClick(device.deviceid)}
                                                                        >
                                                                            Delete
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </Table>
                                            </div>
                                            {totalPages > 1 && (
                                                <div className="d-flex justify-content-end mt-3">
                                                    <Pagination>
                                                        {Array.from({ length: totalPages }).map((_, i) => (
                                                            <Pagination.Item
                                                                key={i}
                                                                active={i + 1 === page}
                                                                onClick={() => setPage(i + 1)}
                                                            >
                                                                {i + 1}
                                                            </Pagination.Item>
                                                        ))}
                                                    </Pagination>
                                                </div>
                                            )}
                                        </div>
                                    </Tab.Pane>
                                </Tab.Content>
                            </Col>
                        </Row>
                    </Tab.Container>
                </Card.Body>
            </Card>
        </div>
    );
};

export default DevicePage;