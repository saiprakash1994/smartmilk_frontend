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
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { errorToast } from "../../../../shared/utils/appToaster";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import {
    useGetDeviceByCodeQuery,
    useGetDeviceByIdQuery,
} from "../../../device/store/deviceEndPoint";
import { roles } from "../../../../shared/utils/appRoles";
import { useGetDatewiseDetailedReportQuery, useLazyGetDatewiseDetailedReportQuery } from "../../store/recordEndPoint";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { skipToken } from "@reduxjs/toolkit/query";
import InputGroup from "react-bootstrap/esm/InputGroup";
import './DatewiseDetailedRecords.scss';
import ExportButtonsSection from "../ExportButtonsSection";
import FilterSection from "./FilterSection";
import SummaryTotalsSection from "./SummaryTotalsSection";
import PaginationSection from "./PaginationSection";

const getToday = () => {
    return new Date().toISOString().split("T")[0];
};

// Helper to format date as dd/mm/yyyy
const formatDateDMY = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const DatewiseDetailedRecords = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const userType = UserTypeHook();

    const isDairy = userType === roles.DAIRY;
    const isDevice = userType === roles.DEVICE;

    const deviceid = userInfo?.deviceid;
    const dairyCode = userInfo?.dairyCode;

    // Queries for Dairy
    const { data: dairyDevices = [], isLoading: isDairyLoading } =
        useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy });

    // Query for Device role to fetch its own data
    const { data: deviceData, isLoading: isDeviceLoading } =
        useGetDeviceByIdQuery(deviceid, { skip: !isDevice });

    const deviceList = isDairy ? dairyDevices : [];

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

    // Reset filter state on navigation
    useEffect(() => {
        setDeviceCode("");
        setFromCode("");
        setToCode("");
        setShift("BOTH");
        setFromDate(getToday());
        setToDate(getToday());
        setCurrentPage(1);
        setRecordsPerPage(5);
        setSearchParams(null);
    }, [location.pathname]);

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
            // Only update if the page or limit actually changed
            setSearchParams((prev) => ({ 
                ...prev, 
                page: currentPage, 
                limit: recordsPerPage 
            }));
        }
    }, [currentPage, recordsPerPage, searchParams]);

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
            [`Records from ${formatDateDMY(fromDate)} to ${formatDateDMY(toDate)}`],
            [],
        ];
        combinedCSV += Papa.unparse(header, { quotes: true }) + "\n";

        records.forEach((day, dayIndex) => {
            combinedCSV += `Date: ${day.date}, Shift: ${day.shift}, Device: ${deviceCode}\n\n`;

            if (day?.records?.length) {
                const dailyMemberRows = [...day.records]
                    .sort((a, b) => Number(a.CODE) - Number(b.CODE))
                    .map((stat) => ({
                        Code: stat?.CODE,
                        MilkType: stat?.MILKTYPE,
                        FAT: stat?.FAT,
                        SNF: stat?.SNF,
                        CLR: stat?.CLR,
                        Rate: stat?.RATE,
                        Quantity: stat?.QTY,
                        TotalAmount: stat?.TOTALAMOUNT,
                        IncentiveAmount: stat?.INCENTIVEAMOUNT,
                        GrandTotal: (stat?.TOTALAMOUNT + stat?.INCENTIVEAMOUNT)
                    }));

                combinedCSV += "Member Records:\n";
                combinedCSV += Papa.unparse(dailyMemberRows) + "\n\n";
            }

            // Milk Type Summary
            if (day?.milktypeStats?.length) {
                const summaryRows = day?.milktypeStats?.map((stat) => ({
                    MilkType: stat?.milktype,
                    Samples: stat?.totalSamples,
                    AvgFAT: stat?.avgFat.toFixed(1),
                    AvgSNF: stat?.avgSnf.toFixed(1),
                    AvgCLR: stat?.avgSnf.toFixed(1),
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
        const fromDateDMY = formatDateDMY(searchParams.fromDate);
        const toDateDMY = formatDateDMY(searchParams.toDate);
        doc.text(`Date Range: ${fromDateDMY} to ${toDateDMY}`, 14, currentY);
        currentY += 10;

        // In handleExportPDF, sort allData by date ascending, then by shift ('MORNING' before 'EVENING')
        const shiftOrder = { 'MORNING': 1, 'EVENING': 2 };
        const sortedAllData = [...allData].sort((a, b) => {
            // Sort by date ascending
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
            // If dates are equal, sort by shift order
            const shiftA = shiftOrder[a.shift?.toUpperCase()] || 99;
            const shiftB = shiftOrder[b.shift?.toUpperCase()] || 99;
            return shiftA - shiftB;
        });

        sortedAllData.forEach((day) => {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`Date: ${day.date} | Shift: ${day.shift}`, 14, currentY);
            currentY += 6;

            if (day.records?.length) {
                const memberTable = [...day.records]
                    .sort((a, b) => Number(a.CODE) - Number(b.CODE))
                    .map((stat) => [
                        stat?.CODE,
                        stat?.MILKTYPE,
                        stat?.FAT,
                        stat?.SNF,
                        stat?.CLR,
                        stat?.RATE,
                        stat?.QTY,
                        stat?.TOTALAMOUNT,
                        stat?.INCENTIVEAMOUNT,
                        (stat?.TOTALAMOUNT + stat?.INCENTIVEAMOUNT)
                    ]);

                autoTable(doc, {
                    head: [[
                        "Code", "Milk Type", "FAT", "SNF", "CLR", "Rate", "Qty", "Total", "Incentive", "Grand Total"
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
                    stat?.avgFat.toFixed(1),
                    stat?.avgSnf.toFixed(1),
                    stat?.avgClr.toFixed(1),
                    stat?.avgRate.toFixed(2),
                    stat?.totalQty.toFixed(2),
                    stat?.totalAmount.toFixed(2),
                    stat?.totalIncentive.toFixed(2),
                    stat?.grandTotal.toFixed(2),
                ]);

                autoTable(doc, {
                    head: [[
                        "Milk Type", "Samples", "Avg FAT", "Avg SNF", "Avg CLR", "Avg Rate", "Total Qty",
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
                    <FilterSection
                        isDairy={isDairy}
                        isDevice={isDevice}
                        isDairyLoading={isDairyLoading}
                        isDeviceLoading={isDeviceLoading}
                        deviceList={deviceList}
                        deviceCode={deviceCode}
                        setDeviceCode={setDeviceCode}
                        fromCode={fromCode}
                        setFromCode={setFromCode}
                        toCode={toCode}
                        setToCode={setToCode}
                        fromDate={fromDate}
                        setFromDate={setFromDate}
                        toDate={toDate}
                        setToDate={setToDate}
                        shift={shift}
                        setShift={setShift}
                        memberCodes={memberCodes}
                        handleSearch={handleSearch}
                        isFetching={isFetching}
                    />
                </Card>
                {/* Actions Section: Export */}
                {totalCount > 0 && (
                    <div className=" mb-3">
                        {/* <Card className="export-actions-card" style={{ borderRadius: 14, padding: 16, minWidth: 220, background: 'rgba(255,255,255,0.97)' }}> */}
                        <ExportButtonsSection
                            handleExportCSV={handleExportCSV}
                            handleExportPDF={handleExportPDF}
                            isFetching={isFetching}
                            isExporting={isExporting}
                        />
                        {/* </Card> */}

                    </div>
                )}
                {!searchParams ? (
                    <Card className="shadow mb-4 records-card" style={{ borderRadius: 16, background: 'rgba(255,255,255,0.98)' }}>
                        <Card.Body className="cardbodyCss">
                            <div className="text-center my-5 text-muted">
                                Please apply filters and click <strong>Search</strong> to view records.
                            </div>
                        </Card.Body>
                    </Card>
                ) : isFetching ? (
                    <Card className="shadow mb-4 records-card" style={{ borderRadius: 16, background: 'rgba(255,255,255,0.98)' }}>
                        <Card.Body className="cardbodyCss">
                            <div className="text-center my-5">
                                <Spinner animation="border" variant="primary" />
                            </div>
                        </Card.Body>
                    </Card>
                ) : records.length === 0 ? (
                    <Card className="shadow mb-4 records-card" style={{ borderRadius: 16, background: 'rgba(255,255,255,0.98)' }}>
                        <Card.Body className="cardbodyCss">
                            <div className="text-center text-muted">No summary data available.</div>
                        </Card.Body>
                    </Card>
                ) : (
                    records.map((record, groupIdx) => (
                        <Card key={`${record.date}-${record.shift}`} className="mb-4" style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.98)' }}>
                            <div className="table-responsive">
                                <Table className="records-table" hover responsive>
                                    <tbody>
                                        <tr className="table-group-header">
                                            <td colSpan="9">
                                                <div className="group-header-card d-flex justify-content-between align-items-center">
                                                    <span className="group-header-title">Date: {record.date}</span>
                                                    <span className="group-header-title">Detailed Report</span>
                                                    <span className="group-header-title">Shift: {record.shift}</span>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            {/* <th>#</th> */}
                                            <th>Code</th>
                                            <th>Milk Type</th>
                                            <th>Fat</th>
                                            <th>SNF</th>
                                            <th>CLR</th>
                                            <th>Qty</th>
                                            <th>Rate</th>
                                            <th>Amount</th>
                                            <th>Incentive</th>
                                            <th>Total</th>

                                        </tr>
                                        {record?.records?.length > 0 ? (
                                            [...record.records]
                                                .sort((a, b) => Number(a.CODE) - Number(b.CODE))
                                                .map((stat, statIndex) => (
                                                    <tr key={`${record.date}-${record.shift}-${stat.CODE}-${statIndex}`}>
                                                        <td>{String(stat.CODE).padStart(4, "0")}</td>
                                                        <td>{stat?.MILKTYPE}</td>
                                                        <td>{stat?.FAT?.toFixed(1)}</td>
                                                        <td>{stat?.SNF?.toFixed(1)}</td>
                                                        <td>{stat?.CLR?.toFixed(1)}</td>
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
                                                    <SummaryTotalsSection milktypeStats={record.milktypeStats} showHeader={true} />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card>
                    ))
                )}
                {totalCount > 0 && (

                    <PaginationSection
                        totalCount={totalCount}
                        recordsPerPage={recordsPerPage}
                        setRecordsPerPage={setRecordsPerPage}
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                    />

                )}
            </div>
        </div>
    );
};

export default DatewiseDetailedRecords;

