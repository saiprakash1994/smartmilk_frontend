import { faFileCsv, faSearch, faUsers, faDesktop, faCalendar, faList, faTint, faEye, faMicrochip, faCalendarDays, faClock, faBuilding } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Table from "react-bootstrap/esm/Table";
import Card from "react-bootstrap/esm/Card";
import Button from "react-bootstrap/esm/Button";
import Form from "react-bootstrap/esm/Form";
import Spinner from "react-bootstrap/esm/Spinner";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { useGetDeviceByCodeQuery, useGetAllDevicesQuery } from "../../../device/store/deviceEndPoint";
import { roles } from "../../../../shared/utils/appRoles";
import './DeviceRecords.scss';
import { useLazyGetAllRecordsQuery } from "../../store/recordEndPoint";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons/faFilePdf";
import InputGroup from "react-bootstrap/esm/InputGroup";
import DeviceRecordsFilterSection from "../DeviceRecordsFilterSection";
import ExportButtonsSection from "../ExportButtonsSection";
import DeviceRecordsTotalsSection from "../../DeviceRecordsTotalsSection";
import debounce from 'lodash.debounce';


const getToday = () => {
    return new Date().toISOString().split("T")[0];
};

// Helper to format date as dd/mm/yyyy
const formatDateDMY = (dateStr) => {
    if (!dateStr) return '';
    // If already in dd/mm/yyyy, return as is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    // mm-dd-yyyy
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [month, day, year] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    // yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    // Fallback: try Date parsing
    const d = new Date(dateStr);
    if (!isNaN(d)) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    return dateStr;
};

