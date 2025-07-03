import React, { useRef, useState, useEffect } from "react";
import { FaTable, FaPlus, FaSearch, FaEnvelope, FaTabletAlt } from "react-icons/fa";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Tab, Nav, Row, Col, Card, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import './DairyPage.scss';
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { useDeleteDairyMutation, useGetAllDairysQuery } from "../../store/dairyEndPoint";
import DairySkeletonRow from "../../../../shared/utils/skeleton/DairySkeletonRow";
import Table from "react-bootstrap/Table";
import Pagination from "react-bootstrap/Pagination";
import { useGetAllDevicesQuery } from '../../../device/store/deviceEndPoint';

const DairyPage = () => {
    const navigate = useNavigate();
    const { data: dairies = [], isLoading, isError } = useGetAllDairysQuery();
    const [deleteDairy] = useDeleteDairyMutation();
    const { data: allDevices = [] } = useGetAllDevicesQuery();

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    // Responsive page size
    const getResponsivePageSize = () => {
        if (window.innerWidth >= 1200) return 12;
        if (window.innerWidth >= 800) return 8;
        return 4;
    };
    const [pageSize, setPageSize] = useState(getResponsivePageSize());

    const tableRef = useRef(null);

    useEffect(() => { setPage(1); }, [search]);

    useEffect(() => {
        const handleResize = () => {
            setPageSize(getResponsivePageSize());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this dairy?")) return;
        try {
            await deleteDairy(id).unwrap();
            successToast("Dairy deleted.");
        } catch (err) {
            console.error("Delete error:", err);
            errorToast("Failed to delete dairy.");
        }
    };

    // Filtering and pagination
    const filteredDairies = dairies.filter(dairy => {
        const q = search.toLowerCase();
        return (
            dairy?.dairyCode?.toLowerCase().includes(q) ||
            dairy?.dairyName?.toLowerCase().includes(q) ||
            dairy?.email?.toLowerCase().includes(q)
        );
    });
    const totalPages = Math.ceil(filteredDairies.length / pageSize);
    const paginatedDairies = filteredDairies.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="dairy-page-modern">
            <Card className="dairy-main-card">
                <Card.Body className="p-0">
                    <Tab.Container id="dairy-tabs" defaultActiveKey="dairyList">
                        <Row className="g-0">
                            <Col md={12} className="dairy-content">
                                <Tab.Content className="dairy-tab-content">
                                    <Tab.Pane eventKey="dairyList" className="dairy-tab-pane">
                                        <div className="dairy-tab-header d-flex align-items-center justify-content-between mb-4">
                                            <div className="d-flex align-items-center gap-3">
                                                <h5 className="mb-0 "><FaTable className="me-2" />Dairy List</h5>
                                                <Form className="dairy-search-form ms-3">
                                                    <div className="input-group">
                                                        <span className="input-group-text"><FaSearch /></span>
                                                        <Form.Control
                                                            type="text"
                                                            placeholder="Search by code, name, or email..."
                                                            value={search}
                                                            onChange={e => setSearch(e.target.value)}
                                                            aria-label="Search dairies"
                                                        />
                                                    </div>
                                                </Form>
                                            </div>
                                            <Button className="dairy-add-btn" onClick={() => navigate('dairyadd')}>
                                                <FaPlus className="me-2 text-" /> Add Dairy
                                            </Button>
                                        </div>
                                        <div className="dairy-section">
                                            {/* Dairy count */}
                                            <div className="dairy-count mb-2 ms-1" style={{ fontWeight: 500, color: '#2c3e50' }}>
                                                {filteredDairies.length !== dairies.length && search ? (
                                                    <>Showing {filteredDairies.length} of {dairies.length} dairies</>
                                                ) : (
                                                    <>Showing {filteredDairies.length} dairies</>
                                                )}
                                            </div>
                                            <div className="dairy-card-grid">
                                                {isLoading ? (
                                                    Array.from({ length: 10 }).map((_, i) => (
                                                        <div className="dairy-card-item" key={i}>
                                                            <DairySkeletonRow />
                                                        </div>
                                                    ))
                                                ) : isError ? (
                                                    <div className="dairy-empty-state w-100">
                                                        <span role="img" aria-label="Error" style={{ fontSize: 32, marginBottom: 8 }}>❌</span>
                                                        <div>Error loading dairies</div>
                                                    </div>
                                                ) : paginatedDairies.length === 0 ? (
                                                    <div className="dairy-empty-state w-100">
                                                        <span role="img" aria-label="No dairies" style={{ fontSize: 32, marginBottom: 8 }}>🧀</span>
                                                        <div>No dairies found</div>
                                                    </div>
                                                ) : (
                                                    paginatedDairies?.map((dairy, index) => (
                                                        (() => {
                                                            const deviceCount = allDevices.filter(device => device.dairyCode === dairy.dairyCode).length;
                                                            return (
                                                                <div className="dairy-card-item fade-in position-relative" key={dairy?._id} tabIndex={0}>
                                                                    {/* Avatar/Icon and Serial */}
                                                                    <div className="d-flex align-items-center mb-3 w-100">
                                                                        <div className="dairy-card-avatar me-3">
                                                                            <span>{dairy?.dairyName?.[0]?.toUpperCase()}</span>
                                                                        </div>
                                                                        <div className="flex-grow-1">
                                                                            <div className="dairy-card-item-title mb-1 d-flex align-items-center gap-2" title={dairy?.dairyName}>
                                                                                <span style={{ color: '#2c3e50' }} >{dairy?.dairyName}</span>
                                                                            </div>
                                                                            <div className="dairy-card-item-code" title={dairy?.dairyCode}>Code: {dairy?.dairyCode}</div>
                                                                        </div>
                                                                        <div className="dairy-card-serial ms-auto">#{(page - 1) * pageSize + index + 1}</div>
                                                                    </div>
                                                                    <div className="d-flex align-items-center mb-2 dairy-card-item-email" title={dairy?.email}>
                                                                        <FaEnvelope className="me-2 text-secondary" />{dairy?.email}
                                                                    </div>
                                                                    <div className="d-flex align-items-center mb-3 dairy-card-item-devices">
                                                                        <FaTabletAlt className="me-2 text-success" />
                                                                        <span style={{ fontWeight: 600 }}>{deviceCount}</span> Devices
                                                                    </div>
                                                                    <div className="d-flex justify-content-end align-items-center mt-auto dairy-card-item-actions gap-2">
                                                                        <Button
                                                                            variant="outline-primary"
                                                                            size="sm"
                                                                            title="Edit"
                                                                            aria-label={`Edit ${dairy?.dairyName}`}
                                                                            onClick={() => navigate(`edit/${dairy.dairyCode}`)}
                                                                            className="dairy-action-btn"
                                                                        >
                                                                            <FiEdit2 />
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline-danger"
                                                                            size="sm"
                                                                            title="Delete"
                                                                            aria-label={`Delete ${dairy?.dairyName}`}
                                                                            onClick={() => handleDelete(dairy.dairyCode)}
                                                                            className="dairy-action-btn"
                                                                        >
                                                                            <FiTrash2 />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    ))
                                                )}
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

export default DairyPage;
