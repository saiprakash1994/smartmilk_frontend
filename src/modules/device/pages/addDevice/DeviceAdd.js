import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import Spinner from "react-bootstrap/Spinner";
import './DeviceAdd.scss';
import { FaCheckCircle } from "react-icons/fa";

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
    const [touched, setTouched] = useState({
        dairyCode: false,
        deviceIdSuffix: false,
        email: false,
        oldPassword: false,
        newPassword: false,
        confirmPassword: false,
    });

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

    const validateField = (name, value) => {
        switch (name) {
            case "dairyCode":
                if (!value) return "Please select a dairy code";
                return "";
            case "deviceIdSuffix":
                if (!/^\d{4}$/.test(value)) return "Enter 4 digit number";
                return "";
            case "email":
                if (!value.trim()) return "Email is required.";
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) return "Invalid email";
                return "";
            case "oldPassword":
                if (id && form.newPassword && !value) return "Old password required";
                return "";
            case "newPassword":
                if (!id && (!value || value.length < 6)) return "Min 6 characters for password";
                if (id && form.newPassword && !value) return "New password is required.";
                return "";
            case "confirmPassword":
                if (!id && (!value || value.length < 6)) return "Confirm the new password";
                if (form.newPassword !== value) return "Passwords do not match";
                return "";
            default:
                return "";
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched((prev) => ({ ...prev, [name]: true }));
        setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
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

    return (
        <div className="deviceadd-center fade-in">
            <div className="deviceadd-bg-illustration" aria-hidden="true"></div>
            <div className="w-100 device-add-responsive" style={{ maxWidth: 480 }}>
                <Card className="deviceadd-card modern-card shadow-lg">
                    <Card.Body className="p-4">
                        <div className="mb-4 text-center">
                            <h3 className="deviceadd-title mb-1">{id ? "Update Device" : "Create Device"}</h3>
                            <div className="deviceadd-subtitle">{id ? "Update device details below." : "Fill in the details to add a new device."}</div>
                        </div>
                        {/* Error summary */}
                        {Object.values(errors).some(Boolean) && (
                            <div className="alert alert-danger" role="alert" style={{ background: '#ffe6e6', color: '#b02a37', borderColor: '#dc3545' }}>
                                Please fix the errors below.
                            </div>
                        )}
                        <Form autoComplete="off" onSubmit={submitForm}>
                            <h5 className="mb-3" style={{ color: '#4f8cff', fontWeight: 700 }}>Device Details</h5>
                            <Form.Group className="form-floating mb-3">
                                {(userType === roles.ADMIN && !id) ? (
                                    <Form.Select
                                        value={selectedDairyCode}
                                        onChange={(e) => setSelectedDairyCode(e.target.value)}
                                        disabled={saving || isAllLoading}
                                        id="dairyCode"
                                        name="dairyCode"
                                    >
                                        <option value="">-- Select Dairy Code --</option>
                                        {dairyCodes.map((code) => (
                                            <option key={code} value={code}>{code}</option>
                                        ))}
                                    </Form.Select>
                                ) : (
                                    <Form.Control type="text" value={selectedDairyCode} readOnly id="dairyCode" name="dairyCode" />
                                )}
                                <Form.Label htmlFor="dairyCode">Dairy Code</Form.Label>
                                {errors.dairyCode && <div className="text-danger mt-1">{errors.dairyCode}</div>}
                            </Form.Group>
                            <Form.Group className="form-floating mb-3">
                                <Form.Control
                                    type="text"
                                    name="deviceIdSuffix"
                                    id="deviceIdSuffix"
                                    value={form.deviceIdSuffix}
                                    onChange={e => {
                                        // Only allow numbers
                                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                        setForm(prev => ({ ...prev, deviceIdSuffix: value }));
                                        setErrors(prev => ({ ...prev, deviceIdSuffix: validateField('deviceIdSuffix', value) }));
                                    }}
                                    onBlur={handleBlur}
                                    placeholder="e.g., 0001"
                                    maxLength={4}
                                    disabled={!!id}
                                    isInvalid={!!errors.deviceIdSuffix && touched.deviceIdSuffix}
                                    isValid={!errors.deviceIdSuffix && touched.deviceIdSuffix && /^\d{4}$/.test(form.deviceIdSuffix)}
                                    inputMode="numeric"
                                    pattern="\\d*"
                                />
                                <Form.Label htmlFor="deviceIdSuffix">Device ID (4-digit suffix)</Form.Label>
                                {errors.deviceIdSuffix && <div className="text-danger mt-1">{errors.deviceIdSuffix}</div>}
                            </Form.Group>
                            <Form.Group className="form-floating mb-3">
                                <Form.Select name="status" value={form.status} onChange={handleChange} id="status">
                                    <option value="active">Active</option>
                                    <option value="deactive">Deactive</option>
                                </Form.Select>
                                <Form.Label htmlFor="status">Status</Form.Label>
                            </Form.Group>
                            <Form.Group className="form-floating mb-3">
                                <Form.Control
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Email"
                                    isInvalid={!!errors.email && touched.email}
                                    isValid={!errors.email && touched.email}
                                />
                                <Form.Label htmlFor="email">Email</Form.Label>
                                {errors.email && <div className="text-danger mt-1">{errors.email}</div>}
                            </Form.Group>
                            <h5 className="mb-3 mt-4" style={{ color: '#4f8cff', fontWeight: 700 }}>Set Password</h5>
                            <div className="deviceadd-password-section position-relative mb-3">
                                {id && (
                                    <Form.Group className="form-floating mb-3 position-relative">
                                        <Form.Control
                                            type="password"
                                            name="oldPassword"
                                            id="oldPassword"
                                            value={form.oldPassword}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="Enter old password"
                                            isInvalid={!!errors.oldPassword && touched.oldPassword}
                                            isValid={!errors.oldPassword && touched.oldPassword}
                                        />
                                        <Form.Label htmlFor="oldPassword">Old Password</Form.Label>
                                        {errors.oldPassword && <div className="text-danger mt-1">{errors.oldPassword}</div>}
                                    </Form.Group>
                                )}
                                <Form.Group className="form-floating mb-3 position-relative">
                                    <Form.Control
                                        type="password"
                                        name="newPassword"
                                        id="newPassword"
                                        value={form.newPassword}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Password"
                                        isInvalid={!!errors.newPassword && touched.newPassword}
                                        isValid={!errors.newPassword && touched.newPassword}
                                    />
                                    <Form.Label htmlFor="newPassword">{id ? "New Password" : "Password"}</Form.Label>
                                    {errors.newPassword && <div className="text-danger mt-1">{errors.newPassword}</div>}
                                </Form.Group>
                                <Form.Group className="form-floating mb-0 position-relative">
                                    <Form.Control
                                        type="password"
                                        name="confirmPassword"
                                        id="confirmPassword"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Confirm Password"
                                        isInvalid={!!errors.confirmPassword && touched.confirmPassword}
                                        isValid={!errors.confirmPassword && touched.confirmPassword}
                                    />
                                    <Form.Label htmlFor="confirmPassword">Confirm Password</Form.Label>
                                    {errors.confirmPassword && <div className="text-danger mt-1">{errors.confirmPassword}</div>}
                                </Form.Group>
                            </div>
                            <div className="deviceadd-btn-row">
                                <Button variant="primary" type="submit" disabled={saving} className="px-4">
                                    {saving ? <Spinner size="sm" animation="border" /> : id ? "Update" : "Create"}
                                </Button>
                                <Button variant="outline-secondary" onClick={() => navigate("/device")} disabled={saving} className="px-4">
                                    Cancel
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default DeviceAdd;
