import { useNavigate } from "react-router-dom";
import { useState } from "react";
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
import { useDeleteDairyMutation, useGetAllDairysQuery } from "../../store/dairyEndPoint";
import { useGetAllDevicesQuery } from "../../../device/store/deviceEndPoint";
import DairySkeletonRow from "../../../../shared/utils/skeleton/DairySkeletonRow";
import { 
    FaPlus, 
    FaEdit, 
    FaTrash, 
    FaSearch, 
    FaBuilding, 
    FaEnvelope, 
    FaUser,
    FaFilter,
    FaSort,
    FaIndustry,
    FaMapMarkerAlt,
    FaDesktop,
    FaUsers,
    FaExchangeAlt
} from "react-icons/fa";
import './DairyPage.scss';

const DairyPage = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const { data: dairies = [], isLoading, isError } = useGetAllDairysQuery();
    const { data: allDevices = [] } = useGetAllDevicesQuery();
    const [deleteDairy] = useDeleteDairyMutation();
    const [selectedDairy, setSelectedDairy] = useState("");

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this dairy?")) return;
        try {
            await deleteDairy(id).unwrap();
            successToast("Dairy deleted successfully!");
        } catch (err) {
            console.error("Delete error:", err);
            errorToast("Failed to delete dairy.");
        }
    };

    // Calculate device count per dairy
    const getDeviceCountForDairy = (dairyCode) => {
        return allDevices.filter(device => device.dairyCode === dairyCode).length;
    };

    // Calculate total devices across all dairies
    const totalDevices = allDevices.length;

    // Calculate total members (assuming each device has members, we'll count unique member codes)
    const totalMembers = allDevices.reduce((total, device) => {
        return total + (device.members ? device.members.length : 0);
    }, 0);

    // Filter dairies based on search
    const filteredDairies = dairies.filter(dairy => {
        const matchesSearch = dairy.dairyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            dairy.dairyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            dairy.email?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="dairy-page">
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="DAIRY MANAGEMENT" pageItems={filteredDairies.length} />
                <Button variant="primary" onClick={() => navigate('dairyadd')} className="add-dairy-btn">
                    <FaPlus className="me-2" />
                    Add Dairy
                </Button>
            </div>

            <Container fluid className="dairy-container">
                {/* Stats Cards */}
                <Row className="g-4 mb-4">
                    <Col lg={3} md={6}>
                        <Card className="stats-card total-dairies">
                            <Card.Body className="p-4">
                                <div className="stats-icon">
                                    <FaIndustry />
                                </div>
                                <div className="stats-content">
                                    <h3 className="stats-value">{dairies.length}</h3>
                                    <p className="stats-label">Total Dairies</p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={3} md={6}>
                        <Card className="stats-card active-dairies">
                            <Card.Body className="p-4">
                                <div className="stats-icon">
                                    <FaBuilding />
                                </div>
                                <div className="stats-content">
                                    <h3 className="stats-value">
                                        {dairies.filter(d => getDeviceCountForDairy(d.dairyCode) > 0).length}
                                    </h3>
                                    <p className="stats-label">Dairies with Devices</p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={3} md={6}>
                        <Card className="stats-card total-devices">
                            <Card.Body className="p-4">
                                <div className="stats-icon">
                                    <FaDesktop />
                                </div>
                                <div className="stats-content">
                                    <h3 className="stats-value">{totalDevices}</h3>
                                    <p className="stats-label">Total Devices</p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={3} md={6}>
                        <Card className="stats-card total-members">
                            <Card.Body className="p-4">
                                <div className="stats-icon">
                                    <FaUsers />
                                </div>
                                <div className="stats-content">
                                    <h3 className="stats-value">{totalMembers}</h3>
                                    <p className="stats-label">Total Members</p>
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
                                Search & Filter
                            </h6>
                        </div>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="filter-label">
                                        <FaSearch className="me-2" />
                                        Search Dairies
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search by dairy code, name, or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="filter-control"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <div className="d-flex align-items-end h-100">
                                    <Badge bg="light" text="dark" className="filter-badge">
                                        {filteredDairies.length} of {dairies.length} dairies
                                    </Badge>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Dairies Table */}
                <Card className="dairies-table-card">
                    <Card.Header className="table-header">
                        <h5 className="table-title">
                            <FaIndustry className="me-2" />
                            Dairy Management
                        </h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {isLoading ? (
                            <div className="loading-section">
                                <Spinner animation="border" variant="primary" />
                                <p>Loading dairies...</p>
                            </div>
                        ) : isError ? (
                            <Alert variant="danger" className="m-4">
                                <FaIndustry className="me-2" />
                                Error loading dairies. Please try again.
                            </Alert>
                        ) : filteredDairies.length === 0 ? (
                            <div className="no-data-section">
                                <FaIndustry className="no-data-icon" />
                                <h5>No Dairies Found</h5>
                                <p>No dairies match your current search.</p>
                                <Button variant="primary" onClick={() => setSearchTerm("")}>
                                    Clear Search
                                </Button>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table hover className="dairies-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>
                                                <FaBuilding className="me-2" />
                                                Dairy Code
                                            </th>
                                            <th>
                                                <FaIndustry className="me-2" />
                                                Dairy Name
                                            </th>
                                            <th>
                                                <FaEnvelope className="me-2" />
                                                Email
                                            </th>
                                            <th>
                                                <FaUser className="me-2" />
                                                Devices
                                            </th>
                                            <th style={{ width: '150px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDairies.map((dairy, index) => (
                                            <tr key={dairy._id} className="dairy-row">
                                                <td className="dairy-index">{index + 1}</td>
                                                <td className="dairy-code">
                                                    <Badge bg="info" className="code-badge">
                                                        {dairy.dairyCode}
                                                    </Badge>
                                                </td>
                                                <td className="dairy-name">
                                                    <strong>{dairy.dairyName}</strong>
                                                </td>
                                                <td className="dairy-email">{dairy.email}</td>
                                                <td className="dairy-devices">
                                                    <Badge bg="success" className="device-count-badge">
                                                        {getDeviceCountForDairy(dairy.dairyCode)} devices
                                                    </Badge>
                                                </td>
                                                <td className="dairy-actions">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        className="action-btn me-2"
                                                        onClick={() => navigate(`edit/${dairy.dairyCode}`)}
                                                        title="Edit Dairy"
                                                    >
                                                        <FaEdit />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        className="action-btn"
                                                        onClick={() => handleDelete(dairy.dairyCode)}
                                                        title="Delete Dairy"
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

                {/* Selected Dairy Bar */}
                {selectedDairy && (
                    <div className="selected-dairy-bar mb-4 d-flex align-items-center justify-content-between">
                        <div>
                            <Badge bg="primary" className="selected-dairy-badge-lg">
                                <FaBuilding className="me-2" />
                                {selectedDairy}
                            </Badge>
                        </div>
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            className="change-dairy-btn"
                            onClick={() => {
                                setSelectedDairy("");
                                setSearchTerm("");
                            }}
                        >
                            <FaExchangeAlt className="me-1" />
                            Change Dairy
                        </Button>
                    </div>
                )}
            </Container>
        </div>
    );
};

export default DairyPage;
