import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './Header.scss';
import { faSignOut } from '@fortawesome/free-solid-svg-icons';
import { ButtonGroup, Dropdown } from 'react-bootstrap';
import smatrchipLogo from '../../../assets/smatrchipLogo.png';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { clearUserInfo } from '../../../modules/authentication/store/userInfoSlice';
import { clearLocalStorage } from '../../utils/localStorage';
import { useNavigate } from 'react-router-dom';



const Header = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const userInfo = useSelector((state) => state?.userInfoSlice?.userInfo)
    useEffect(() => {
        console.log('userInfo', userInfo)
    }, [userInfo])
    const displayLabel = userInfo?.dairyName || userInfo?.deviceName || "User";

    const handleLogout = () => {
        clearLocalStorage();
        setTimeout(() => {
            navigate('/login');
        }, 500);
        dispatch(clearUserInfo());

    };

    return (
        <div className="mainHeader text-white">
            <div className="h-100 appNav d-flex justify-content-between w-100">
                <div className="d-flex appbrand align-items-center">
                    <a href='/'>
                        <img src={smatrchipLogo} width={80} height={50} alt="Logo" />

                    </a>
                    <p className="brand m-0 px-2">SMARTCHIP TECHNOLOGIES</p>
                </div>

                <div className="d-flex align-items-center">
                    <Dropdown as={ButtonGroup}>
                        <Dropdown.Toggle split variant="success" id="dropdown-split-basic">

                            <span className="profileName px-2 text-capitalize fw-bold">{displayLabel}</span>
                            {/* <img className="profileImage" src={
                                'https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250"'} /> */}
                        </Dropdown.Toggle>

                        <Dropdown.Menu>
                            <Dropdown.Item onClick={handleLogout}>
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
