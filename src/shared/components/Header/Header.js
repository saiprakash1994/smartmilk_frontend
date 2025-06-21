import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './Header.scss';
import { faSignOut, faBars } from '@fortawesome/free-solid-svg-icons';
import { ButtonGroup, Dropdown } from 'react-bootstrap';
import smatrchipLogo from '../../../assets/smatrchipLogo.png';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { clearUserInfo } from '../../../modules/authentication/store/userInfoSlice';
import { clearLocalStorage } from '../../utils/localStorage';
import { useNavigate, Link } from 'react-router-dom';

const Header = ({ onHamburger }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const userInfo = useSelector((state) => state?.userInfoSlice?.userInfo)
    useEffect(() => {
        // console.log('userInfo', userInfo)
    }, [userInfo])
    const displayLabel = userInfo?.dairyName || userInfo?.deviceName || "User";

    return (
        <div className="mainHeader text-white">
            <div className="h-100 appNav d-flex justify-content-between w-100">
                <div className="d-flex appbrand align-items-center">
                    {/* Hamburger for mobile */}
                    <button
                        className="sidebar-hamburger sidebar-hamburger-mobile me-2"
                        aria-label="Open sidebar"
                        onClick={onHamburger}
                    >
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                    <Link to="/">
                        <img src={smatrchipLogo} width={80} height={50} alt="Logo" />
                    </Link>
                    <p className="brand m-0 px-2">SMARTCHIP TECHNOLOGIES</p>
                </div>

                <div className="d-flex align-items-center">
                    <Dropdown as={ButtonGroup}>
                        <Dropdown.Toggle split variant="success" id="dropdown-split-basic">
                            <span className="profileName px-2 text-capitalize fw-bold">{displayLabel}</span>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => {
                                clearLocalStorage();
                                setTimeout(() => {
                                    navigate('/login');
                                }, 500);
                                dispatch(clearUserInfo());
                            }}>
                                <FontAwesomeIcon icon={faSignOut} className="me-2" />
                                Logout
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </div>
        </div>
    );
};

export default Header;
