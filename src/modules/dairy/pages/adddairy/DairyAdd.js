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
        <>
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name={id ? "Edit Dairy" : "Add Dairy"} pageItems={0} />
            </div>

            <div className="usersPage">
                <Card className="h-100">
                    <Card.Body>
                        {fetching ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
                                <Spinner animation="border" />
                            </div>
                        ) : (
                            <Form>
                                {!id && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Dairy Code</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="dairyCode"
                                            value={form.dairyCode}
                                            onChange={handleChange}
                                            placeholder="Enter Dairy Code"
                                            disabled={saving}
                                            maxLength={3}
                                        />
                                        {errors.dairyCode && (
                                            <small className="text-danger">{errors.dairyCode}</small>
                                        )}
                                    </Form.Group>
                                )}

                                <Form.Group className="mb-3">
                                    <Form.Label>Dairy Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="dairyName"
                                        value={form.dairyName}
                                        onChange={handleChange}
                                        placeholder="Enter Dairy Name"
                                        disabled={saving}
                                        maxLength={40}
                                    />
                                    {errors.dairyName && (
                                        <small className="text-danger">{errors.dairyName}</small>
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="Enter Email"
                                        disabled={saving}
                                    />
                                    {errors.email && (
                                        <small className="text-danger">{errors.email}</small>
                                    )}
                                </Form.Group>

                                {id && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Old Password</Form.Label>
                                        <Form.Control
                                            type="password"
                                            name="oldPassword"
                                            value={form.oldPassword}
                                            onChange={handleChange}
                                            placeholder="Enter Old Password"
                                            disabled={saving}
                                        />
                                        {errors.oldPassword && (
                                            <small className="text-danger">{errors.oldPassword}</small>
                                        )}
                                    </Form.Group>
                                )}

                                <Form.Group className="mb-3">
                                    <Form.Label>{id ? "New Password" : "Password"}</Form.Label>
                                    <Form.Control
                                        type="password"
                                        name="newPassword"
                                        value={form.newPassword}
                                        onChange={handleChange}
                                        placeholder={`Enter ${id ? "New" : ""} Password`}
                                        disabled={saving}
                                    />
                                    {errors.newPassword && (
                                        <small className="text-danger">{errors.newPassword}</small>
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label>Confirm Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        name="confirmPassword"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm Password"
                                        disabled={saving}
                                    />
                                    {errors.confirmPassword && (
                                        <small className="text-danger">{errors.confirmPassword}</small>
                                    )}
                                </Form.Group>

                                <div className="d-flex justify-content-end gap-2">
                                    <Button variant="secondary" onClick={() => navigate("/dairy")} disabled={saving}>
                                        Cancel
                                    </Button>
                                    <Button variant="outline-primary" onClick={onSave} disabled={saving}>
                                        {saving ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Saving...
                                            </>
                                        ) : id ? "Update" : "Create"}
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </>
    );
};

export default DairyAdd;
