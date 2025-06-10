import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import Spinner from "react-bootstrap/Spinner";
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

    const { data: fetchedDevice, isSuccess, refetch } = useGetDeviceByIdQuery(id);

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
            errorToast(err?.data?.message || `Failed to ${id ? "update" : "create"} device`);
        }
    };

    const saving = creating || updating;
    const dairyCodes = Array.from(new Set(allDevices.map(dev => dev.dairyCode)));

    return (
        <>
            <p className="pageTile pageTitleSpace">{id ? "Update Device" : "Create Device"}</p>
            <Card className="mt-4">
                <Card.Body>
                    <Form onSubmit={submitForm}>
                        <Form.Group>
                            <Form.Label>Dairy Code</Form.Label>
                            {(userType === roles.ADMIN && !id) ? (
                                <Form.Select
                                    value={selectedDairyCode}
                                    onChange={(e) => setSelectedDairyCode(e.target.value)}
                                    disabled={saving || isAllLoading}
                                >
                                    <option value="">-- Select Dairy Code --</option>
                                    {dairyCodes.map((code) => (
                                        <option key={code} value={code}>{code}</option>
                                    ))}
                                </Form.Select>
                            ) : (
                                <Form.Control type="text" value={selectedDairyCode} readOnly />
                            )}
                            {errors.dairyCode && <small className="text-danger">{errors.dairyCode}</small>}
                        </Form.Group>

                        <Form.Group className="mt-2">
                            <Form.Label>Device ID (4-digit suffix)</Form.Label>
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
                            />
                            {errors.deviceIdSuffix && <small className="text-danger">{errors.deviceIdSuffix}</small>}
                        </Form.Group>

                        <Form.Group className="mt-2">
                            <Form.Label>Status</Form.Label>
                            <Form.Select name="status" value={form.status} onChange={handleChange}>
                                <option value="active">Active</option>
                                <option value="deactive">Deactive</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mt-2">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="Email"
                            />
                            {errors.email && <small className="text-danger">{errors.email}</small>}
                        </Form.Group>

                        {id && (
                            <Form.Group className="mt-2">
                                <Form.Label>Old Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="oldPassword"
                                    value={form.oldPassword}
                                    onChange={handleChange}
                                    placeholder="Enter old password"
                                />
                                {errors.oldPassword && <small className="text-danger">{errors.oldPassword}</small>}
                            </Form.Group>
                        )}

                        <Form.Group className="mt-2">
                            <Form.Label>{id ? "New Password" : "Password"}</Form.Label>
                            <Form.Control
                                type="password"
                                name="newPassword"
                                value={form.newPassword}
                                onChange={handleChange}
                                placeholder="Password"
                            />
                            {errors.newPassword && <small className="text-danger">{errors.newPassword}</small>}
                        </Form.Group>

                        <Form.Group className="mt-2">
                            <Form.Label>Confirm Password</Form.Label>
                            <Form.Control
                                type="password"
                                name="confirmPassword"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm Password"
                            />
                            {errors.confirmPassword && <small className="text-danger">{errors.confirmPassword}</small>}
                        </Form.Group>

                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <Button variant="secondary" onClick={() => navigate("/device")} disabled={saving}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="outline-primary" disabled={saving}>
                                {saving ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Saving...
                                    </>
                                ) : id ? "Update" : "Create"}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </>
    );
};

export default DeviceAdd;
