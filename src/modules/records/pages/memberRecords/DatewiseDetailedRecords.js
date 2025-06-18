import {
    faFileCsv,
    faFilePdf,
    faSearch,
} from "@fortawesome/free-solid-svg-icons";
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
import { useGetCumulativeReportQuery, useGetDatewiseDetailedReportQuery } from "../../store/recordEndPoint";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { skipToken } from "@reduxjs/toolkit/query";
const getToday = () => {
    return new Date().toISOString().split("T")[0];
};
const DatewiseDetailedRecords = () => {
    const navigate = useNavigate();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const userType = UserTypeHook();

    const isAdmin = userType === roles.ADMIN;
    const isDairy = userType === roles.DAIRY;
    const isDevice = userType === roles.DEVICE;

    const deviceid = userInfo?.deviceid;
    const dairyCode = userInfo?.dairyCode;

    // Queries for Admin and Dairy
    const { data: allDevices = [], isLoading: isAdminLoading } =
        useGetAllDevicesQuery(undefined, { skip: !isAdmin });
    const { data: dairyDevices = [], isLoading: isDairyLoading } =
        useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy });

    // Query for Device role to fetch its own data
    const { data: deviceData, isLoading: isDeviceLoading } =
        useGetDeviceByIdQuery(deviceid, { skip: !isDevice });

    const deviceList = isAdmin ? allDevices : isDairy ? dairyDevices : [];

    const [deviceCode, setDeviceCode] = useState("");
    const [fromCode, setFromCode] = useState("");
    const [toCode, setToCode] = useState("");
    const [shift, setShift] = useState('BOTH');
    const [fromDate, setFromDate] = useState(getToday());
    const [toDate, setToDate] = useState(getToday());
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(5);
    const [searchParams, setSearchParams] = useState(null);

    useEffect(() => {
        if (isDevice && deviceid) setDeviceCode(deviceid);
    }, [isDevice, deviceid]);

    const selectedDevice = isDevice
        ? deviceData
        : deviceList.find((dev) => dev.deviceid === deviceCode);
    const memberCodes = selectedDevice?.members || [];

    const handleSearch = () => {
        if (!deviceCode || !fromCode || !toCode || !fromDate || !toDate || !shift) {
            errorToast("Please fill all required fields");
            return;
        }
        if (new Date(fromDate) > new Date(toDate)) {
            errorToast("From Date cannot be after To Date");
            return;
        }
        const fromCodeNum = parseInt(fromCode, 10);
        const toCodeNum = parseInt(toCode, 10);

        if (fromCodeNum > toCodeNum) {
            errorToast(
                "Start Member Code should not be greater than End Member Code"
            );
            return;
        }
        setCurrentPage(1);
        setSearchParams({
            deviceCode,
            fromCode,
            toCode,
            fromDate,
            toDate,
            shift
        });
    };

    useEffect(() => {
        if (searchParams) {
            setSearchParams((prev) => ({ ...prev }));
        }
    }, [currentPage, recordsPerPage]);

    useEffect(() => {
        if (memberCodes.length > 0) {
            const firstMember = memberCodes[0];
            const lastMember = memberCodes[memberCodes.length - 1];

            setFromCode(firstMember.CODE);
            setToCode(lastMember.CODE);
        } else {
            setFromCode("");
            setToCode("");
        }
    }, [deviceCode, memberCodes]);
    const formattedFromDate = searchParams?.fromDate?.split("-").reverse().join("/");
    const formattedToDate = searchParams?.toDate?.split("-").reverse().join("/");

    const { data: resultData, isFetching } = useGetDatewiseDetailedReportQuery(
        searchParams
            ? {
                params: {
                    deviceId: deviceCode,
                    fromCode,
                    toCode,
                    fromDate: formattedFromDate,
                    toDate: formattedToDate,
                    shift,
                    page: currentPage,
                    limit: recordsPerPage,

                },
            }
            : skipToken
    );

    const records = resultData?.data || [];
    const totalCount = resultData?.totalCount;

    const handleExportCSV = () => {
        if (!records?.length) {
            alert("No data available to export.");
            return;
        }

        let combinedCSV = "";

        // Header Info
        const header = [
            [`Device Code: ${deviceCode}`],
            [`Members: ${fromCode} to ${toCode}`],
            [`Records from ${fromDate} to ${toDate}`],
            [],
        ];
        combinedCSV += Papa.unparse(header, { quotes: true }) + "\n";

        records.forEach((day, dayIndex) => {
            combinedCSV += `Date: ${day.date}, Shift: ${day.shift}, Device: ${deviceCode}\n\n`;

            if (day?.records?.length) {
                const dailyMemberRows = day?.records?.map((stat) => ({
                    Code: stat?.CODE,
                    MilkType: stat?.MILKTYPE,
                    FAT: stat?.FAT,
                    SNF: stat?.SNF,
                    Rate: stat?.RATE,
                    Quantity: stat?.QTY,
                    IncentiveAmount: stat?.INCENTIVEAMOUNT,
                    TotalAmount: stat?.TOTALAMOUNT,
                }));

                combinedCSV += "Member Records:\n";
                combinedCSV += Papa.unparse(dailyMemberRows) + "\n\n";
            }

            // Milk Type Summary
            if (day?.milktypeStats?.length) {
                const summaryRows = day?.milktypeStats?.map((stat) => ({
                    MilkType: stat?.milktype,
                    Samples: stat?.totalSamples,
                    AvgFAT: stat?.avgFat.toFixed(2),
                    AvgSNF: stat?.avgSnf.toFixed(2),
                    AvgRate: stat?.avgRate.toFixed(2),
                    TotalQty: stat?.totalQty.toFixed(2),
                    TotalAmount: stat?.totalAmount.toFixed(2),
                    Incentive: stat?.totalIncentive.toFixed(2),
                    GrandTotal: stat?.grandTotal.toFixed(2),
                }));

                combinedCSV += "Summary Totals:\n";
                combinedCSV += Papa.unparse(summaryRows) + "\n\n";
            }
        });

        const blob = new Blob([combinedCSV], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `${getToday()}_${deviceCode}_datewise_detailed.csv`);
    };
    const handleExportPDF = () => {
        if (!records?.length) {
            alert("No data available to export.");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let currentY = 10;

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        const title = "Datewise Detailed";
        doc.text(title, (pageWidth - doc.getTextWidth(title)) / 2, currentY);
        currentY += 10;

        // Header
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Device Code: ${deviceCode}`, 14, currentY);
        doc.text(`Members: ${fromCode} to ${toCode}`, pageWidth - 80, currentY);
        currentY += 8;
        doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, currentY);
        currentY += 10;

        records.forEach((day) => {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`Date: ${day.date} | Shift: ${day.shift}`, 14, currentY);
            currentY += 6;

            if (day.records?.length) {
                const memberTable = day?.records?.map((stat) => [
                    stat?.CODE,
                    stat?.MILKTYPE,
                    stat?.FAT,
                    stat?.SNF,
                    stat?.RATE,
                    stat?.QTY,
                    stat?.INCENTIVEAMOUNT,
                    stat?.TOTALAMOUNT,
                ]);

                autoTable(doc, {
                    head: [[
                        "Code", "Milk Type", "FAT", "SNF", "Rate", "Qty", "Incentive", "Total"
                    ]],
                    body: memberTable,
                    startY: currentY,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [41, 128, 185] },
                    theme: "grid",
                });

                currentY = doc.lastAutoTable.finalY + 8;
            }

            if (day.milktypeStats?.length) {
                const summaryTable = day?.milktypeStats?.map((stat) => [
                    stat?.milktype,
                    stat?.totalSamples,
                    stat?.avgFat.toFixed(2),
                    stat?.avgSnf.toFixed(2),
                    stat?.avgRate.toFixed(2),
                    stat?.totalQty.toFixed(2),
                    stat?.totalAmount.toFixed(2),
                    stat?.totalIncentive.toFixed(2),
                    stat?.grandTotal.toFixed(2),
                ]);

                autoTable(doc, {
                    head: [[
                        "Milk Type", "Samples", "Avg FAT", "Avg SNF", "Avg Rate", "Total Qty",
                        "Total Amount", "Incentive", "Grand Total"
                    ]],
                    body: summaryTable,
                    startY: currentY,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [39, 174, 96] },
                    theme: "striped",
                });

                currentY = doc.lastAutoTable.finalY + 10;
            }
        });

        doc.save(`${getToday()}_${deviceCode}_datewise_detailed.pdf`);
    };





    return (
        <>
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="DATEWISE DETAILED RECORDS" pageItems={0} />
            </div>

            <div className="usersPage">
                <Card className="h-100">
                    <div className="filters d-flex gap-3 p-3">
                        {(isAdmin || isDairy) &&
                            (isAdminLoading || isDairyLoading ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                <Form.Select
                                    value={deviceCode}
                                    onChange={(e) => setDeviceCode(e.target.value)}
                                >
                                    <option value="">Select Device Code</option>
                                    {deviceList?.map((dev) => (
                                        <option key={dev.deviceid} value={dev?.deviceid}>
                                            {dev?.deviceid}
                                        </option>
                                    ))}
                                </Form.Select>
                            ))}

                        {isDevice &&
                            (isDeviceLoading ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                <Form.Control type="text" value={deviceCode} readOnly />
                            ))}

                        <Form.Select
                            value={fromCode}
                            onChange={(e) => setFromCode(e.target.value)}
                        >
                            <option value="">Select Start Member Code</option>
                            {memberCodes?.map((code, idx) => (
                                <option
                                    key={idx}
                                    value={code.CODE}
                                >{`${code?.CODE} - ${code?.MEMBERNAME}`}</option>
                            ))}
                        </Form.Select>
                        <Form.Select
                            value={toCode}
                            onChange={(e) => setToCode(e.target.value)}
                        >
                            <option value="">Select End Member Code</option>
                            {memberCodes?.map((code, idx) => (
                                <option
                                    key={idx}
                                    value={code.CODE}
                                >{`${code?.CODE} - ${code?.MEMBERNAME}`}</option>
                            ))}
                        </Form.Select>

                        <Form.Control
                            type="date"
                            value={fromDate}
                            max={getToday()}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                        <Form.Control
                            type="date"
                            value={toDate}
                            max={getToday()}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                        <Form.Select value={shift} onChange={e => setShift(e.target.value)}>
                            <option value="BOTH">ALL Shifts</option>

                            <option value="MORNING">MORNING</option>
                            <option value="EVENING">EVENING</option>
                        </Form.Select>

                        <Button
                            variant="outline-primary"
                            onClick={handleSearch}
                            disabled={isFetching}
                        >
                            {isFetching ? (
                                <Spinner size="sm" animation="border" />
                            ) : (
                                <FontAwesomeIcon icon={faSearch} />
                            )}
                        </Button>
                    </div>

                    <Card.Body className="cardbodyCss">
                        {!searchParams ? (
                            <div className="text-center my-5 text-muted">
                                Please apply filters and click <strong>Search</strong> to view
                                records.
                            </div>
                        ) : isFetching ? (
                            <div className="text-center my-5">
                                <Spinner animation="border" variant="primary" />
                            </div>
                        ) : (
                            <>
                                <hr />
                                {records?.length === 0 ? (
                                    <div className="text-center text-muted">No summary data available.</div>
                                ) : (
                                    records?.map((record, index) => (
                                        <div key={index} className="mb-4">
                                            <h5 className="mb-3">
                                                <strong>Date:</strong> {record?.date} &nbsp; | &nbsp;
                                                <strong>Shift:</strong> {record?.shift}&nbsp; | &nbsp;
                                                <strong>Device Id:</strong> {deviceCode}

                                            </h5>
                                            <Table hover responsive>
                                                <thead>
                                                    <tr>
                                                        <th>Code</th>
                                                        <th>Milk Type</th>
                                                        <th>FAT</th>
                                                        <th>SNF</th>
                                                        <th>Qty</th>
                                                        <th>Rate</th>
                                                        <th>Total</th>
                                                        <th>Incentive</th>
                                                        <th>Grand Total</th>

                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {record?.records?.map((stat, statIndex) => (
                                                        <tr key={statIndex}>
                                                            <td>{stat?.CODE}</td>
                                                            <td>{stat?.MILKTYPE}</td>
                                                            <td>{stat?.FAT?.toFixed(1)}</td>
                                                            <td>{stat?.SNF?.toFixed(1)}</td>
                                                            <td>{stat?.QTY.toFixed(2)}</td>
                                                            <td>₹{stat?.RATE?.toFixed(2)}</td>
                                                            <td>₹{stat?.TOTALAMOUNT?.toFixed(2)}</td>
                                                            <td>₹{stat?.INCENTIVEAMOUNT?.toFixed(2)}</td>
                                                            <td>₹{(Number(stat?.TOTALAMOUNT) + Number(stat.INCENTIVEAMOUNT)).toFixed(2)}</td>


                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                            <Table hover responsive>
                                                <thead>
                                                    <tr>
                                                        <th>Milk Type</th>
                                                        <th>Samples</th>
                                                        <th>Avg FAT</th>
                                                        <th>Avg SNF</th>
                                                        <th>Total Qty</th>
                                                        <th>Avg Rate</th>
                                                        <th>Total Amount</th>
                                                        <th>Incentive</th>
                                                        <th>Grand Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {record.milktypeStats.map((stat, statIndex) => (
                                                        <tr key={statIndex}>
                                                            <td>{stat?.milktype}</td>
                                                            <td>{stat?.totalSamples}</td>
                                                            <td>{stat?.avgFat.toFixed(2)}</td>
                                                            <td>{stat?.avgSnf.toFixed(2)}</td>
                                                            <td>{stat?.totalQty.toFixed(2)}</td>
                                                            <td>₹{stat?.avgRate.toFixed(2)}</td>
                                                            <td>₹{stat?.totalAmount.toFixed(2)}</td>
                                                            <td>₹{stat?.totalIncentive.toFixed(2)}</td>
                                                            <td>₹{stat?.grandTotal.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>

                                        </div>
                                    ))
                                )}
                                <Button
                                    variant="outline-primary"
                                    className="mb-3 me-2"
                                    onClick={handleExportCSV}
                                >
                                    <FontAwesomeIcon icon={faFileCsv} /> Export CSV
                                </Button>
                                <Button
                                    variant="outline-primary"
                                    className="mb-3"
                                    onClick={handleExportPDF}
                                >
                                    <FontAwesomeIcon icon={faFilePdf} /> Export PDF
                                </Button>
                                {totalCount > 0 && (
                                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="text-muted">Rows per page:</span>
                                            <Form.Select
                                                size="sm"
                                                value={recordsPerPage}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setRecordsPerPage(parseInt(value));
                                                    setCurrentPage(1);
                                                }}
                                                style={{ width: "auto" }}
                                            >
                                                <option value="5">5</option>
                                                <option value="10">10</option>
                                                <option value="20">20</option>
                                                <option value="50">50</option>
                                            </Form.Select>
                                        </div>

                                        {totalCount > recordsPerPage && (
                                            <div className="d-flex align-items-center gap-2">
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => setCurrentPage((prev) => prev - 1)}
                                                    disabled={currentPage === 1}
                                                >
                                                    « Prev
                                                </Button>
                                                <span className="fw-semibold">
                                                    Page {currentPage} of {Math.ceil(totalCount / recordsPerPage)}
                                                </span>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => setCurrentPage((prev) => prev + 1)}
                                                    disabled={currentPage >= Math.ceil(totalCount / recordsPerPage)}
                                                >
                                                    Next »
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </>
    );
};

export default DatewiseDetailedRecords;
