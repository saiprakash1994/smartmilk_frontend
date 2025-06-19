import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { 
    Button, 
    Form, 
    Card, 
    Spinner, 
    Container, 
    Row, 
    Col, 
    Alert,
    Badge
} from "react-bootstrap";
import './DeviceAdd.scss';

import {
    useCreateDeviceMutation,
    useEditDeviceMutation,
    useGetDeviceByIdQuery,
    useGetAllDevicesQuery
} from "../../store/deviceEndPoint";
import { successToast, errorToast } from "../../../../shared/utils/appToaster";
import { addDevice, updateDevice } from "../../store/deviceSlice";
import { roles } from "../../../../shared/utils/appRoles";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { useGetAllDairysQuery } from "../../../dairy/store/dairyEndPoint";
import { 
    FaDesktop, 
    FaBuilding, 
    FaEnvelope, 
    FaLock, 
    FaSave, 
    FaTimes, 
    FaPlus,
    FaEdit,
    FaCircle,
    FaArrowLeft
} from "react-icons/fa";

const DeviceAdd = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { deviceid: id } = useParams();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const userType = UserTypeHook();
    const initialDairyCode = userInfo?.dairyCode;

    const {
        data: allDevices = [],
        isLoading: isAllLoading,
        isError: isAllError
    } = useGetAllDairysQuery(undefined, { skip: userType !== roles.ADMIN });
    const [selectedDairyCode, setSelectedDairyCode] = useState(initialDairyCode || "");

    const [form, setForm] = useState({
        deviceIdSuffix: "",
        email: "",
        status: "active",
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [errors, setErrors] = useState({});

    const { data: fetchedDevice, isSuccess, refetch } = useGetDeviceByIdQuery(id, { skip: !id });

    const [createDevice, { isLoading: creating }] = useCreateDeviceMutation();
    const [editDevice, { isLoading: updating }] = useEditDeviceMutation();

    useEffect(() => {
        if (isSuccess && fetchedDevice) {
            setSelectedDairyCode(fetchedDevice.dairyCode);
            setForm({
                deviceIdSuffix: fetchedDevice.deviceid.slice(3),
                email: fetchedDevice.email,
                status: fetchedDevice.status,
                oldPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        }
    }, [isSuccess, fetchedDevice]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        const errs = {};

        if (!selectedDairyCode) errs.dairyCode = "Please select a dairy code";
        if (!/^\d{4}$/.test(form.deviceIdSuffix)) errs.deviceIdSuffix = "Enter 4 digit number";
        if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email";

        if (id && form.newPassword) {
            if (!form.oldPassword) errs.oldPassword = "Old password required";
            if (!form.confirmPassword) errs.confirmPassword = "Confirm the new password";
            if (form.newPassword !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
        }

        if (!id) {
            if (!form.newPassword || form.newPassword.length < 6)
                errs.newPassword = "Min 6 characters for password";
            if (form.newPassword !== form.confirmPassword)
                errs.confirmPassword = "Passwords do not match";
        }

        return errs;
    };

    const submitForm = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        const fullDeviceId = `${selectedDairyCode}${form.deviceIdSuffix}`;
        const payload = {
            deviceid: fullDeviceId,
            email: form.email,
            status: form.status,
            dairyCode: selectedDairyCode,
        };

        if (form.newPassword) {
            payload.password = form.newPassword;
            if (id) payload.oldPassword = form.oldPassword;
        }

        try {
            if (id) {
                const res = await editDevice({ id, ...payload }).unwrap();
                dispatch(updateDevice(res?.device));
                successToast("Device updated successfully");
                await refetch();
            } else {
                const res = await createDevice(payload).unwrap();
                dispatch(addDevice(res?.device));
                successToast("Device created successfully");
            }
            navigate("/device");
        } catch (err) {
            console.error("RTK Error:", err);
            errorToast(err?.data?.error || `Failed to ${id ? "update" : "create"} device`);
        }
    };

    const saving = creating || updating;
    const dairyCodes = Array.from(new Set(allDevices.map(dev => dev.dairyCode)));

    const getStatusBadge = (status) => {
        const statusConfig = {
            'active': { variant: 'success', text: 'Active' },
            'deactive': { variant: 'dark', text: 'Inactive' }
        };
        const config = statusConfig[status] || { variant: 'secondary', text: status };
        return <Badge bg={config.variant}>{config.text}</Badge>;
    };

    return (
        <div className="device-add-page">
            {/* <div className="d-flex justify-content-between align-items-center pageTitleSpace">
                {id && (
                    <div className="device-preview">
                        <div className="preview-label">Device ID:</div>
                        <div className="preview-value">{selectedDairyCode}{form.deviceIdSuffix}</div>
                    </div>
                )}
            </div> */}

            <Container fluid className="device-add-container">
                <Row className="justify-content-center">
                    <Col lg={8} md={10}>
                        <Card className="device-form-card">
                            <Card.Header className="form-header">
                                <h5 className="form-title">
                                    <FaDesktop className="me-2" />
                                    Device Information
                                </h5>
                            </Card.Header>
                            <Card.Body className="p-4">
                                {isAllError && (
                                    <Alert variant="danger" className="mb-4">
                                        Error loading dairy data. Please refresh the page.
                                    </Alert>
                                )}

                                <Form onSubmit={submitForm}>
                                    <Row className="g-4">
                                        {/* Dairy Code */}
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="form-label-modern">
                                                    <FaBuilding className="me-2" />
                                                    Dairy Code
                                                </Form.Label>
                                                {(userType === roles.ADMIN && !id) ? (
                                                    <Form.Select
                                                        value={selectedDairyCode}
                                                        onChange={(e) => setSelectedDairyCode(e.target.value)}
                                                        disabled={saving || isAllLoading}
                                                        className="form-control-modern"
                                                        isInvalid={!!errors.dairyCode}
                                                    >
                                                        <option value="">-- Select Dairy Code --</option>
                                                        {dairyCodes.map((code) => (
                                                            <option key={code} value={code}>{code}</option>
                                                        ))}
                                                    </Form.Select>
                                                ) : (
                                                    <Form.Control 
                                                        type="text" 
                                                        value={selectedDairyCode} 
                                                        readOnly 
                                                        className="form-control-modern"
                                                    />
                                                )}
                                                {errors.dairyCode && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.dairyCode}
                                                    </Form.Control.Feedback>
                                                )}
                                            </Form.Group>
                                        </Col>

                                        {/* Device ID Suffix */}
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="form-label-modern">
                                                    <FaDesktop className="me-2" />
                                                    Device ID (4-digit suffix)
                                                </Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="deviceIdSuffix"
                                                    value={form.deviceIdSuffix}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (/^\d{0,4}$/.test(value)) {
                                                            handleChange(e);
                                                        }
                                                    }}
                                                    placeholder="e.g., 0001"
                                                    maxLength={4}
                                                    disabled={!!id}
                                                    className="form-control-modern"
                                                    isInvalid={!!errors.deviceIdSuffix}
                                                />
                                                {errors.deviceIdSuffix && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.deviceIdSuffix}
                                                    </Form.Control.Feedback>
                                                )}
                                            </Form.Group>
                                        </Col>

                                        {/* Status */}
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="form-label-modern">
                                                    <FaCircle className="me-2" />
                                                    Status
                                                </Form.Label>
                                                <Form.Select 
                                                    name="status" 
                                                    value={form.status} 
                                                    onChange={handleChange}
                                                    className="form-control-modern"
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="deactive">Inactive</option>
                                                </Form.Select>
                                                <div className="mt-2">
                                                    Current Status: {getStatusBadge(form.status)}
                                                </div>
                                            </Form.Group>
                                        </Col>

                                        {/* Email */}
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="form-label-modern">
                                                    <FaEnvelope className="me-2" />
                                                    Email
                                                </Form.Label>
                                                <Form.Control
                                                    type="email"
                                                    name="email"
                                                    value={form.email}
                                                    onChange={handleChange}
                                                    placeholder="device@example.com"
                                                    className="form-control-modern"
                                                    isInvalid={!!errors.email}
                                                />
                                                {errors.email && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.email}
                                                    </Form.Control.Feedback>
                                                )}
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    {/* Password Section */}
                                    <div className="password-section mt-4">
                                        <h6 className="section-title">
                                            <FaLock className="me-2" />
                                            Password Configuration
                                        </h6>
                                        <Row className="g-4">
                                            {id && (
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="form-label-modern">
                                                            <FaLock className="me-2" />
                                                            Old Password
                                                        </Form.Label>
                                                        <Form.Control
                                                            type="password"
                                                            name="oldPassword"
                                                            value={form.oldPassword}
                                                            onChange={handleChange}
                                                            placeholder="Enter old password"
                                                            className="form-control-modern"
                                                            isInvalid={!!errors.oldPassword}
                                                        />
                                                        {errors.oldPassword && (
                                                            <Form.Control.Feedback type="invalid">
                                                                {errors.oldPassword}
                                                            </Form.Control.Feedback>
                                                        )}
                                                    </Form.Group>
                                                </Col>
                                            )}

                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label className="form-label-modern">
                                                        <FaLock className="me-2" />
                                                        {id ? "New Password" : "Password"}
                                                    </Form.Label>
                                                    <Form.Control
                                                        type="password"
                                                        name="newPassword"
                                                        value={form.newPassword}
                                                        onChange={handleChange}
                                                        placeholder="Enter password"
                                                        className="form-control-modern"
                                                        isInvalid={!!errors.newPassword}
                                                    />
                                                    {errors.newPassword && (
                                                        <Form.Control.Feedback type="invalid">
                                                            {errors.newPassword}
                                                        </Form.Control.Feedback>
                                                    )}
                                                </Form.Group>
                                            </Col>

                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label className="form-label-modern">
                                                        <FaLock className="me-2" />
                                                        Confirm Password
                                                    </Form.Label>
                                                    <Form.Control
                                                        type="password"
                                                        name="confirmPassword"
                                                        value={form.confirmPassword}
                                                        onChange={handleChange}
                                                        placeholder="Confirm password"
                                                        className="form-control-modern"
                                                        isInvalid={!!errors.confirmPassword}
                                                    />
                                                    {errors.confirmPassword && (
                                                        <Form.Control.Feedback type="invalid">
                                                            {errors.confirmPassword}
                                                        </Form.Control.Feedback>
                                                    )}
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="action-buttons mt-5">
                                        <div className="d-flex justify-content-end gap-3">
                                            <Button 
                                                variant="outline-secondary" 
                                                onClick={() => navigate("/device")} 
                                                disabled={saving}
                                                className="action-btn"
                                            >
                                                <FaTimes className="me-2" />
                                                Cancel
                                            </Button>
                                            <Button 
                                                type="submit" 
                                                variant="primary" 
                                                disabled={saving}
                                                className="action-btn save-btn"
                                            >
                                                {saving ? (
                                                    <>
                                                        <Spinner animation="border" size="sm" className="me-2" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaSave className="me-2" />
                                                        {id ? "Update Device" : "Create Device"}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default DeviceAdd;
