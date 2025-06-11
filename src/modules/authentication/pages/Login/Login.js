import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Spinner from "react-bootstrap/Spinner";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "../../store/authenticateEndPoints";
import { adduserInfo } from "../../store/userInfoSlice";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { AppConstants, setItemToLocalStorage } from "../../../../shared/utils/localStorage";
import { roles } from "../../../../shared/utils/appRoles";
import smatrchipLogo from "../../../../assets/smatrchipLogo.png";
import loginImage from "../../../../assets/login-rounded-right.png";
import "./Login.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const Login = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [login, { isLoading }] = useLoginMutation();
    const [loginInfo, setLoginInfo] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLoginInfo((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        const email = loginInfo.email.trim();
        const password = loginInfo.password.trim();

        if (!email || !password) {
            errorToast("Email and password are required");
            return false;
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            errorToast("Please enter a valid email");
            return false;
        }

        return true;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const response = await login({
                email: loginInfo.email.trim(),
                password: loginInfo.password.trim(),
            });

            if (response?.error) {
                errorToast("Invalid credentials. Please try again.");
                return;
            }

            const { message, token, role, dairyName, dairyCode, deviceName, deviceid } = response.data;

            successToast(message);

            const userInfo = {
                token,
                role,
                ...(role === roles.ADMIN || role === roles.DAIRY
                    ? { dairyName, dairyCode }
                    : { deviceName, deviceid, dairyCode }),
            };

            dispatch(adduserInfo(userInfo));
            setItemToLocalStorage(AppConstants.accessToken, token);
            setItemToLocalStorage(AppConstants.userInfo, userInfo);

            setLoginInfo({ email: "", password: "" });
            setTimeout(() => navigate("/"), 500);
        } catch (err) {
            console.error("Login error:", err);
            errorToast("An unexpected error occurred");
        }
    };

    return (
        <section className="login-wrapper">
            <div className="login-card">
                <div className="login-image-section">
                    <img src={loginImage} alt="Login Visual" />
                </div>
                <div className="login-form-section">
                    <div className="text-center mb-4">
                        <img src={smatrchipLogo} alt="SmartChip Logo" className="logo" />
                        <h4 className="text-secondary mt-2">Sign in to your account</h4>
                    </div>

                    <Form onSubmit={handleLogin}>
                        <FloatingLabel controlId="email" label="User Name" className="mb-3">
                            <Form.Control
                                type="email"
                                name="email"
                                placeholder="Enter your email"
                                value={loginInfo.email}
                                onChange={handleChange}
                                autoFocus
                                disabled={isLoading}
                            />
                        </FloatingLabel>

                        <FloatingLabel controlId="password" label="Password" className="mb-3 position-relative">
                            <Form.Control
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Enter your password"
                                value={loginInfo.password}
                                onChange={handleChange}
                                disabled={isLoading}
                                autoComplete="off"
                            />
                            <FontAwesomeIcon
                                icon={showPassword ? faEye : faEyeSlash}
                                className="password-toggle-icon"
                                onClick={() => setShowPassword((prev) => !prev)}
                            />
                        </FloatingLabel>

                        <div className="d-grid my-3">
                            <Button
                                variant="outline-primary"
                                type="submit"
                                className="loginButton"
                                disabled={isLoading}
                            >
                                {isLoading && (
                                    <Spinner animation="border" size="sm" className="me-2" />
                                )}
                                Log in
                            </Button>
                        </div>
                    </Form>
                </div>
            </div>
        </section>
    );
};

export default Login;
