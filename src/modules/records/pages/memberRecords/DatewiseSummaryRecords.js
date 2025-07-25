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
import './DatewiseSummaryRecords.scss';
import ExportButtonsSection from "../ExportButtonsSection";
import FilterSection from "./FilterSection";
import SummaryTotalsSection from "./SummaryTotalsSection";
import PaginationSection from "./PaginationSection";

const getToday = () => {
    return new Date().toISOString().split("T")[0];
};

const DatewiseSummaryRecords = () => {
    const navigate = useNavigate();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const userType = UserTypeHook();

    const isDairy = userType === roles.DAIRY;
    const isDevice = userType === roles.DEVICE;

    const deviceid = userInfo?.deviceid;
    const dairyCode = userInfo?.dairyCode;

    const { data: dairyDevices = [], isLoading: isDairyLoading } =
        useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy || !dairyCode });

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

    // Set default deviceCode for device user
    useEffect(() => {
        if (isDevice && deviceid) setDeviceCode(deviceid);
    }, [isDevice, deviceid]);

    const selectedDevice = isDevice
        ? deviceData
        : deviceList.find((dev) => dev.deviceid === deviceCode);
    const memberCodes = selectedDevice?.members || [];

    useEffect(() => {
        if (memberCodes.length > 0) {
            setFromCode(memberCodes[0].CODE);
            setToCode(memberCodes[memberCodes.length - 1].CODE);
        } else {
            setFromCode("");
            setToCode("");
        }
    }, [deviceCode, memberCodes]);

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
            errorToast("Start Member Code should not be greater than End Member Code");
            return;
        }
        setSearchParams({
            deviceCode,
            fromCode,
            toCode,
            fromDate,
            toDate,
            shift
        });
        setCurrentPage(1);
    };

    useEffect(() => {
        if (searchParams) {
            setSearchParams((prev) => ({
                ...prev,
                page: currentPage,
                limit: recordsPerPage
            }));
        }
    }, [currentPage, recordsPerPage]);

    const formattedFromDate = searchParams?.fromDate?.split("-").reverse().join("/");
    const formattedToDate = searchParams?.toDate?.split("-").reverse().join("/");

    const { data: resultData, isFetching } = useGetDatewiseDetailedReportQuery(
        searchParams
            ? {
                params: {
                    deviceId: searchParams.deviceCode,
                    fromCode: searchParams.fromCode,
                    toCode: searchParams.toCode,
                    fromDate: formattedFromDate,
                    toDate: formattedToDate,
                    shift: searchParams.shift,
                    page: currentPage,
                    limit: recordsPerPage,
                },
            }
            : skipToken
    );

    const records = resultData?.data || [];
    const totalCount = resultData?.totalCount;

    const [triggerGetAllSummary, { isLoading: isExporting }] = useLazyGetDatewiseDetailedReportQuery();

    const handleExportCSV = async () => {
        if (!searchParams) {
            alert("Please search and select filters first.");
            return;
        }
        const formattedFromDate = searchParams.fromDate.split("-").reverse().join("/");
        const formattedToDate = searchParams.toDate.split("-").reverse().join("/");
        let allData;
        try {
            const result = await triggerGetAllSummary({
                params: {
                    deviceId: searchParams.deviceCode,
                    fromCode: searchParams.fromCode,
                    toCode: searchParams.toCode,
                    fromDate: formattedFromDate,
                    toDate: formattedToDate,
                    shift: searchParams.shift,
                    page: 1,
                    limit: 10000,
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
        let csvData = [];
        allData?.forEach((record) => {
            record?.milktypeStats.forEach((stat) => {
                csvData.push({
                    Date: record?.date,
                    Shift: record?.shift,
                    "Milk Type": stat?.milktype === 'ALL' ? '**ALL**' : stat?.milktype,
                    "Samples": stat?.totalSamples,
                    "Avg FAT": stat?.avgFat?.toFixed(1),
                    "Avg SNF": stat?.avgSnf?.toFixed(1),
                    "Avg CLR": stat?.avgClr?.toFixed(1),
                    "Avg Rate": stat?.avgRate?.toFixed(2),
                    "Total Qty": stat?.totalQty?.toFixed(2),
                    "Total Amount": stat?.totalAmount?.toFixed(2),
                    "Incentive": stat?.totalIncentive?.toFixed(2),
                    "Grand Total": stat?.grandTotal?.toFixed(2),
                });
            });
            csvData.push({});
        });
        const csvContent = Papa.unparse(csvData);
        saveAs(new Blob([csvContent], { type: "text/csv;charset=utf-8" }), `${getToday()}_${searchParams.deviceCode}_milktype_summary.csv`);
    };

    const handleExportPDF = async () => {
        if (!searchParams) {
            alert("Please search and select filters first.");
            return;
        }
        const formattedFromDate = searchParams.fromDate.split("-").reverse().join("/");
        const formattedToDate = searchParams.toDate.split("-").reverse().join("/");
        let allData;
        try {
            const result = await triggerGetAllSummary({
                params: {
                    deviceId: searchParams.deviceCode,
                    fromCode: searchParams.fromCode,
                    toCode: searchParams.toCode,
                    fromDate: formattedFromDate,
                    toDate: formattedToDate,
                    shift: searchParams.shift,
                    page: 1,
                    limit: 10000,
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
        let currentY = 10;
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        const header = "Milk Type Summary Report";
        doc.text(header, (pageWidth - doc.getTextWidth(header)) / 2, currentY);
        currentY += 10;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Device Code: ${searchParams.deviceCode}`, 14, currentY);
        currentY += 6;
        doc.text(`Date: ${searchParams.fromDate} to ${searchParams.toDate}`, 14, currentY);
        currentY += 8;
        allData.forEach((record, recordIndex) => {
            if (recordIndex > 0) currentY += 6;
            doc.setFont("helvetica", "bold");
            doc.text(`Date: ${record.date} | Shift: ${record.shift}`, 14, currentY);
            currentY += 6;
            const tableData = record.milktypeStats?.map((stat) => ([
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
            ]));
            autoTable(doc, {
                head: [[
                    "Milk Type", "Samples", "Avg FAT", "Avg SNF", "Avg CLR", "Avg Rate",
                    "Total Qty", "Total Amount", "Incentive", "Grand Total"
                ]],
                body: tableData,
                startY: currentY,
                styles: { fontSize: 9 },
                theme: "grid",
                didParseCell: function (data) {
                    if (data.section === 'body' && data.row.raw[0] && String(data.row.raw[0]).toUpperCase() === 'ALL') {
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
            });
            currentY = (doc.lastAutoTable?.finalY || currentY) + 10;
        });
        doc.save(`${getToday()}_${searchParams.deviceCode}_milktype_summary.pdf`);
    };

    return (
        <div className="datewise-detailed-page" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '30px 0' }}>
            <div className="container" style={{ maxWidth: 1400 }}>
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

                {totalCount > 0 && (
                    <div className="mb-3">
                        <ExportButtonsSection
                            handleExportCSV={handleExportCSV}
                            handleExportPDF={handleExportPDF}
                            isFetching={isFetching}
                            isExporting={isExporting}
                        />
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
                ) : records?.length === 0 ? (
                    <Card className="shadow mb-4 records-card" style={{ borderRadius: 16, background: 'rgba(255,255,255,0.98)' }}>
                        <Card.Body className="cardbodyCss">
                            <div className="text-center text-muted">No summary data available.</div>
                        </Card.Body>
                    </Card>
                ) : (
                    records?.map((record, index) => (
                        <Card key={index} className="mb-4" style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.98)' }}>
                            <div className="records-header-section d-flex table-header justify-content-between align-items-center px-1 py-1 mb-4">
                                <div className="fw-semibold" style={{ minWidth: 120, fontSize: '1.00rem' }}>
                                    Device Code: <span>{searchParams?.deviceCode}</span> {/* ✅ changed */}
                                </div>
                                <div className="flex-grow-1 text-center">
                                    SUMMARY REPORT
                                </div>
                                <div className="fw-semibold text-end" style={{ minWidth: 220, fontSize: '1.00rem' }}>
                                    Date: <span>{record.date}</span>
                                    <span className="mx-2">|</span>
                                    Shift: <span>{record.shift}</span>
                                </div>
                            </div>
                            <table className="section-table" style={{ padding: 10, width: '100%' }}>
                                <tbody>
                                    {record?.milktypeStats?.length > 0 && (
                                        <tr style={record.milktypeStats[0].milktype === 'ALL' ? { fontWeight: 'bold' } : {}}>
                                            <td colSpan="9" style={{ padding: 0, background: '#f9fafb' }}>
                                                <SummaryTotalsSection milktypeStats={record.milktypeStats} showHeader={false} />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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

export default DatewiseSummaryRecords;
