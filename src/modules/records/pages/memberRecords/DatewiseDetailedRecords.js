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
    const [shift, setShift] = useState('');
    const [fromDate, setFromDate] = useState(getToday());
    const [toDate, setToDate] = useState(getToday());
    const [triggerFetch, setTriggerFetch] = useState(false);
    const [viewMode, setViewMode] = useState("All");

    // Set default deviceCode for device user
    useEffect(() => {
        if (isDevice && deviceid) setDeviceCode(deviceid);
    }, [isDevice, deviceid]);

    // Get selected device and member list
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
        setTriggerFetch(true);
    };
    const formattedFromDate = fromDate.split("-").reverse().join("/");
    const formattedToDate = toDate.split("-").reverse().join("/");

    const { data: resultData, isFetching } = useGetDatewiseDetailedReportQuery(
        {
            params: {
                deviceId: deviceCode,
                fromCode,
                toCode,
                fromDate: formattedFromDate,
                toDate: formattedToDate,
                shift

            },
        },
        { skip: !triggerFetch }
    );
    console.log(resultData, "data");

    const records = resultData?.records || [];
    const totals = resultData?.summary || [];

    const handleExportCSV = () => {
        if (!totals?.length && !records?.length) {
            alert("No data available to export.");
            return;
        }

        const deviceHeader = [
            [`Device Code: ${deviceCode}`],
            [`Members: ${fromCode} to ${toCode}`],
            [`Records from ${fromDate} to ${toDate}`],
            [],
        ];

        let combinedCSV = "";

        // Convert header to CSV
        combinedCSV += Papa.unparse(deviceHeader, { quotes: true }) + "\n";

        if (records?.length) {
            const recordsCSVData = records.map((record, index) => ({
                SNO: index + 1,
                Code: record?.CODE,
                Date: record?.SAMPLEDATE,
                Shift: record?.SHIFT,
                Fat: record?.FAT,
                SNF: record?.SNF,
                Rate: record?.RATE,
                Qty: record?.QTY,
                Incentive: record?.INCENTIVEAMOUNT,
                AnalyzerMode: record?.ANALYZERMODE,
                WeightMode: record?.WEIGHTMODE,
                Water: record?.WATER?.toFixed(1),
            }));

            combinedCSV += "Member Records:\n";
            combinedCSV += Papa.unparse(recordsCSVData) + "\n\n";
        }

        if (totals?.length) {
            const totalsCSVData = totals.map((total) => ({
                Shift: total?.shift,
                Samples: total?.samples,
                AvgFat: total?.avgFat?.toFixed(2),
                AvgSnf: total?.avgSnf?.toFixed(2),
                AvgRate: total?.avgRate?.toFixed(2),
                TotalQty: total?.totalQty?.toFixed(2),
                TotalAmount: total?.totalAmount?.toFixed(2),
                Incentive: total?.totalIncentive?.toFixed(2),
                GrandTotal: total?.grandTotal?.toFixed(2),
            }));

            combinedCSV += "Summary Totals:\n";
            combinedCSV += Papa.unparse(totalsCSVData);
        }

        const blob = new Blob([combinedCSV], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `${getToday()}_${deviceCode}_datewise_detailed.csv`);
    };


    const handleExportPDF = () => {
        if (!totals?.length && !records?.length) {
            alert("No data available to export.");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let currentY = 10;

        // Title
        const title = "Payment Register";
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(title, (pageWidth - doc.getTextWidth(title)) / 2, currentY);
        currentY += 10;

        // Header Info
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Device Code: ${deviceCode}`, 14, currentY);
        const memberRange = `Members: ${fromCode} to ${toCode}`;
        doc.text(memberRange, pageWidth - doc.getTextWidth(memberRange) - 14, currentY);
        currentY += 8;

        doc.text(`Records from ${fromDate} to ${toDate}`, 14, currentY);
        currentY += 6;

        // Records Table
        if (records?.length) {
            const recordsTable = records.map((rec, index) => [
                index + 1,
                rec?.CODE,
                rec?.SAMPLEDATE,
                rec?.SHIFT,
                rec?.FAT,
                rec?.SNF,
                rec?.RATE,
                rec?.QTY,
                rec?.INCENTIVEAMOUNT,
                rec?.ANALYZERMODE,
                rec?.WEIGHTMODE,
                rec?.WATER?.toFixed(1),
            ]);

            autoTable(doc, {
                head: [[
                    "S.No", "Code", "Date", "Shift", "Fat", "SNF",
                    "Rate", "Qty", "Incentive", "Analyzer Mode", "Weight Mode", "Water",
                ]],
                body: recordsTable,
                startY: currentY,
                theme: "grid",
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] },
            });

            currentY = (doc.lastAutoTable?.finalY || currentY) + 10;
        }

        // Summary Table
        if (totals?.length) {
            const summaryTable = totals.map((total) => [
                total?.shift,
                total?.samples,
                total?.avgFat?.toFixed(2),
                total?.avgSnf?.toFixed(2),
                total?.avgRate?.toFixed(2),
                total?.totalQty?.toFixed(2),
                total?.totalAmount?.toFixed(2),
                total?.totalIncentive?.toFixed(2),
                total?.grandTotal?.toFixed(2),
            ]);

            autoTable(doc, {
                head: [[
                    "Shift", "Samples", "Avg Fat", "Avg SNF", "Avg Rate",
                    "Total Qty", "Total Amount", "Incentive", "Grand Total",
                ]],
                body: summaryTable,
                startY: currentY,
                theme: "striped",
                styles: { fontSize: 9 },
                headStyles: { fillColor: [39, 174, 96] },
            });
        }

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
                                        <option key={dev.deviceid} value={dev.deviceid}>
                                            {dev.deviceid}
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
                            {memberCodes.map((code, idx) => (
                                <option
                                    key={idx}
                                    value={code.CODE}
                                >{`${code.CODE} - ${code.MEMBERNAME}`}</option>
                            ))}
                        </Form.Select>
                        <Form.Select
                            value={toCode}
                            onChange={(e) => setToCode(e.target.value)}
                        >
                            <option value="">Select End Member Code</option>
                            {memberCodes.map((code, idx) => (
                                <option
                                    key={idx}
                                    value={code.CODE}
                                >{`${code.CODE} - ${code.MEMBERNAME}`}</option>
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
                            <option value="">Select Shift</option>
                            <option value="MORNING">MORNING</option>
                            <option value="EVENING">EVENING</option>
                        </Form.Select>
                        <Form.Select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value)}
                        >
                            <option value="ALL">All Records</option>
                            <option value="RECORDS">Detailed Records</option>
                            <option value="Totals">Record Summary </option>

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
                        {!triggerFetch ? (
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
                                {viewMode !== "TOTALS" && (
                                    <>
                                        <PageTitle name="Record Summary" />
                                        <Table hover responsive>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Code</th>
                                                    <th>Date</th>
                                                    <th>Shift</th>
                                                    <th>Fat</th>
                                                    <th>SNF</th>
                                                    <th>Rate</th>
                                                    <th>Qty</th>
                                                    <th>Incentive</th>
                                                    <th>AnalyzerMode</th>
                                                    <th>WeightMode</th>
                                                    <th>Water</th>

                                                </tr>
                                            </thead>
                                            <tbody>
                                                {records?.length > 0 ? (
                                                    records.map((record, index) => (
                                                        <tr key={record._id}>
                                                            <td>{index + 1}</td>
                                                            <td>{record?.CODE}</td>
                                                            <td>{record?.SAMPLEDATE}</td>
                                                            <td>{record?.SHIFT}</td>
                                                            <td>{record?.FAT}</td>
                                                            <td>{record?.SNF}</td>
                                                            <td>{record?.RATE}</td>
                                                            <td>{record?.QTY}</td>
                                                            <td>{record?.INCENTIVEAMOUNT}</td>
                                                            <td>{record?.ANALYZERMODE}</td>
                                                            <td>{record?.WEIGHTMODE}</td>
                                                            <td>{record?.WATER?.toFixed(1)}</td>

                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="12" className="text-center">No records found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>


                                    </>
                                )}
                                {viewMode !== "RECORDS" && (
                                    <>
                                        <PageTitle name="Total Summary" />
                                        <Table hover responsive>
                                            <thead>
                                                <tr>
                                                    <th>Shift</th>
                                                    <th>Samples</th>
                                                    <th>Avg FAT</th>
                                                    <th>Avg SNF</th>
                                                    <th>Avg Rate</th>
                                                    <th>Total Qty</th>
                                                    <th>Total Amount</th>
                                                    <th>Incentive</th>
                                                    <th>Grand Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {totals?.length > 0 ? (
                                                    totals.map((total, index) => (
                                                        <tr key={index}>
                                                            <td>{total.shift}</td>
                                                            <td>{total.samples}</td>
                                                            <td>{total.avgFat.toFixed(2)}</td>
                                                            <td>{total.avgSnf.toFixed(2)}</td>
                                                            <td>{total.avgRate.toFixed(2)}</td>
                                                            <td>{total.totalQty.toFixed(2)}</td>
                                                            <td>{total.totalAmount.toFixed(2)}</td>
                                                            <td>{total.totalIncentive.toFixed(2)}</td>
                                                            <td>{total.grandTotal.toFixed(2)}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="12" className="text-center">No records found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>


                                    </>
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
                            </>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </>
    );
};

export default DatewiseDetailedRecords;
