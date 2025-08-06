import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Spinner from "react-bootstrap/Spinner";
import { useDispatch, useSelector } from "react-redux";
import { useLoginMutation } from "../../store/authenticateEndPoints";
import { adduserInfo } from "../../store/userInfoSlice";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { AppConstants, setItemToLocalStorage } from "../../../../shared/utils/localStorage";
import { roles } from "../../../../shared/utils/appRoles";
import sunimpexLogo from "../../../../assets/sunimpexLogo.jpg";

import loginImage from "../../../../assets/login-rounded-right.png";
import "./Login.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faEnvelope, faLock, faSignInAlt } from "@fortawesome/free-solid-svg-icons";

const Login = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const [login, { isLoading }] = useLoginMutation();
    const [loginInfo, setLoginInfo] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e?.target;
        setLoginInfo((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        const email = loginInfo?.email.trim();
        const password = loginInfo?.password.trim();

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
                email: loginInfo?.email.trim(),
                password: loginInfo?.password.trim(),
            });

            if (response?.error) {
                errorToast("Invalid credentials. Please try again.");
                return;
            }
            console.log(response)
            const { accessToken, refreshToken, role, dairyName, dairyCode, deviceName, deviceid } = response?.data;

            // Simple success message
            let successMessage = "Login successful!";
            if (role === roles?.ADMIN) {
                successMessage = "Welcome back, Admin! 🎉";
            } else if (role === roles?.DAIRY) {
                successMessage = `Welcome to ${dairyName || 'Dairy Management'}! 🐄`;
            } else {
                successMessage = `Welcome to ${deviceName || 'Device Management'}! 📱`;
            }

            successToast(successMessage);

            const userInfo = {
                role,
                ...(role === roles?.ADMIN || role === roles?.DAIRY
                    ? { dairyName, dairyCode }
                    : { deviceName, deviceid, dairyCode }),
            };

            dispatch(adduserInfo(userInfo));
            setItemToLocalStorage(AppConstants?.accessToken, accessToken);
            setItemToLocalStorage(AppConstants?.refreshToken, refreshToken);
            setItemToLocalStorage(AppConstants?.userInfo, userInfo);

            setLoginInfo({ email: "", password: "" });

            // Smooth redirect after success message
            setTimeout(() => navigate("/"), 1500);
        } catch (err) {
            console.error("Login error:", err);
            errorToast("Login failed. Please check your credentials and try again.");
        }
    };

    // Redirect if already logged in
    useEffect(() => {
        if (userInfo && userInfo.token) {
            navigate("/", { replace: true });
        }
    }, [userInfo, navigate]);

    return (
        <div className="modern-login-container" style={{ background: '#2b50a1', minHeight: '100vh' }}>
            <div className="login-background">
                <div className="login-background-overlay"></div>
            </div>

            <div className="login-content">
                <div className="login-card">
                    <div className="login-header">
                        <div className="logo-container">
                            <img src={sunimpexLogo} alt="Sunimpex Logo" className="logo" />
                        </div>
                        <h1 className="welcome-text">Welcome Back</h1>
                        <p className="subtitle">Sign in to your Sun Impex account</p>
                    </div>

                    <Form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <div className="input-wrapper">
                                <div className="input-icon email">
                                    <FontAwesomeIcon icon={faEnvelope} />
                                </div>
                                <FloatingLabel controlId="email" label="Email Address" className="custom-floating-label">
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        placeholder=""
                                        value={loginInfo?.email}
                                        onChange={handleChange}
                                        autoFocus
                                        disabled={isLoading}
                                        className="custom-input"
                                    />
                                </FloatingLabel>
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="input-wrapper">
                                <div className="input-icon password">
                                    <FontAwesomeIcon icon={faLock} />
                                </div>
                                <FloatingLabel controlId="password" label="Password" className="custom-floating-label">
                                    <Form.Control
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder=""
                                        value={loginInfo?.password}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        autoComplete="off"
                                        className="custom-input"
                                    />
                                </FloatingLabel>
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    disabled={isLoading}
                                >
                                    <span className="input-icon eye">
                                        <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
                                    </span>
                                </button>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            type="submit"
                            className="login-button"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Signing In...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                                    Sign In
                                </>
                            )}
                        </Button>
                    </Form>
                </div>
                <div className="login-footer">
                    <p className="footer-text">
                        Secure login powered by Sun Impex
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
