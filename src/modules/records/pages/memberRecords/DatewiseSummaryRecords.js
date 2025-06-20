import {
    faFileCsv,
    faFilePdf,
    faSearch,
    faDesktop,
    faUser,
    faCalendar,
    faClock,
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
import { useGetDatewiseDetailedReportQuery } from "../../store/recordEndPoint";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { skipToken } from "@reduxjs/toolkit/query";
import { InputGroup } from "react-bootstrap";
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
                    deviceId: searchParams?.deviceCode,
                    fromCode: searchParams?.fromCode,
                    toCode: searchParams?.toCode,
                    fromDate: formattedFromDate,
                    toDate: formattedToDate,
                    shift: searchParams?.shift,
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

        let csvData = [];

        records?.forEach((record) => {
            record?.milktypeStats.forEach((stat) => {
                csvData.push({
                    Date: record?.date,
                    Shift: record?.shift,
                    "Milk Type": stat?.milktype,
                    "Samples": stat?.totalSamples,
                    "Avg FAT": stat?.avgFat?.toFixed(2),
                    "Avg SNF": stat?.avgSnf?.toFixed(2),
                    "Avg Rate": stat?.avgRate?.toFixed(2),
                    "Total Qty": stat?.totalQty?.toFixed(2),
                    "Total Amount": stat?.totalAmount?.toFixed(2),
                    "Incentive": stat?.totalIncentive?.toFixed(2),
                    "Grand Total": stat?.grandTotal?.toFixed(2),
                });
            });
        });

        const csvContent = Papa.unparse(csvData);
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `${getToday()}_${deviceCode}_milktype_summary.csv`);
    };


    const handleExportPDF = () => {
        if (!records?.length) {
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
        doc.text(`Device Code: ${deviceCode}`, 14, currentY);
        currentY += 6;
        doc.text(`Date: ${fromDate} to ${toDate}`, 14, currentY);
        currentY += 8;

        records.forEach((record, recordIndex) => {
            if (recordIndex > 0) currentY += 6;

            doc.setFont("helvetica", "bold");
            doc.text(`Date: ${record.date} | Shift: ${record.shift}`, 14, currentY);
            currentY += 6;

            const tableData = record.milktypeStats?.map((stat) => ([
                stat?.milktype,
                stat?.totalSamples,
                stat?.avgFat.toFixed(2),
                stat?.avgSnf.toFixed(2),
                stat?.avgRate.toFixed(2),
                stat?.totalQty.toFixed(2),
                stat?.totalAmount.toFixed(2),
                stat?.totalIncentive.toFixed(2),
                stat?.grandTotal.toFixed(2),
            ]));

            autoTable(doc, {
                head: [[
                    "Milk Type", "Samples", "Avg FAT", "Avg SNF", "Avg Rate",
                    "Total Qty", "Total Amount", "Incentive", "Grand Total"
                ]],
                body: tableData,
                startY: currentY,
                styles: { fontSize: 9 },
                theme: "grid",
            });

            currentY = (doc.lastAutoTable?.finalY || currentY) + 10;
        });

        doc.save(`${getToday()}_${deviceCode}_milktype_summary.pdf`);
    };

    // Add isExporting state for compatibility (set to false if not used)
    const isExporting = false;

    return (
        <>
            {/* <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="DATEWISE SUMMARY RECORDS" pageItems={0} />
            </div> */}

            <div className="datewise-detailed-page" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '30px 0' }}>
                <div className="container" style={{ maxWidth: 1400 }}>
                    <Card className="mb-4 shadow filters-card" style={{ borderRadius: 16, padding: 24, background: 'rgba(255,255,255,0.97)' }}>
                        <FilterSection
                            isAdmin={isAdmin}
                            isDairy={isDairy}
                            isDevice={isDevice}
                            isAdminLoading={isAdminLoading}
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

                    {/* Actions Section: Export and Rows Per Page */}
                    {totalCount > 0 && (
                        <div className="mb-3">
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
                    ) : records?.length === 0 ? (
                        <Card className="shadow mb-4 records-card" style={{ borderRadius: 16, background: 'rgba(255,255,255,0.98)' }}>
                            <Card.Body className="cardbodyCss">
                                <div className="text-center text-muted">No summary data available.</div>
                            </Card.Body>
                        </Card>
                    ) : (
                        records?.map((record, index) => (
                            <Card key={index} className="mb-4" style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.98)' }}>
                                <table className="section-table" style={{ padding: 10, width: '100%' }}>
                                    <tbody>
                                        <tr className="table-group-header">
                                            <td colSpan="9">
                                                <div className="group-header-card d-flex justify-content-between align-items-center">
                                                    <span className="group-header-title">Date: {record.date}</span>
                                                    <span className="group-header-title">Summary Report</span>
                                                    <span className="group-header-title">Shift: {record.shift}</span>
                                                </div>
                                            </td>
                                        </tr>
                                      
                                        {record?.milktypeStats?.length > 0 && (
                                            <tr>
                                                <td colSpan="9" style={{ padding: 0, background: '#f9fafb' }}>
                                                    <SummaryTotalsSection milktypeStats={record.milktypeStats} showHeader={false}/>
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

        </>

    )
}

export default DatewiseSummaryRecords;
