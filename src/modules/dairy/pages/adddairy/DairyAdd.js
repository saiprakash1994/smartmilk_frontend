import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { 
    Button, 
    Card, 
    Form, 
    Spinner, 
    Container, 
    Row, 
    Col, 
    Alert,
    Badge
} from "react-bootstrap";
import "./DairyAdd.scss";
import {
    useCreateDairyMutation,
    useEditDairyMutation,
    useGetDairyByIdQuery,
} from "../../store/dairyEndPoint";
import { 
    FaIndustry, 
    FaBuilding, 
    FaEnvelope, 
    FaLock, 
    FaSave, 
    FaTimes, 
    FaArrowLeft,
    FaUserShield,
    FaKey,
    FaCheckCircle
} from "react-icons/fa";

const DairyAdd = () => {
    const navigate = useNavigate();
    const { dairyCode: id } = useParams();

    const {
        data: dairyData,
        isSuccess,
        isLoading: fetching,
        isError,
        refetch
    } = useGetDairyByIdQuery(id, { skip: !id });

    const [createDairy, { isLoading: creating }] = useCreateDairyMutation();
    const [editDairy, { isLoading: updating }] = useEditDairyMutation();

    const [form, setForm] = useState({
        dairyCode: "",
        dairyName: "",
        email: "",
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (id && isSuccess && dairyData) {
            setForm({
                dairyCode: dairyData?.dairyCode || "",
                dairyName: dairyData?.dairyName || "",
                email: dairyData?.email || "",
                oldPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        }
    }, [id, dairyData, isSuccess]);

    useEffect(() => {
        if (id && isError) {
            errorToast("Failed to fetch dairy data.");
        }
    }, [id, isError]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "dairyCode") {
            const upperAlphaOnly = value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
            setForm((prev) => ({
                ...prev,
                [name]: upperAlphaOnly,
            }));
        } else {
            setForm((prev) => ({
                ...prev,
                [name]: value,
            }));
        }

        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const validate = () => {
        const errs = {};

        if (!form.dairyCode && !id) errs.dairyCode = "Dairy code is required.";
        else if (!id && !/^[A-Z]{3}$/.test(form.dairyCode)) errs.dairyCode = "Must be 3 uppercase letters.";

        if (!form.dairyName) errs.dairyName = "Dairy name is required.";

        if (!form.email) errs.email = "Email is required.";
        else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(form.email)) errs.email = "Enter a valid email.";
        }

        if (!id) {
            if (!form.newPassword || form.newPassword.trim() === "")
                errs.newPassword = "Password is required.";
            if (!form.confirmPassword || form.confirmPassword.trim() === "")
                errs.confirmPassword = "Confirm password is required.";
            if (form.newPassword !== form.confirmPassword)
                errs.confirmPassword = "Passwords do not match.";
        }

        if (id && form.newPassword) {
            if (!form.oldPassword) errs.oldPassword = "Old password is required.";
            if (!form.confirmPassword) errs.confirmPassword = "Confirm password is required.";
            if (form.newPassword !== form.confirmPassword)
                errs.confirmPassword = "Passwords do not match.";
        }

        return errs;
    };

    const onSave = async () => {
        const errs = validate();
        setErrors(errs);

        if (Object.keys(errs).length > 0) return;

        try {
            if (id) {
                const payload = {
                    id,
                    dairyName: form.dairyName,
                    email: form.email,
                };

                if (form.newPassword) {
                    payload.password = form.newPassword;
                    payload.oldPassword = form.oldPassword;
                }

                await editDairy({ id, ...payload }).unwrap();
                successToast("Dairy updated successfully.");
                await refetch()
            } else {
                await createDairy({
                    dairyCode: form.dairyCode,
                    dairyName: form.dairyName,
                    email: form.email,
                    password: form.newPassword,
                }).unwrap();
                successToast("Dairy created successfully.");
            }

            navigate("/dairy");
        } catch (err) {
            const message = err?.data?.error || "Failed to save dairy.";
            errorToast(message);
            console.error(err);
        }
    };

    const saving = creating || updating;

    return (
        <div className="dairy-add-page">
            <div className="d-flex justify-content-between pageTitleSpace">
                <div className="d-flex align-items-center">
                    <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        onClick={() => navigate("/dairy")}
                        className="me-3 back-btn"
                    >
                        <FaArrowLeft className="me-2" />
                        Back
                    </Button>
                    <PageTitle name={id ? "Edit Dairy" : "Add New Dairy"} pageItems={0} />
                </div>
                {id && (
                    <Badge bg="info" className="edit-badge">
                        <FaCheckCircle className="me-2" />
                        Edit Mode
                    </Badge>
                )}
            </div>

            <Container fluid className="dairy-add-container">
                <Row className="justify-content-center">
                    <Col lg={8} xl={6}>
                        <Card className="dairy-form-card">
                            <Card.Header className="form-header">
                                <h5 className="form-title">
                                    <FaIndustry className="me-2" />
                                    {id ? "Edit Dairy Information" : "Create New Dairy"}
                                </h5>
                                <p className="form-subtitle">
                                    {id ? "Update dairy details and credentials" : "Fill in the details to create a new dairy"}
                                </p>
                            </Card.Header>
                            <Card.Body className="p-4">
                                {fetching ? (
                                    <div className="loading-section">
                                        <Spinner animation="border" variant="primary" />
                                        <p>Loading dairy information...</p>
                                    </div>
                                ) : isError ? (
                                    <Alert variant="danger" className="mb-4">
                                        <FaIndustry className="me-2" />
                                        Error loading dairy data. Please try again.
                                    </Alert>
                                ) : (
                                    <Form className="dairy-form">
                                        {/* Dairy Information Section */}
                                        <div className="form-section mb-4">
                                            <h6 className="section-title">
                                                <FaBuilding className="me-2" />
                                                Dairy Information
                                            </h6>
                                            <Row className="g-3">
                                                {!id && (
                                                    <Col md={6}>
                                                        <Form.Group>
                                                            <Form.Label className="form-label">
                                                                <FaIndustry className="me-2" />
                                                                Dairy Code
                                                            </Form.Label>
                                                            <Form.Control
                                                                type="text"
                                                                name="dairyCode"
                                                                value={form.dairyCode}
                                                                onChange={handleChange}
                                                                placeholder="Enter 3-letter code"
                                                                disabled={saving}
                                                                maxLength={3}
                                                                className={`form-control ${errors.dairyCode ? 'is-invalid' : ''}`}
                                                            />
                                                            {errors.dairyCode && (
                                                                <div className="invalid-feedback">{errors.dairyCode}</div>
                                                            )}
                                                            <small className="form-text text-muted">
                                                                3 uppercase letters only
                                                            </small>
                                                        </Form.Group>
                                                    </Col>
                                                )}
                                                <Col md={!id ? 6 : 12}>
                                                    <Form.Group>
                                                        <Form.Label className="form-label">
                                                            <FaBuilding className="me-2" />
                                                            Dairy Name
                                                        </Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="dairyName"
                                                            value={form.dairyName}
                                                            onChange={handleChange}
                                                            placeholder="Enter dairy name"
                                                            disabled={saving}
                                                            maxLength={40}
                                                            className={`form-control ${errors.dairyName ? 'is-invalid' : ''}`}
                                                        />
                                                        {errors.dairyName && (
                                                            <div className="invalid-feedback">{errors.dairyName}</div>
                                                        )}
                                                    </Form.Group>
                                                </Col>
                                                <Col md={12}>
                                                    <Form.Group>
                                                        <Form.Label className="form-label">
                                                            <FaEnvelope className="me-2" />
                                                            Email Address
                                                        </Form.Label>
                                                        <Form.Control
                                                            type="email"
                                                            name="email"
                                                            value={form.email}
                                                            onChange={handleChange}
                                                            placeholder="Enter email address"
                                                            disabled={saving}
                                                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                                        />
                                                        {errors.email && (
                                                            <div className="invalid-feedback">{errors.email}</div>
                                                        )}
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                        </div>

                                        {/* Password Section */}
                                        <div className="form-section mb-4">
                                            <h6 className="section-title">
                                                <FaLock className="me-2" />
                                                {id ? "Update Password (Optional)" : "Set Password"}
                                            </h6>
                                            <Row className="g-3">
                                                {id && (
                                                    <Col md={12}>
                                                        <Form.Group>
                                                            <Form.Label className="form-label">
                                                                <FaKey className="me-2" />
                                                                Current Password
                                                            </Form.Label>
                                                            <Form.Control
                                                                type="password"
                                                                name="oldPassword"
                                                                value={form.oldPassword}
                                                                onChange={handleChange}
                                                                placeholder="Enter current password"
                                                                disabled={saving}
                                                                className={`form-control ${errors.oldPassword ? 'is-invalid' : ''}`}
                                                            />
                                                            {errors.oldPassword && (
                                                                <div className="invalid-feedback">{errors.oldPassword}</div>
                                                            )}
                                                        </Form.Group>
                                                    </Col>
                                                )}
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="form-label">
                                                            <FaUserShield className="me-2" />
                                                            {id ? "New Password" : "Password"}
                                                        </Form.Label>
                                                        <Form.Control
                                                            type="password"
                                                            name="newPassword"
                                                            value={form.newPassword}
                                                            onChange={handleChange}
                                                            placeholder={`Enter ${id ? "new" : ""} password`}
                                                            disabled={saving}
                                                            className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
                                                        />
                                                        {errors.newPassword && (
                                                            <div className="invalid-feedback">{errors.newPassword}</div>
                                                        )}
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="form-label">
                                                            <FaCheckCircle className="me-2" />
                                                            Confirm Password
                                                        </Form.Label>
                                                        <Form.Control
                                                            type="password"
                                                            name="confirmPassword"
                                                            value={form.confirmPassword}
                                                            onChange={handleChange}
                                                            placeholder="Confirm password"
                                                            disabled={saving}
                                                            className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                                                        />
                                                        {errors.confirmPassword && (
                                                            <div className="invalid-feedback">{errors.confirmPassword}</div>
                                                        )}
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="form-actions">
                                            <Button 
                                                variant="outline-secondary" 
                                                onClick={() => navigate("/dairy")} 
                                                disabled={saving}
                                                className="cancel-btn"
                                            >
                                                <FaTimes className="me-2" />
                                                Cancel
                                            </Button>
                                            <Button 
                                                variant="primary" 
                                                onClick={onSave} 
                                                disabled={saving}
                                                className="save-btn"
                                            >
                                                {saving ? (
                                                    <>
                                                        <Spinner animation="border" size="sm" className="me-2" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaSave className="me-2" />
                                                        {id ? "Update Dairy" : "Create Dairy"}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </Form>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default DairyAdd;
