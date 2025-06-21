import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import "./DairyAdd.scss";
import {
    useCreateDairyMutation,
    useEditDairyMutation,
    useGetDairyByIdQuery,
} from "../../store/dairyEndPoint";
import { FaCheckCircle, FaEye, FaEyeSlash } from "react-icons/fa";

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
    const [showPassword, setShowPassword] = useState({
        old: false,
        new: false,
        confirm: false,
    });

    const [touched, setTouched] = useState({
        dairyCode: false,
        dairyName: false,
        email: false,
        oldPassword: false,
        newPassword: false,
        confirmPassword: false,
    });

    // SVG icons for password show/hide
    const EyeIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#0d6efd" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C10.879 11.332 9.12 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.133 13.133 0 0 1 1.172 8z" /><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm0 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" /></svg>
    );
    const EyeSlashIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#0d6efd" viewBox="0 0 16 16"><path d="M13.359 11.238C14.06 10.47 14.682 9.642 15.13 9.03a.5.5 0 0 0 0-.06c-.058-.087-.122-.183-.195-.288C13.879 8.668 12.12 7.5 10 7.5c-.29 0-.57.02-.84.06l1.31 1.31A2.5 2.5 0 0 1 13.5 10c0 .29-.02.57-.06.84l1.31 1.31a.5.5 0 0 0 .609-.912zM2.354 1.646a.5.5 0 1 0-.708.708l1.06 1.06C1.94 4.03 1.318 4.858.87 5.47a.5.5 0 0 0 0 .06c.058.087.122.183.195.288C2.121 7.332 3.88 8.5 6 8.5c.29 0 .57-.02.84-.06l-1.31-1.31A2.5 2.5 0 0 1 2.5 6c0-.29.02-.57.06-.84l-1.31-1.31a.5.5 0 0 0-.609.912zM8 10.5a2.5 2.5 0 0 0 2.5-2.5c0-.29-.02-.57-.06-.84l-4.1-4.1A2.5 2.5 0 0 0 8 10.5z" /></svg>
    );

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

    const validateField = (name, value) => {
        switch (name) {
            case "dairyCode":
                if (!/^[A-Z]{3}$/.test(value)) return "Must be 3 uppercase letters (A-Z)";
                return "";
            case "dairyName":
                if (!value.trim()) return "Dairy name is required.";
                return "";
            case "email":
                if (!value.trim()) return "Email is required.";
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) return "Enter a valid email.";
                return "";
            case "oldPassword":
                if (id && form.newPassword && !value) return "Old password is required.";
                return "";
            case "newPassword":
                if (!id && (!value || value.trim() === "")) return "Password is required.";
                if (id && form.newPassword && !value) return "New password is required.";
                return "";
            case "confirmPassword":
                if (!id && (!value || value.trim() === "")) return "Confirm password is required.";
                if (form.newPassword !== value) return "Passwords do not match.";
                return "";
            default:
                return "";
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;
        if (name === "dairyCode") {
            newValue = value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
        }
        setForm((prev) => ({ ...prev, [name]: newValue }));
        setErrors((prev) => ({ ...prev, [name]: validateField(name, newValue) }));
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched((prev) => ({ ...prev, [name]: true }));
        setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    };

    const onSave = async () => {
        // Validate all fields before submit
        const fields = ["dairyCode", "dairyName", "email", "oldPassword", "newPassword", "confirmPassword"];
        const errs = {};
        fields.forEach(field => {
            errs[field] = validateField(field, form[field]);
        });
        setErrors(errs);
        setTouched(fields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
        if (Object.values(errs).some(Boolean)) return;
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
                await refetch();
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
        <div className="dairyadd-center fade-in">
            <div className="dairyadd-bg-illustration" aria-hidden="true"></div>
            <div className="w-100 dairy-add-responsive" style={{ maxWidth: 480 }}>
                <Card className="dairyadd-card modern-card shadow-lg">
                    <Card.Body className="p-4">
                        <div className="mb-4 text-center">
                            <h3 className="dairyadd-title mb-1">{id ? "Edit Dairy" : "Add Dairy"}</h3>
                            <div className="dairyadd-subtitle">{id ? "Update dairy details below." : "Fill in the details to add a new dairy."}</div>
                        </div>
                        {/* Error summary */}
                        {Object.values(errors).some(Boolean) && (
                            <div className="alert alert-danger" role="alert" style={{ background: '#ffe6e6', color: '#b02a37', borderColor: '#dc3545' }}>
                                Please fix the errors below.
                            </div>
                        )}
                        <Form autoComplete="off">
                            <h5 className="mb-3" style={{ color: '#4f8cff', fontWeight: 700 }}>Dairy Details</h5>
                            {!id && (
                                <Form.Group className="form-floating mb-3">
                                    <Form.Control
                                        type="text"
                                        id="dairyCode"
                                        name="dairyCode"
                                        value={form.dairyCode}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="ABC"
                                        disabled={saving}
                                        maxLength={3}
                                        isInvalid={!!errors.dairyCode && touched.dairyCode}
                                        isValid={!errors.dairyCode && touched.dairyCode && /^[A-Z]{3}$/.test(form.dairyCode)}
                                    />
                                    <Form.Label htmlFor="dairyCode">Dairy Code</Form.Label>
                                    <div className="form-text">Must be 3 uppercase letters (A-Z)</div>
                                    <Form.Control.Feedback type="invalid">{errors.dairyCode}</Form.Control.Feedback>
                                </Form.Group>
                            )}
                            <Form.Group className="form-floating mb-3">
                                <Form.Control
                                    type="text"
                                    id="dairyName"
                                    name="dairyName"
                                    value={form.dairyName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Enter Dairy Name"
                                    disabled={saving}
                                    maxLength={40}
                                    isInvalid={!!errors.dairyName && touched.dairyName}
                                    isValid={!errors.dairyName && touched.dairyName}
                                />
                                <Form.Label htmlFor="dairyName">Dairy Name</Form.Label>
                                <Form.Control.Feedback type="invalid">{errors.dairyName}</Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group className="form-floating mb-3">
                                <Form.Control
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Enter Email"
                                    disabled={saving}
                                    isInvalid={!!errors.email && touched.email}
                                    isValid={!errors.email && touched.email}
                                />
                                <Form.Label htmlFor="email">Email</Form.Label>
                                <div className="form-text">We'll never share your email.</div>
                                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                            </Form.Group>
                            <h5 className="mb-3 mt-4" style={{ color: '#4f8cff', fontWeight: 700 }}>Set Password</h5>
                            <div className="dairyadd-password-section position-relative mb-3">
                                {id && (
                                    <Form.Group className="form-floating mb-3 position-relative">
                                        <Form.Control
                                            type={showPassword.old ? "text" : "password"}
                                            id="oldPassword"
                                            name="oldPassword"
                                            value={form.oldPassword}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="Enter Old Password"
                                            disabled={saving}
                                            isInvalid={!!errors.oldPassword && touched.oldPassword}
                                            isValid={!errors.oldPassword && touched.oldPassword}
                                        />
                                        <Form.Label htmlFor="oldPassword">Old Password</Form.Label>
                                    </Form.Group>
                                )}
                                <Form.Group className="form-floating mb-3 position-relative">
                                    <Form.Control
                                        type={showPassword.new ? "text" : "password"}
                                        id="newPassword"
                                        name="newPassword"
                                        value={form.newPassword}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Enter New Password"
                                        disabled={saving}
                                        isInvalid={!!errors.newPassword && touched.newPassword}
                                        isValid={!errors.newPassword && touched.newPassword}
                                    />
                                    <Form.Label htmlFor="newPassword">New Password</Form.Label>
                                </Form.Group>
                                <Form.Group className="form-floating mb-0 position-relative">
                                    <Form.Control
                                        type={showPassword.confirm ? "text" : "password"}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Confirm Password"
                                        disabled={saving}
                                        isInvalid={!!errors.confirmPassword && touched.confirmPassword}
                                        isValid={!errors.confirmPassword && touched.confirmPassword}
                                    />
                                    <Form.Label htmlFor="confirmPassword">Confirm Password</Form.Label>
                                </Form.Group>
                            </div>
                            <div className="dairyadd-btn-row">
                                <Button variant="primary" onClick={onSave} disabled={saving} className="px-4">
                                    {saving ? <Spinner size="sm" animation="border" /> : id ? "Update" : "Create"}
                                </Button>
                                <Button variant="outline-secondary" onClick={() => navigate("/dairy")} disabled={saving} className="px-4">
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

export default DairyAdd;
