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
import { useGetMemberCodewiseReportQuery } from "../../store/recordEndPoint";

const MemberRecords = () => {
    const navigate = useNavigate();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const userType = UserTypeHook();

    const isAdmin = userType === roles.ADMIN;
    const isDairy = userType === roles.DAIRY;
    const isDevice = userType === roles.DEVICE;

    const deviceid = userInfo?.deviceid;
    const dairyCode = userInfo?.dairyCode;

    // Queries for Admin and Dairy
    const { data: allDevices = [], isLoading: isAdminLoading } = useGetAllDevicesQuery(undefined, { skip: !isAdmin });
    const { data: dairyDevices = [], isLoading: isDairyLoading } = useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy });

    // Query for Device role to fetch its own data
    const { data: deviceData, isLoading: isDeviceLoading } = useGetDeviceByIdQuery(deviceid, { skip: !isDevice });

    const deviceList = isAdmin ? allDevices : isDairy ? dairyDevices : [];

    const [deviceCode, setDeviceCode] = useState("");
    const [memberCode, setMemberCode] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [triggerFetch, setTriggerFetch] = useState(false);
    const [viewMode, setViewMode] = useState('ALL');

    // Set default deviceCode for device user
    useEffect(() => {
        if (isDevice && deviceid)
            setDeviceCode(deviceid);
    }, [isDevice, deviceid]);

    // Get selected device and member list
    const selectedDevice = isDevice ? deviceData : deviceList.find(dev => dev.deviceid === deviceCode);
    const memberCodes = selectedDevice?.members || [];

    const handleSearch = () => {
        if (!deviceCode || !memberCode || !fromDate || !toDate) {
            errorToast("Please fill all required fields");
            return;
        }
        if (new Date(fromDate) > new Date(toDate)) {
            errorToast("From Date cannot be after To Date");
            return;
        }
        setTriggerFetch(true);
    };

    const { data: resultData, isFetching } = useGetMemberCodewiseReportQuery(
        { params: { deviceCode, memberCode, fromDate, toDate } },
        { skip: !triggerFetch }
    );

    const records = resultData?.records || [];
    const totals = resultData?.totals || [];
    console.log(records, totals)
    return (
        <>
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="MEMBER RECORDS" pageItems={0} />
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

                        {isDevice && (
                            isDeviceLoading ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                <Form.Control type="text" value={deviceCode} readOnly />
                            )
                        )}

                        <Form.Select value={memberCode} onChange={e => setMemberCode(e.target.value)}>
                            <option value="">Select Member Code</option>
                            {memberCodes.map((code, idx) => (
                                <option key={idx} value={code.CODE}>{`${code.CODE} - ${code.MEMBERNAME}`}</option>
                            ))}
                        </Form.Select>

                        <Form.Control type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                        <Form.Control type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                        <Form.Select value={viewMode} onChange={e => setViewMode(e.target.value)}>
                            <option value="ALL">Show All Records</option>
                            <option value="RECORDS">Only Records Summary</option>
                            <option value="TOTALS">Only Record Totals</option>
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
                                {viewMode !== "TOTALS" && (
                                    <>
                                        <PageTitle name="Record Summary" />
                                        <Table hover responsive>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Date</th>
                                                    <th>Milk Type</th>
                                                    <th>Shift</th>
                                                    <th>Qty</th>
                                                    <th>Fat</th>
                                                    <th>SNF</th>
                                                    <th>Rate</th>
                                                    <th>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {records.length > 0 ? (
                                                    records.map((record, index) => (
                                                        <tr key={index}>
                                                            <td>{index + 1}</td>
                                                            <td>{record?.SAMPLEDATE}</td>
                                                            <td>{record?.MILKTYPE}</td>
                                                            <td>{record?.SHIFT}</td>
                                                            <td>{record?.QTY}</td>
                                                            <td>{record?.FAT}</td>
                                                            <td>{record?.SNF}</td>
                                                            <td>{record?.RATE}</td>
                                                            <td>{record?.AMOUNT.toFixed(2)}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="9" className="text-center">No records found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </>
                                )}
                                {viewMode !== "RECORDS" && (
                                    <>
                                        <PageTitle name="Total Records" />
                                        <Table bordered responsive>
                                            <thead>
                                                <tr>
                                                    <th>Milk Type</th>
                                                    <th>Total Qty</th>
                                                    <th>Total Amount</th>
                                                    <th>Total Incentive</th>
                                                    <th>Avg Fat</th>
                                                    <th>Avg SNF</th>
                                                    <th>Avg Rate</th>
                                                    <th>Total Records</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {totals.length > 0 ? (
                                                    totals.map((total, index) => (
                                                        <tr key={index}>
                                                            <td>{total._id.milkType}</td>
                                                            <td>{total.totalQuantity}</td>
                                                            <td>{total.totalAmount}</td>
                                                            <td>{total.totalIncentive}</td>
                                                            <td>{total.averageFat}</td>
                                                            <td>{total.averageSNF}</td>
                                                            <td>{total.averageRate}</td>
                                                            <td>{total.totalRecords}</td>
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
    );
};

export default MemberRecords;
