import React, { useRef, useState, useEffect } from "react";
import { FaTable, FaPlus, FaSearch } from "react-icons/fa";
import { Tab, Nav, Row, Col, Card, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import './DairyPage.scss';
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { useDeleteDairyMutation, useGetAllDairysQuery } from "../../store/dairyEndPoint";
import DairySkeletonRow from "../../../../shared/utils/skeleton/DairySkeletonRow";
import Table from "react-bootstrap/Table";
import Pagination from "react-bootstrap/Pagination";

const DairyPage = () => {
    const navigate = useNavigate();
    const { data: dairies = [], isLoading, isError } = useGetAllDairysQuery();
    const [deleteDairy] = useDeleteDairyMutation();

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const tableRef = useRef(null);

    useEffect(() => { setPage(1); }, [search]);

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
                            <Col md={3} className="dairy-sidebar">
                                <Nav variant="pills" className="flex-column dairy-nav">
                                    <Nav.Item>
                                        <Nav.Link eventKey="dairyList" className="dairy-nav-link">
                                            <FaTable className="me-2" /> Dairy List
                                        </Nav.Link>
                                    </Nav.Item>
                                    {/* Future: Add more tabs here */}
                                </Nav>
                            </Col>
                            <Col md={9} className="dairy-content">
                                <Tab.Content className="dairy-tab-content">
                                    <Tab.Pane eventKey="dairyList" className="dairy-tab-pane">
                                        <div className="dairy-tab-header d-flex align-items-center justify-content-between mb-4">
                                            <div className="d-flex align-items-center gap-3">
                                                <h5 className="mb-0"><FaTable className="me-2" />Dairy List</h5>
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
                                                <FaPlus className="me-2" /> Add Dairy
                                            </Button>
                                        </div>
                                        <div className="dairy-section">
                                            <div className="table-responsive">
                                                <Table className="dairy-table" hover>
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Dairy Code</th>
                                                            <th>Name</th>
                                                            <th>Email</th>
                                                            <th className="actions-col">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {isLoading ? (
                                                            Array.from({ length: 10 }).map((_, i) => <DairySkeletonRow key={i} />)
                                                        ) : isError ? (
                                                            <tr>
                                                                <td colSpan="5" className="text-danger text-center">
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                        <span role="img" aria-label="Error" style={{ fontSize: 32, marginBottom: 8 }}>❌</span>
                                                                        Error loading dairies
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) : paginatedDairies.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="5" className="text-center">
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                        <span role="img" aria-label="No dairies" style={{ fontSize: 32, marginBottom: 8 }}>🧀</span>
                                                                        No dairies found
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            paginatedDairies?.map((dairy, index) => (
                                                                <tr key={dairy?._id} className="dairy-row fade-in dairy-row-hover" tabIndex={0}>
                                                                    <td>{(page - 1) * pageSize + index + 1}</td>
                                                                    <td>{dairy?.dairyCode}</td>
                                                                    <td>{dairy?.dairyName}</td>
                                                                    <td>{dairy?.email}</td>
                                                                    <td>
                                                                        <Button
                                                                            variant="outline-primary"
                                                                            size="sm"
                                                                            className="me-2"
                                                                            title="Edit"
                                                                            aria-label={`Edit ${dairy?.dairyName}`}
                                                                            onClick={() => navigate(`edit/${dairy.dairyCode}`)}
                                                                        >
                                                                            Edit
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline-danger"
                                                                            size="sm"
                                                                            title="Delete"
                                                                            aria-label={`Delete ${dairy?.dairyName}`}
                                                                            onClick={() => handleDelete(dairy.dairyCode)}
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

export default DairyPage;
