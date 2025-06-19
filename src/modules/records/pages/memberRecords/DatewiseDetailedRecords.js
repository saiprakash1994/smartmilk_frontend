import React from "react";
import {
    faFileCsv,
    faFilePdf,
    faSearch,
    faCalendar,
    faList,
    faDesktop,
    faPerson,
    faTimesCircle,
    faClock,
    faUser,
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
import { useGetCumulativeReportQuery, useGetDatewiseDetailedReportQuery, useLazyGetDatewiseDetailedReportQuery } from "../../store/recordEndPoint";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { skipToken } from "@reduxjs/toolkit/query";
import InputGroup from "react-bootstrap/esm/InputGroup";
import './DatewiseDetailedRecords.scss';

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

    const [triggerGetAllDetailed, { isLoading: isExporting }] = useLazyGetDatewiseDetailedReportQuery();

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
    const handleExportPDF = async () => {
        if (!searchParams) {
            alert("Please search and select filters first.");
            return;
        }

        // Prepare params for full export
        const formattedFromDate = searchParams.fromDate.split("-").reverse().join("/");
        const formattedToDate = searchParams.toDate.split("-").reverse().join("/");

        let allData;
        try {
            const result = await triggerGetAllDetailed({
                params: {
                    deviceId: searchParams.deviceCode,
                    fromCode: searchParams.fromCode,
                    toCode: searchParams.toCode,
                    fromDate: formattedFromDate,
                    toDate: formattedToDate,
                    shift: searchParams.shift,
                    page: 1,
                    limit: 10000, // Large number to get all data
                }
            }).unwrap();
            allData = result?.data || [];
        } catch (err) {
            alert("Failed to fetch all records for export.");
            return;
        }

        if (!allData.length) {
            alert("No data available to export.");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let currentY = 10;

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        const title = "Datewise Detailed Report";
        doc.text(title, (pageWidth - doc.getTextWidth(title)) / 2, currentY);
        currentY += 10;

        // Header
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Device Code: ${searchParams.deviceCode}`, 14, currentY);
        doc.text(`Members: ${searchParams.fromCode} to ${searchParams.toCode}`, pageWidth - 80, currentY);
        currentY += 8;
        doc.text(`Date Range: ${searchParams.fromDate} to ${searchParams.toDate}`, 14, currentY);
        currentY += 10;

        allData.forEach((day) => {
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

        doc.save(`${getToday()}_${searchParams.deviceCode}_datewise_detailed.pdf`);
    };





    return (
        <div className="datewise-detailed-page" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '30px 0' }}>
            <div className="container" style={{ maxWidth: 1400 }}>
                {/* <PageTitle name="DATEWISE DETAILED RECORDS" pageItems={0} /> */}
                <Card className="mb-4 shadow filters-card" style={{ borderRadius: 16, padding: 24, background: 'rgba(255,255,255,0.97)' }}>
                    <Form className="row g-3 align-items-end justify-content-end">
                        <Form.Group className="col-md-2">
                            <Form.Label className="form-label-modern">Device Code</Form.Label>
                            {(isAdmin || isDairy) ? (
                                isAdminLoading || isDairyLoading ? (
                                    <Spinner animation="border" size="sm" />
                                ) : (
                                    <InputGroup>
                                        <InputGroup.Text><FontAwesomeIcon icon={faDesktop} /></InputGroup.Text>
                                        <Form.Select className="form-select-modern select-device" value={deviceCode} onChange={e => setDeviceCode(e.target.value)}>
                                            <option value="">Select Device</option>
                                            {deviceList?.map((dev) => (
                                                <option key={dev.deviceid} value={dev.deviceid}>{dev.deviceid}</option>
                                            ))}
                                        </Form.Select>
                                    </InputGroup>
                                )
                            ) : (
                                isDeviceLoading ? <Spinner animation="border" size="sm" /> :
                                    <Form.Control className="form-control-modern" type="text" value={deviceCode} readOnly />
                            )}
                        </Form.Group>
                        <Form.Group className="col-md-2">
                            <Form.Label className="form-label-modern">Start Member</Form.Label>
                            <InputGroup>
                                <InputGroup.Text><FontAwesomeIcon icon={faUser} /></InputGroup.Text>
                                <Form.Select className="form-select-modern select-member" value={fromCode} onChange={e => setFromCode(e.target.value)}>
                                    <option value="">Start Member Code</option>
                                    {memberCodes?.map((code, idx) => (
                                        <option key={idx} value={code.CODE}>{code.CODE} - {code.MEMBERNAME}</option>
                                    ))}
                                </Form.Select>
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="col-md-2">
                            <Form.Label className="form-label-modern">End Member</Form.Label>
                            <InputGroup>
                                <InputGroup.Text><FontAwesomeIcon icon={faUser} /></InputGroup.Text>
                                <Form.Select className="form-select-modern select-member" value={toCode} onChange={e => setToCode(e.target.value)}>
                                    <option value="">End Member Code</option>
                                    {memberCodes?.map((code, idx) => (
                                        <option key={idx} value={code.CODE}>{code.CODE} - {code.MEMBERNAME}</option>
                                    ))}
                                </Form.Select>
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="col-md-2">
                            <Form.Label className="form-label-modern">From Date</Form.Label>
                            <InputGroup>
                                {/* <InputGroup.Text><FontAwesomeIcon icon={faCalendar} /></InputGroup.Text> */}
                                <Form.Control className="form-control-modern select-date" type="date" value={fromDate} max={getToday()} onChange={e => setFromDate(e.target.value)} />
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="col-md-2">
                            <Form.Label className="form-label-modern">To Date</Form.Label>
                            <InputGroup>
                                {/* <InputGroup.Text><FontAwesomeIcon icon={faCalendar} /></InputGroup.Text> */}
                                <Form.Control className="form-control-modern select-date" type="date" value={toDate} max={getToday()} onChange={e => setToDate(e.target.value)} />
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="col-md-2">
                            <Form.Label className="form-label-modern">Shift</Form.Label>
                            <InputGroup>
                                <InputGroup.Text><FontAwesomeIcon icon={faClock} /></InputGroup.Text>
                                <Form.Select className="form-select-modern select-shift" value={shift} onChange={e => setShift(e.target.value)}>
                                    <option value="BOTH">ALL</option>
                                    <option value="MORNING">MORNING</option>
                                    <option value="EVENING">EVENING</option>
                                </Form.Select>
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="col-md-2 d-flex align-items-end">
                            <Button className="w-100 export-btn" variant="primary" onClick={handleSearch} disabled={isFetching} type="button">
                                {isFetching ? <Spinner size="sm" animation="border" /> : <FontAwesomeIcon icon={faSearch} />} Search
                            </Button>
                        </Form.Group>
                    </Form>
                </Card>
                {/* Actions Section: Export and Rows Per Page */}
                {totalCount > 0 && (<Card className="mb-3 records-actions-card" style={{ borderRadius: 14, padding: 16, background: 'rgba(255,255,255,0.97)' }}>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 w-100">
                    {totalCount > 0 && (<div className="d-flex gap-2">
                            <Button variant="outline-primary" className="export-btn" onClick={handleExportCSV} disabled={isFetching}>
                                <FontAwesomeIcon icon={faFileCsv} /> Export CSV
                            </Button>
                            <Button variant="outline-primary" className="export-btn" onClick={handleExportPDF} disabled={isExporting || isFetching}>
                                <FontAwesomeIcon icon={faFilePdf} /> Export PDF
                            </Button>
                        </div>)}
                        
                            <div className="d-flex align-items-center gap-3 flex-wrap">
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
                                <span className="fw-semibold ms-3">
                                    Page {currentPage} of {Math.ceil(totalCount / recordsPerPage)}
                                </span>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => prev - 1)}
                                    disabled={currentPage === 1}
                                >
                                    « Prev
                                </Button>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => prev + 1)}
                                    disabled={currentPage >= Math.ceil(totalCount / recordsPerPage)}
                                >
                                    Next »
                                </Button>
                            </div>
                        
                    </div>
                </Card>)}
                <Card className="shadow mb-4 records-card" style={{ borderRadius: 16, background: 'rgba(255,255,255,0.98)' }}>
                    <Card.Body className="cardbodyCss">
                        {!searchParams ? (
                            <div className="text-center my-5 text-muted">
                                Please apply filters and click <strong>Search</strong> to view records.
                            </div>
                        ) : isFetching ? (
                            <div className="text-center my-5">
                                <Spinner animation="border" variant="primary" />
                            </div>
                        ) : (
                            <>
                                {records.length === 0 ? (
                                    <div className="text-center text-muted">No summary data available.</div>
                                ) : (
                                    <div className="table-responsive">
                                        <Table hover responsive className="records-table">
                                            {records.length === 0 ? (
                                                <tbody>
                                                    <tr>
                                                        <td colSpan="11" className="text-center text-muted">No summary data available.</td>
                                                    </tr>
                                                </tbody>
                                            ) : (
                                                records.map((record, groupIdx) => (
                                                    <div className="datewise-section-card" key={`${record.date}-${record.shift}`}>  
                                                        {groupIdx > 0 && (
                                                            <div style={{ height: '18px' }}></div>
                                                        )}
                                                        <table className="section-table" style={{ width: '100%' }}>
                                                            <tbody>
                                                                <tr className="table-group-header">
                                                                    <td colSpan="9">
                                                                        <div className="group-header-card">
                                                                            <span className="group-header-title">Date: {record.date} | Shift: {record.shift}</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr style={{ background: '#e9ecef', fontWeight: 'bold' }}>
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
                                                                {record?.records?.length > 0 ? (
                                                                    record.records.map((stat, statIndex) => (
                                                                        <tr key={`${record.date}-${record.shift}-${stat.CODE}-${statIndex}`}>
                                                                            <td>{String(stat.CODE).padStart(4, "0")}</td>
                                                                            <td>{stat?.MILKTYPE}</td>
                                                                            <td>{stat?.FAT?.toFixed(1)}</td>
                                                                            <td>{stat?.SNF?.toFixed(1)}</td>
                                                                            <td>{stat?.QTY.toFixed(2)}</td>
                                                                            <td>₹{stat?.RATE?.toFixed(2)}</td>
                                                                            <td>₹{stat?.TOTALAMOUNT?.toFixed(2)}</td>
                                                                            <td>₹{stat?.INCENTIVEAMOUNT?.toFixed(2)}</td>
                                                                            <td>₹{(Number(stat?.TOTALAMOUNT) + Number(stat.INCENTIVEAMOUNT)).toFixed(2)}</td>
                                                                        </tr>
                                                                    ))
                                                                ) : (
                                                                    <tr>
                                                                        <td colSpan="9" className="text-center text-muted">No member records for this group.</td>
                                                                    </tr>
                                                                )}
                                                                {record?.milktypeStats?.length > 0 && (
                                                                    <tr>
                                                                        <td colSpan="9" style={{ padding: 0, background: '#f9fafb' }}>
                                                                            <div className="totals-table-wrapper">
                                                                                <strong>Summary Totals:</strong>
                                                                                <Table size="sm" className="mt-1 mb-2 section-totals-table" style={{ background: '#f9fafb' }}>
                                                                                    <thead>
                                                                                        <tr>
                                                                                            <th>Milk Type</th>
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
                                                                                        {record.milktypeStats.map((stat, idx) => (
                                                                                            <tr key={idx}>
                                                                                                <td>{stat?.milktype}</td>
                                                                                                <td>{stat?.totalSamples}</td>
                                                                                                <td>{stat?.avgFat?.toFixed(2)}</td>
                                                                                                <td>{stat?.avgSnf?.toFixed(2)}</td>
                                                                                                <td>{stat?.avgRate?.toFixed(2)}</td>
                                                                                                <td>{stat?.totalQty?.toFixed(2)}</td>
                                                                                                <td>₹{stat?.totalAmount?.toFixed(2)}</td>
                                                                                                <td>₹{stat?.totalIncentive?.toFixed(2)}</td>
                                                                                                <td>₹{stat?.grandTotal?.toFixed(2)}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </Table>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ))
                                            )}
                                        </Table>
                                    </div>
                                )}
                            </>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default DatewiseDetailedRecords;

