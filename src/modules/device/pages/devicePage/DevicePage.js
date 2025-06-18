
import { faEdit, faSearch, faTrash } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Table from "react-bootstrap/esm/Table"

import Card from "react-bootstrap/esm/Card"
import Button from "react-bootstrap/esm/Button"
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus"
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import './DevicePage.scss';
import Form from "react-bootstrap/esm/Form"
import { errorToast, successToast } from "../../../../shared/utils/appToaster"
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle"
import { useDeleteDeviceMutation, useGetAllDevicesQuery, useGetDeviceByCodeQuery } from "../../store/deviceEndPoint"
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook"
import { roles } from "../../../../shared/utils/appRoles"
import { deleteDevice, setDevices } from "../../store/deviceSlice"
import { Spinner } from "react-bootstrap"
import DairySkeletonRow from "../../../../shared/utils/skeleton/DairySkeletonRow"

const DevicePage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const userType = UserTypeHook();
    const userInfo = useSelector((state) => state?.userInfoSlice?.userInfo);
    const {
        data: allDevices = [],
        isLoading: isAllLoading,
        isError: isAllError
    } = useGetAllDevicesQuery(undefined, { skip: userType !== roles.ADMIN });
    const {
        data: devicesByCode = [],
        isLoading: isdevicesByCodeLoading,
        isError: isdevicesByCodeError
    } = useGetDeviceByCodeQuery(userInfo?.dairyCode || '', { skip: userType !== roles.DAIRY });
    const [deleteDeviceById] = useDeleteDeviceMutation();

    const createDevice = () => navigate('deviceadd');

    const handleDelete = async (deviceid) => {
        if (!window.confirm("Are you sure you want to delete this device?")) return;
        try {
            const res = await deleteDeviceById(deviceid).unwrap();
            dispatch(deleteDevice(res?.device));

            successToast("Device deleted.");
        } catch (err) {
            console.error("Delete error:", err);
            errorToast("Failed to delete device.");
        }
    };

    const devices = userType === roles.ADMIN
        ? allDevices
        : devicesByCode

    const isLoading = userType === roles.ADMIN ? isAllLoading : isdevicesByCodeLoading;
    const isError = userType === roles.ADMIN ? isAllError : isdevicesByCodeError;
    useEffect(() => {
        if (userType === roles.ADMIN && allDevices && !isAllLoading && !isAllError) {
            dispatch(setDevices(allDevices));
        }
    }, [allDevices, isAllLoading, isAllError, userType, dispatch]);

    useEffect(() => {
        if (userType === roles.DAIRY && devicesByCode && !isdevicesByCodeLoading && !isdevicesByCodeError) {
            dispatch(setDevices(devicesByCode));
        }
    }, [devicesByCode, isdevicesByCodeLoading, isdevicesByCodeError, userType, dispatch]);
    return (
        <>
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="DEVICES" pageItems={0} />
                <Button variant="outline-primary" onClick={createDevice}>
                    <FontAwesomeIcon icon={faPlus} /> Add Device
                </Button>
            </div>
            <div className="usersPage">
                <Card className="h-100">
                    <Card.Body className="cardbodyCss">
                        <Table hover>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Device Id</th>
                                    <th>Email</th>
                                    <th>Status</th>

                                    <th style={{ width: '150px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 10 }).map((_, i) => <DairySkeletonRow key={i} />)

                                ) : isError ? (
                                    <tr>
                                        <td colSpan="5" className="text-danger text-center">Error loading devices</td>
                                    </tr>
                                ) : devices.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center">No devices found</td>
                                    </tr>
                                ) : (
                                    devices.map((device, index) => (
                                        <tr key={device._id}>
                                            <td>{index + 1}</td>
                                            <td>{device.deviceid}</td>
                                            <td>{device.email}</td>
                                            <td>{device.status}</td>
                                            <td>
                                                <Button
                                                    size="sm"
                                                    variant="outline-primary"
                                                    className="me-2"
                                                    onClick={() => navigate(`edit/${device.deviceid}`)}
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline-danger"
                                                    onClick={() => handleDelete(device.deviceid)}
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>

                        </Table>
                    </Card.Body>
                </Card>
            </div>
        </>
    );
};



export default DevicePage;