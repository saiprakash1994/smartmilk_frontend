import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Table from "react-bootstrap/esm/Table";
import Card from "react-bootstrap/esm/Card";
import Button from "react-bootstrap/esm/Button";
import Form from "react-bootstrap/esm/Form";
import Spinner from "react-bootstrap/esm/Spinner";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { errorToast } from "../../../../shared/utils/appToaster";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import {
    useGetDeviceByCodeQuery,
    useGetAllDevicesQuery,
    useGetDeviceByIdQuery,
} from "../../../device/store/deviceEndPoint";
import { roles } from "../../../../shared/utils/appRoles";
import { useGetAbsentMemberReportQuery } from "../../store/recordEndPoint";

const AbsentMemberRecords = () => {
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const userType = UserTypeHook();

    const isAdmin = userType === roles.ADMIN;
    const isDairy = userType === roles.DAIRY;
    const isDevice = userType === roles.DEVICE;

    const deviceid = userInfo?.deviceid;
    const dairyCode = userInfo?.dairyCode;

    const { data: allDevices = [], isLoading: isAdminLoading } = useGetAllDevicesQuery(undefined, { skip: !isAdmin });
    const { data: dairyDevices = [], isLoading: isDairyLoading } = useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy });



    const deviceList = isAdmin ? allDevices : isDairy ? dairyDevices : [];

    const [deviceCode, setDeviceCode] = useState("");
    const [date, setDate] = useState("");
    const [shift, setShift] = useState('');

    const [triggerFetch, setTriggerFetch] = useState(false);
    const [viewMode, setViewMode] = useState('TOTALS');

    // Set default deviceCode for device user
    useEffect(() => {
        if (isDevice && deviceid) setDeviceCode(deviceid);
    }, [isDevice, deviceid]);

    // Set default deviceCode for admin or dairy user
    useEffect(() => {
        if ((isAdmin || isDairy) && deviceList.length > 0 && !deviceCode) {
            setDeviceCode(deviceList[0].deviceid);
        }
    }, [isAdmin, isDairy, deviceList, deviceCode]);

    // Get selected device and member list

    const handleSearch = () => {
        if (!deviceCode || !date || !shift) {
            errorToast("Please fill all required fields");
            return;
        }
        setTriggerFetch(true);
    };
    const formattedDate = date.split("-").reverse().join("/");

    const { data: resultData, isFetching } = useGetAbsentMemberReportQuery(
        { params: { deviceid: deviceCode, date: formattedDate, shift } },
        { skip: !triggerFetch }
    );

    const absent = resultData?.absentMembers || [];
    const present = resultData?.presentMembers || []
    const {
        totalMembers = 0,
        presentCount = 0,
        absentCount = 0,
        cowAbsentCount = 0,
        bufAbsentCount = 0,
        cowPresentCount = 0,
        bufPresentCount = 0,
    } = resultData || {};
    return (
        <>
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="ABESENT MEMBER RECORDS" pageItems={0} />
            </div>
            <div className="usersPage">
                <Card className="h-100">
                    <div className="filters d-flex gap-3 p-3">
                        {(isAdmin || isDairy) && (
                            isAdminLoading || isDairyLoading ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                <Form.Select value={deviceCode} onChange={e => setDeviceCode(e.target.value)}>
                                    <option value="">Select Device Code</option>
                                    {deviceList?.map((dev) => (
                                        <option key={dev.deviceid} value={dev.deviceid}>{dev.deviceid}</option>
                                    ))}
                                </Form.Select>
                            )
                        )}

                        {isDevice &&

                            <Form.Control type="text" value={deviceCode} readOnly />

                        }

                        <Form.Select value={shift} onChange={e => setShift(e.target.value)}>
                            <option value="">Select Shift</option>
                            <option value="MORNING">MORNING</option>
                            <option value="EVENING">EVENING</option>
                        </Form.Select>

                        <Form.Control type="date" value={date} onChange={e => setDate(e.target.value)} />
                        <Form.Select value={viewMode} onChange={e => setViewMode(e.target.value)}>
                            <option value="TOTALS">Attendance Summary</option>
                            <option value="ABSENT">Absent Members</option>
                            <option value="PRESENT">Present Members</option>

                        </Form.Select>
                        <Button variant="outline-primary" onClick={handleSearch} disabled={isFetching}>
                            {isFetching ? <Spinner size="sm" animation="border" /> : <FontAwesomeIcon icon={faSearch} />}
                        </Button>
                    </div>

                    <Card.Body className="cardbodyCss">
                        {!triggerFetch ? (
                            <div className="text-center my-5 text-muted">
                                Please apply filters and click <strong>Search</strong> to view records.
                            </div>
                        ) : isFetching ? (
                            <div className="text-center my-5">
                                <Spinner animation="border" variant="primary" />
                            </div>
                        ) : (
                            <>
                                <hr />
                                {viewMode === "TOTALS" && (
                                    <>
                                        <PageTitle name="Attendance Summary" />
                                        <Table hover responsive>
                                            <thead>
                                                <tr>
                                                    <th>Total Members</th>
                                                    <th>Present Members</th>
                                                    <th>Absent Members</th>
                                                    <th>Cow Present</th>
                                                    <th>Buffalo Present</th>
                                                    <th>Cow Absent</th>
                                                    <th>Buffalo Absent</th>
                                                </tr>
                                            </thead>
                                            <tbody>

                                                <tr >
                                                    <td>{totalMembers}</td>
                                                    <td>{presentCount}</td>
                                                    <td>{absentCount}</td>
                                                    <td>{cowPresentCount}</td>
                                                    <td>{bufPresentCount}</td>
                                                    <td>{cowAbsentCount}</td>
                                                    <td>{bufAbsentCount}</td>

                                                </tr>

                                            </tbody>
                                        </Table>
                                    </>
                                )}
                                {viewMode === "ABSENT" && (
                                    <>
                                        <PageTitle name="Absent Members" />
                                        <Table bordered responsive>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>CODE</th>
                                                    <th>MILKTYPE</th>
                                                    <th>MEMBERNAME</th>

                                                </tr>
                                            </thead>
                                            <tbody>
                                                {absent.length > 0 ? (
                                                    absent.map((absent, index) => (
                                                        <tr key={index}>
                                                            <td>{index + 1}</td>
                                                            <td>{absent?.CODE}</td>
                                                            <td>{absent?.MILKTYPE == "C" ? "COW" : "BUFF"}</td>
                                                            <td>{absent?.MEMBERNAME}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="8" className="text-center">No totals available</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </>
                                )}
                                {viewMode === "PRESENT" && (
                                    <>
                                        <PageTitle name="Present Members" />
                                        <Table bordered responsive>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>CODE</th>
                                                    <th>MILKTYPE</th>
                                                    <th>MEMBERNAME</th>

                                                </tr>
                                            </thead>
                                            <tbody>
                                                {present.length > 0 ? (
                                                    present.map((present, index) => (
                                                        <tr key={index}>
                                                            <td>{index + 1}</td>
                                                            <td>{present?.CODE}</td>
                                                            <td>{present?.MILKTYPE == "C" ? "COW" : "BUFF"}</td>
                                                            <td>{present?.MEMBERNAME}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="8" className="text-center">No totals available</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </>
                                )}
                            </>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </>
    )
}

export default AbsentMemberRecords