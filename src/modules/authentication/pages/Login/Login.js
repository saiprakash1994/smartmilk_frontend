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

const Login = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [login, { isLoading }] = useLoginMutation();
    const [loginInfo, setLoginInfo] = useState({ email: "", password: "" });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLoginInfo((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const { email, password } = loginInfo;

        if (!email || !password) {
            return errorToast("Email and password are required");
        }

        try {
            const response = await login(loginInfo);
            if (response?.error) {
                return errorToast("Please enter valid credentials");
            }

            if (response?.data) {
                const { message, token, dairyName, role, dairyCode, deviceName, deviceid } = response.data;

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

                setTimeout(() => navigate("/"), 500);
            }
        } catch (err) {
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
                                type="text"
                                name="email"
                                placeholder="Enter your email"
                                value={loginInfo.email}
                                onChange={handleChange}
                            />
                        </FloatingLabel>

                        <FloatingLabel controlId="password" label="Password" className="mb-3">
                            <Form.Control
                                type="password"
                                name="password"
                                placeholder="Enter your password"
                                value={loginInfo.password}
                                onChange={handleChange}
                            />
                        </FloatingLabel>

                        <div className="d-grid my-3">
                            <Button variant="outline-primary" type="submit" disabled={isLoading} className="loginButton">
                                {isLoading && <Spinner animation="border" size="sm" className="me-2" />} Log in
                            </Button>
                        </div>
                    </Form>
                </div>
            </div>
        </section>
    );
};

export default Login;
