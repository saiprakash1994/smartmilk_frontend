import { faFileCsv, faSearch } from "@fortawesome/free-solid-svg-icons";
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
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons/faFilePdf";
const getToday = () => {
    return new Date().toISOString().split("T")[0];
};

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
    const [date, setDate] = useState(getToday());
    const [shift, setShift] = useState('');

    const [triggerFetch, setTriggerFetch] = useState(false);
    const [viewMode, setViewMode] = useState('TOTALS');

    useEffect(() => {
        if (isDevice && deviceid) setDeviceCode(deviceid);
    }, [isDevice, deviceid]);


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
    const {
        totalMembers = 0,
        presentCount = 0,
        absentCount = 0,
        cowAbsentCount = 0,
        bufAbsentCount = 0,
    } = resultData || {};


    const handleExportCSV = () => {
        if (totalMembers === 0) {
            alert("No data available to export.");
            return;
        }
        let combinedCSV = "";
        if (absent?.length) {
            const recordsCSVData = absent.map((rec, index) => ({
                SNO: index + 1,
                CODE: absent?.CODE,
                MILKTYPE: absent?.MILKTYPE == "C" ? "COW" : "BUF",
                MEMBERNAME: absent?.MEMBERNAME,
            }));

            combinedCSV += `Absent Members Records on ${date} ${shift} Shift in Device ${deviceCode}  \n`;
            combinedCSV += Papa.unparse(recordsCSVData);
            combinedCSV += "\n\n";
        }


        if (totalMembers !== 0) {
            const totalsCSVData = {
                TotalMembers: totalMembers,
                PresentMembers: presentCount,
                AbsentMembers: absentCount,
                CowAbsent: cowAbsentCount,
                BuffaloAbsent: bufAbsentCount
            }
            combinedCSV += `Absent Members Total List on ${date} ${shift} Shift in Device ${deviceCode}\n`;
            combinedCSV += Papa.unparse(totalsCSVData);
        }


        // Save the single CSV
        const blob = new Blob([combinedCSV], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `absent_members_${date}_${shift}_${deviceCode}.csv`);
    };


    const handleExportPDF = () => {
        if (totalMembers === 0) {
            alert("No data available to export.");
            return;
        }

        const doc = new jsPDF();
        let currentY = 10;

        if (absent?.length) {
            doc.setFontSize(12);
            doc.text(`Absent Members Records on ${date} ${shift} Shift in Device ${deviceCode}`, 14, currentY);
            currentY += 6;
            const recordsTable = absent.map((absent, index) => ([
                index + 1,
                absent?.CODE,
                absent?.MILKTYPE == "C" ? "COW" : "BUF",
                absent?.MEMBERNAME,
            ]));

            autoTable(doc, {
                head: [[
                    "SNO",
                    "CODE",
                    "MILKTYPE",
                    "MEMBERNAME"
                ]],
                body: recordsTable,
                startY: currentY,
                theme: "grid",
                styles: { fontSize: 8 },
            });

            currentY = (doc.lastAutoTable?.finalY || currentY) + 10;
        }

        if (totalMembers !== 0) {
            doc.setFontSize(12);
            doc.text(`Absent Members Totals on ${date} ${shift} shift in  DEviceId ${deviceCode}`, 14, currentY);
            currentY += 6;
            const totalsTable = [
                totalMembers,
                presentCount,
                absentCount,
                cowAbsentCount,
                bufAbsentCount

            ]

            autoTable(doc, {
                head: [[
                    "TotalMembers", "PresentMembers", "AbsentMembers", "CowAbsent", "BuffaloAbsent"
                ]],
                body: totalsTable,
                startY: currentY,
                theme: "striped",
                styles: { fontSize: 10 },
            });
        }

        doc.save(`member_absent_${date}_${shift}_${deviceCode}.pdf`);
    };

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

                        <Form.Control type="date" value={date} max={getToday()} onChange={e => setDate(e.target.value)} />
                        <Form.Select value={viewMode} onChange={e => setViewMode(e.target.value)}>
                            <option value="TOTALS">Attendance Summary</option>
                            <option value="ABSENT">Absent Members</option>

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
                                                    <th>Cow Absent</th>
                                                    <th>Buffalo Absent</th>
                                                </tr>
                                            </thead>
                                            <tbody>

                                                <tr >
                                                    <td>{totalMembers}</td>
                                                    <td>{presentCount}</td>
                                                    <td>{absentCount}</td>
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
                                                            <td>{absent?.MILKTYPE == "C" ? "COW" : "BUF"}</td>
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
                                <Button variant="outline-primary" className="mb-3 me-2" onClick={handleExportCSV}>
                                    <FontAwesomeIcon icon={faFileCsv} /> Export CSV

                                </Button>
                                <Button variant="outline-primary" className="mb-3" onClick={handleExportPDF}>
                                    <FontAwesomeIcon icon={faFilePdf} /> Export PDF

                                </Button>
                            </>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </>
    )
}

export default AbsentMemberRecords