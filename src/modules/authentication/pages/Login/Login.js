import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "../../store/authenticateEndPoints";
import { adduserInfo } from "../../store/userInfoSlice";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { AppConstants, setItemToLocalStorage } from "../../../../shared/utils/localStorage";
import { roles } from "../../../../shared/utils/appRoles";
import smatrchipLogo from "../../../../assets/smatrchipLogo.png";
import dairyManagementImage from "../../../../assets/dairy-management.svg";
import "./Login.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
    faEye, 
    faEyeSlash, 
    faEnvelope, 
    faLock, 
    faUser,
    faShieldAlt,
    faArrowRight
} from "@fortawesome/free-solid-svg-icons";

const Login = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [login, { isLoading }] = useLoginMutation();
    const [loginInfo, setLoginInfo] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isFormValid, setIsFormValid] = useState(false);

    // Real-time form validation
    useEffect(() => {
        const email = loginInfo.email.trim();
        const password = loginInfo.password.trim();
        
        const newErrors = {};
        
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            newErrors.email = "Please enter a valid email address";
        }
        
        if (password && password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }
        
        setErrors(newErrors);
        setIsFormValid(email && password && Object.keys(newErrors).length === 0);
    }, [loginInfo]);

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

        if (password.length < 6) {
            errorToast("Password must be at least 6 characters");
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

            const { message, token, role, dairyName, dairyCode, deviceName, deviceid } = response.data;

            successToast(message);

            const userInfo = {
                token,
                role,
                ...(role === roles?.ADMIN || role === roles?.DAIRY
                    ? { dairyName, dairyCode }
                    : { deviceName, deviceid, dairyCode }),
            };

            dispatch(adduserInfo(userInfo));
            setItemToLocalStorage(AppConstants?.accessToken, token);
            setItemToLocalStorage(AppConstants?.userInfo, userInfo);

            setLoginInfo({ email: "", password: "" });
            setTimeout(() => navigate("/"), 500);
        } catch (err) {
            console.error("Login error:", err);
            errorToast("An unexpected error occurred");
        }
    };

    return (
        <section className="login-wrapper">
            <div className="login-card shadow-lg border-0">
                <div className="login-image-section d-flex align-items-center justify-content-center">
                    <div className="image-content text-center">
                        <img src={dairyManagementImage} alt="Dairy Management" className="main-image" />
                        <div className="welcome-text">
                            <h3 className="text-primary fw-bold mb-2">SmartMilk Dairy Management</h3>
                            <p className="text-muted">Intelligent dairy operations and monitoring system</p>
                        </div>
                    </div>
                </div>
                <div className="login-form-section">
                    <div className="text-center mb-4">
                        <img src={smatrchipLogo} alt="SmartChip Logo" className="logo mb-3" />
                        <h4 className="fw-bold text-primary mb-2">Sign in to your account</h4>
                        <div className="text-muted small mb-3">Welcome back! Please enter your credentials to continue.</div>
                        <div className="security-badge">
                            <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                            <span className="small">Secure Login</span>
                        </div>
                    </div>
                    
                    <Form onSubmit={handleLogin} className="px-1 px-md-2">
                        <FloatingLabel controlId="email" label="Email Address" className="mb-3">
                            <Form.Control
                                type="email"
                                name="email"
                                placeholder="Enter your email"
                                value={loginInfo?.email}
                                onChange={handleChange}
                                autoFocus
                                disabled={isLoading}
                                className={`py-3 ${errors.email ? 'is-invalid' : ''}`}
                                isInvalid={!!errors.email}
                            />
                            <div className="input-icon">
                                <FontAwesomeIcon icon={faEnvelope} />
                            </div>
                            <Form.Control.Feedback type="invalid">
                                {errors.email}
                            </Form.Control.Feedback>
                        </FloatingLabel>

                        <FloatingLabel controlId="password" label="Password" className="mb-3 position-relative">
                            <Form.Control
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Enter your password"
                                value={loginInfo?.password}
                                onChange={handleChange}
                                disabled={isLoading}
                                autoComplete="off"
                                className={`py-3 ${errors.password ? 'is-invalid' : ''}`}
                                isInvalid={!!errors.password}
                            />
                            <div className="input-icon">
                                <FontAwesomeIcon icon={faLock} />
                            </div>
                            <FontAwesomeIcon
                                icon={showPassword ? faEye : faEyeSlash}
                                className="password-toggle-icon"
                                onClick={() => setShowPassword((prev) => !prev)}
                                title={showPassword ? "Hide password" : "Show password"}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.password}
                            </Form.Control.Feedback>
                        </FloatingLabel>

                        <div className="d-grid mb-3">
                            <Button
                                variant="primary"
                                type="submit"
                                className="loginButton"
                                disabled={isLoading || !isFormValid}
                            >
                                {isLoading ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign in
                                        <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </Form>
                </div>
            </div>
        </section>
    );
};

export default Login;