const DeviceRecords = () => {
    const navigate = useNavigate();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const userType = UserTypeHook();

    const isDairy = userType === roles.DAIRY;
    const isDevice = userType === roles.DEVICE;

    const deviceid = userInfo?.deviceid;
    const dairyCode = userInfo?.dairyCode;

    const { data: dairyDevices = [] } = useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy || !dairyCode });
    const [triggerGetRecords, { isLoading: isFetching }] = useLazyGetAllRecordsQuery();

    const deviceList = isDairy ? dairyDevices : [];

    // Filter input states
    const [filterDeviceCode, setFilterDeviceCode] = useState('');
    const [filterDate, setFilterDate] = useState(getToday());
    const [filterShift, setFilterShift] = useState('');
    const [filterMilkTypeFilter, setFilterMilkTypeFilter] = useState('ALL');
    const [filterViewMode, setFilterViewMode] = useState('ALL');

    // Applied/search states
    const [deviceCode, setDeviceCode] = useState('');
    const [date, setDate] = useState(getToday());
    const [shift, setShift] = useState('');
    const [milkTypeFilter, setMilkTypeFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState('ALL');
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [allRecords, setAllRecords] = useState([]);
    const [totals, setTotals] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        if (isDevice && deviceid) {
            setFilterDeviceCode(deviceid);
            setDeviceCode(deviceid);
        }
    }, [isDevice, deviceid]);

    const handleSearch = async () => {
        // Copy filter states to applied states
        setDeviceCode(filterDeviceCode);
        setDate(filterDate);
        setShift(filterShift);
        setMilkTypeFilter(filterMilkTypeFilter);
        setViewMode(filterViewMode);
        setRecordsPerPage(recordsPerPage);

        if (!filterDeviceCode || !filterDate) {
            errorToast("Please select device and date");
            return;
        }
        const today = new Date().toISOString().split("T")[0];
        if (filterDate > today) {
            errorToast("Future dates are not allowed.");
            return;
        }

        const formattedDate = filterDate.split("-").reverse().join("/");

        try {
            const result = await triggerGetRecords({
                params: {
                    date: formattedDate,
                    deviceCode: filterDeviceCode,
                    ...(filterShift && { shift: filterShift }),
                    page: 1,
                    limit: 10000, // Fetch all for client-side pagination
                },
            }).unwrap();
            setAllRecords(result?.records || []);
            setTotals(result?.totals || []);
            setTotalCount(result?.records?.length || 0);
            setHasSearched(true);
            setCurrentPage(1); // Reset to first page
            successToast("Data loaded successfully!");
        } catch (err) {
            if (err?.status === 429) {
                errorToast("You are making requests too quickly. Please wait and try again.");
            } else {
                console.error(err);
                errorToast("Failed to fetch data");
            }
        }
    };

    const handleShowAll = async () => {
        const result = await triggerGetRecords({
            params: {
                date: date,
                deviceCode: deviceCode,
                ...(shift && { shift }),
                page: 1,
                limit: 10000,
            }
        }).unwrap();
        setAllRecords(result?.records || []);
        setTotals(result?.totals || []);
        setTotalCount(result?.pagination?.totalRecords || 0);
    };

    // Use allRecords for client-side pagination and sorting
    const filteredRecords = milkTypeFilter === "ALL"
        ? allRecords
        : allRecords?.filter(record => record?.MILKTYPE === milkTypeFilter);

    const filteredTotals = milkTypeFilter === "ALL"
        ? totals?.filter(t => t._id.milkType !== "TOTAL")
        : totals?.filter(t => t._id.milkType === milkTypeFilter);

    const shiftOrder = { 'MORNING': 1, 'EVENING': 2 };
    const sortedRecords = [...filteredRecords].sort((a, b) => {
        // Parse SAMPLEDATE to Date objects, fallback to string compare if invalid
        const dateA = new Date(a.SAMPLEDATE);
        const dateB = new Date(b.SAMPLEDATE);
        if (!isNaN(dateA) && !isNaN(dateB)) {
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
        } else if (a.SAMPLEDATE && b.SAMPLEDATE) {
            // Fallback to string compare if dates are invalid
            if (a.SAMPLEDATE < b.SAMPLEDATE) return -1;
            if (a.SAMPLEDATE > b.SAMPLEDATE) return 1;
        }
        // If dates are equal or missing, sort by shift order
        const shiftA = shiftOrder[a.SHIFT?.toUpperCase()] || 99;
        const shiftB = shiftOrder[b.SHIFT?.toUpperCase()] || 99;
        if (shiftA !== shiftB) return shiftA - shiftB;
        // If still equal, sort by CODE (numeric, fallback to string)
        const codeA = Number(a.CODE);
        const codeB = Number(b.CODE);
        if (!isNaN(codeA) && !isNaN(codeB)) {
            return codeA - codeB;
        }
        return String(a.CODE || '').localeCompare(String(b.CODE || ''));
    });

    // Client-side pagination
    const paginatedRecords = sortedRecords.slice(
        (currentPage - 1) * recordsPerPage,
        currentPage * recordsPerPage
    );

    const handleExportCSV = async () => {
        if (!deviceCode || !date) {
            alert("Please select device and date");
            return;
        }
        // Fetch all records for export
        let allRecords = [];
        let allTotals = [];
        try {
            const formattedDate = date.split("-").reverse().join("/");
            const result = await triggerGetRecords({
                params: {
                    date: formattedDate,
                    deviceCode,
                    ...(shift && { shift }),
                    page: 1,
                    limit: 10000, // Large number to get all records
                },
            }).unwrap();
            allRecords = result?.records || [];
            allTotals = result?.totals || [];
        } catch (err) {
            if (err?.status === 429) {
                alert("You are making requests too quickly. Please wait and try again.");
            } else {
                alert("Failed to fetch all records for export.");
            }
            return;
        }
        if (!allTotals.length && !allRecords.length) {
            alert("No data available to export.");
            return;
        }
        // Sort allRecords for export
        const sortedExportRecords = [...allRecords].sort((a, b) => {
            const dateA = new Date(a.SAMPLEDATE);
            const dateB = new Date(b.SAMPLEDATE);
            if (!isNaN(dateA) && !isNaN(dateB)) {
                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;
            } else if (a.SAMPLEDATE && b.SAMPLEDATE) {
                if (a.SAMPLEDATE < b.SAMPLEDATE) return -1;
                if (a.SAMPLEDATE > b.SAMPLEDATE) return 1;
            }
            const shiftA = shiftOrder[a.SHIFT?.toUpperCase()] || 99;
            const shiftB = shiftOrder[b.SHIFT?.toUpperCase()] || 99;
            if (shiftA !== shiftB) return shiftA - shiftB;
            const codeA = Number(a.CODE);
            const codeB = Number(b.CODE);
            if (!isNaN(codeA) && !isNaN(codeB)) {
                return codeA - codeB;
            }
            return String(a.CODE || '').localeCompare(String(b.CODE || ''));
        });
        let combinedCSV = "";
        // Records Section
        if (sortedExportRecords?.length) {
            const recordsCSVData = sortedExportRecords.map((rec, index) => ({
                "S.No": index + 1,
                "Member Code": String(rec?.CODE).padStart(4, "0"),
                "Milk Type": rec?.MILKTYPE,
                "Date": formatDateDMY(rec?.SAMPLEDATE),
                "Shift": rec?.SHIFT,
                "FAT": rec?.FAT?.toFixed(1),
                "SNF": rec?.SNF?.toFixed(1),
                "CLR": rec?.CLR?.toFixed(1),
                "Qty (L)": rec?.QTY?.toFixed(2) || '0.00',
                "Rate": rec?.RATE?.toFixed(2),
                "Amount": rec?.AMOUNT?.toFixed(2) || '0.00',
                "Incentive": rec?.INCENTIVEAMOUNT?.toFixed(2),
                "Total": rec?.TOTAL?.toFixed(2),
                "Analyzer": rec?.ANALYZERMODE,
                "Weight Mode": rec?.WEIGHTMODE,
                "Device ID": rec?.DEVICEID
            }));
            combinedCSV += `Device Code:${deviceCode}\n`;
            combinedCSV += `Date: ${formatDateDMY(date)}\n`;
            combinedCSV += Papa.unparse(recordsCSVData);
            combinedCSV += "\n\n";
        }
        // Totals Section (no shift sorting needed)
        if (allTotals?.length) {
            const totalsCSVData = allTotals.map(item => ({
                "Milk Type": item._id?.milkType || '',
                "Total Records": item.totalRecords,
                "Average FAT": item.averageFat,
                "Average SNF": item.averageSNF,
                "Average CLR": item.averageCLR,
                "Total Quantity": item.totalQuantity?.toFixed(2) || '0.00',
                "Average Rate": item.averageRate,
                "Total Amount": item.totalAmount?.toFixed(2) || '0.00',
                "Total Incentive": item.totalIncentive?.toFixed(2) || '0.00',
                "Grand Total": ((item.totalAmount || 0) + (item.totalIncentive || 0)).toFixed(2),
            }));
            combinedCSV += `Milk Totals for ${deviceCode}\n`;
            combinedCSV += `Date: ${formatDateDMY(date)}\n`;
            combinedCSV += Papa.unparse(totalsCSVData);
        }
        const blob = new Blob([combinedCSV], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `Daywise_Report_${deviceCode}_${formatDateDMY(date)}.csv`);
    };
    const handleExportPDF = async () => {
        if (!deviceCode || !date) {
            alert("Please select device  and date");
            return;
        }

        // Fetch all records for export
        let allRecords = [];
        let allTotals = [];
        try {
            const formattedDate = date.split("-").reverse().join("/");
            const result = await triggerGetRecords({
                params: {
                    date: formattedDate,
                    deviceCode,
                    ...(shift && { shift }),
                    page: 1,
                    limit: 10000, // Large number to get all records
                },
            }).unwrap();
            allRecords = result?.records || [];
            allTotals = result?.totals || [];
        } catch (err) {
            if (err?.status === 429) {
                alert("You are making requests too quickly. Please wait and try again.");
            } else {
                alert("Failed to fetch all records for export.");
            }
            return;
        }

        if (!allTotals.length && !allRecords.length) {
            alert("No data available to export.");
            return;
        }

        const doc = new jsPDF();
        let currentY = 10;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Daywise Report - ${deviceCode}`, 14, currentY);
        currentY += 8;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Date: ${formatDateDMY(date)} | Shift: ${shift || 'ALL'} | Milk Type: ${milkTypeFilter}`, 14, currentY);
        currentY += 8;

        // Add total records count
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Total Records: ${totalCount}`, 14, currentY);
        currentY += 8;

        // Sort allRecords for export
        const sortedExportRecords = [...allRecords].sort((a, b) => {
            const dateA = new Date(a.SAMPLEDATE);
            const dateB = new Date(b.SAMPLEDATE);
            if (!isNaN(dateA) && !isNaN(dateB)) {
                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;
            } else if (a.SAMPLEDATE && b.SAMPLEDATE) {
                if (a.SAMPLEDATE < b.SAMPLEDATE) return -1;
                if (a.SAMPLEDATE > b.SAMPLEDATE) return 1;
            }
            const shiftA = shiftOrder[a.SHIFT?.toUpperCase()] || 99;
            const shiftB = shiftOrder[b.SHIFT?.toUpperCase()] || 99;
            if (shiftA !== shiftB) return shiftA - shiftB;
            const codeA = Number(a.CODE);
            const codeB = Number(b.CODE);
            if (!isNaN(codeA) && !isNaN(codeB)) {
                return codeA - codeB;
            }
            return String(a.CODE || '').localeCompare(String(b.CODE || ''));
        });

        // Records Table
        if (sortedExportRecords?.length) {
            const recordTable = sortedExportRecords.map((rec, i) => [
                i + 1,
                String(rec?.CODE).padStart(4, "0"),
                rec?.MILKTYPE,
                formatDateDMY(rec?.SAMPLEDATE),
                rec?.SHIFT,
                rec?.FAT?.toFixed(1),
                rec?.SNF?.toFixed(1),
                rec?.CLR?.toFixed(1),
                rec?.QTY?.toFixed(2),
                rec?.RATE?.toFixed(2),
                rec?.AMOUNT?.toFixed(2),
                rec?.INCENTIVEAMOUNT?.toFixed(2),
                rec?.TOTAL?.toFixed(2)
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [[
                    "S.No", "Code", "Milk Type", "Date", "Shift", "Fat", "SNF", "CLR", "Qty (L)",
                    "Rate", "Amount", "Incentive", "Total"
                ]],
                body: recordTable,
                styles: { fontSize: 8 },
                theme: "grid"
            });

            currentY = doc.lastAutoTable.finalY + 10;
        }

        // Totals Table
        if (allTotals?.length) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Milk Totals", 14, currentY);
            currentY += 6;

            const totalsTable = allTotals.map(total => [
                total?._id?.milkType,
                total?.totalRecords,
                total?.averageFat,
                total?.averageSNF,
                total?.totalQuantity?.toFixed(2),
                total?.averageRate,
                total?.totalAmount?.toFixed(2),
                total?.totalIncentive?.toFixed(2),
                (
                    (Number(total?.totalAmount || 0) + Number(total?.totalIncentive || 0))
                ).toFixed(2)
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [[
                    "Milk Type", "Total Records", "Avg FAT", "Avg SNF", "Total Qty",
                    "Avg Rate", "Total Amount", "Incentive", "Grand Total"
                ]],
                body: totalsTable,
                theme: "striped",
                styles: { fontSize: 9 },
            });
        }

        doc.save(`Daywise_Report_${deviceCode}_${formatDateDMY(date)}.pdf`);
    };

    const isExporting = false;

    // Debounce handleSearch to prevent rapid API calls
    const debouncedHandleSearch = debounce(handleSearch, 600, { leading: true, trailing: false });

    return (
        <div className="datewise-detailed-page" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '30px 0' }}>
            <div className="container" style={{ maxWidth: 1400 }}>
                <Card className="mb-4 shadow filters-card" style={{ borderRadius: 16, padding: 24, background: 'rgba(255,255,255,0.97)' }}>
                    <DeviceRecordsFilterSection
                        isAdmin={false}
                        isDairy={isDairy}
                        isDevice={isDevice}
                        isAdminLoading={false}
                        isDairyLoading={false}
                        isDeviceLoading={false}
                        deviceList={deviceList}
                        filterDeviceCode={filterDeviceCode}
                        setFilterDeviceCode={setFilterDeviceCode}
                        deviceCode={deviceCode}
                        filterDate={filterDate}
                        setFilterDate={setFilterDate}
                        filterShift={filterShift}
                        setFilterShift={setFilterShift}
                        filterMilkTypeFilter={filterMilkTypeFilter}
                        setFilterMilkTypeFilter={setFilterMilkTypeFilter}
                        filterViewMode={filterViewMode}
                        setFilterViewMode={setFilterViewMode}
                        handleSearch={debouncedHandleSearch}
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
                {!hasSearched ? (
                    <Card className="records-card text-center my-5 text-muted">
                        <Card.Body>
                            Please apply filters and click <strong>Search</strong> to view records.
                        </Card.Body>
                    </Card>
                ) : isFetching ? (
                    <Card className="records-card text-center my-5">
                        <Card.Body>
                            <Spinner animation="border" variant="primary" />
                        </Card.Body>
                    </Card>
                ) : (
                    <>
                        <Card className="h-100">
                            <Card.Body className="cardbodyCss">


                                {viewMode !== "TOTALS" && (
                                    <Card className="records-card mb-4 shadow" style={{ borderRadius: 16, background: 'rgba(255,255,255,0.97)', padding: 12 }}>
                                        {/* Modern Gradient Header Section */}
                                        <div className="d-flex justify-content-between align-items-center px-3 py-3 mb-4"
                                            style={{
                                                gap: 16,
                                                borderRadius: 12,
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                color: '#fff',
                                                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.10)'
                                            }}>
                                            <div className="fw-semibold" style={{ minWidth: 120, fontSize: '1.08rem' }}>
                                                Device Code: <span style={{ color: '#fff', fontWeight: 700 }}>{deviceCode}</span>
                                            </div>
                                            <div className="flex-grow-1 text-center" style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: 1 }}>
                                                DAYWISE REPORT
                                            </div>
                                            <div className="fw-semibold text-end" style={{ minWidth: 220, fontSize: '1.08rem' }}>
                                                Date: <span style={{ color: '#fff', fontWeight: 700 }}>{formatDateDMY(date)}</span>
                                                <span className="mx-2">|</span>
                                                Shift: <span style={{ color: '#fff', fontWeight: 700 }}>{shift || 'ALL'}</span>
                                            </div>
                                        </div>
                                        <div className="table-responsive">
                                            <Table className="records-table" hover responsive>
                                                <thead>

                                                    <tr>
                                                        <th>#</th>
                                                        <th>Code</th>
                                                        <th>Milk Type</th>
                                                        <th>Date</th>
                                                        <th>Shift</th>
                                                        <th>FAT</th>
                                                        <th>SNF</th>
                                                        <th>CLR</th>
                                                        <th>Qty</th>
                                                        <th>Rate</th>
                                                        <th>Amount</th>
                                                        <th>Incentive</th>
                                                        <th>Total</th>
                                                        <th>AnalyzerMode</th>
                                                        <th>WeightMode</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedRecords?.length > 0 ? (
                                                        paginatedRecords?.map((record, index) => (
                                                            <tr key={record._id}>
                                                                <td>{index + 1}</td>
                                                                <td>{String(record?.CODE).padStart(4, "0")}</td>
                                                                <td>{record?.MILKTYPE}</td>
                                                                <td>{record?.SAMPLEDATE}</td>
                                                                <td>{record?.SHIFT}</td>
                                                                <td>{record?.FAT.toFixed(1)}</td>
                                                                <td>{record?.SNF.toFixed(1)}</td>
                                                                <td>{record?.CLR.toFixed(1)}</td>
                                                                <td>{record?.QTY.toFixed(2)}</td>
                                                                <td>₹{record?.RATE.toFixed(2)}</td>
                                                                <td>₹{record?.AMOUNT.toFixed(2)}</td>
                                                                <td>₹{record?.INCENTIVEAMOUNT.toFixed(2)}</td>
                                                                <td>₹{record?.TOTAL.toFixed(2)}</td>
                                                                <td>{record?.ANALYZERMODE}</td>
                                                                <td>{record?.WEIGHTMODE}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="13" className="text-center">No records found</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                        {/* Pagination Controls */}
                                        {totalCount > 0 && (
                                            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="text-muted">Rows per page:</span>
                                                    <Form.Select
                                                        size="sm"
                                                        style={{ width: 'auto' }}
                                                        value={recordsPerPage}
                                                        onChange={e => {
                                                            setRecordsPerPage(Number(e.target.value));
                                                            setCurrentPage(1);
                                                        }}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                        <option value={100}>100</option>
                                                    </Form.Select>
                                                </div>
                                                <div className="flex-grow-1 text-center fw-semibold">
                                                    Page {currentPage} of {Math.max(1, Math.ceil(totalCount / recordsPerPage))}
                                                </div>
                                                <div className="d-flex align-items-center gap-2 justify-content-end">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-2"
                                                        disabled={currentPage === 1}
                                                        onClick={() => setCurrentPage(currentPage - 1)}
                                                    >
                                                        Previous
                                                    </Button>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        disabled={currentPage >= Math.ceil(totalCount / recordsPerPage)}
                                                        onClick={() => setCurrentPage(currentPage + 1)}
                                                    >
                                                        Next
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                )}

                                {viewMode !== "RECORDS" && (
                                    <Card className="totals-card mb-4">
                                        <Card.Body>
                                            <DeviceRecordsTotalsSection filteredTotals={filteredTotals} />
                                        </Card.Body>
                                    </Card>
                                )}
                            </Card.Body>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
};

export default DeviceRecords;
