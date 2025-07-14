import {
    faFileCsv,
    faFilePdf,
    faSearch,
    faFilter,
    faMicrochip,
    faUser,
    faCalendarAlt,
    faClock,
    faCow,
    faHippo
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Table, Card, Button, Form, Spinner, Row, Col, Badge, Pagination } from "react-bootstrap";
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
import '../../Records.scss';

const getToday = () => {
    return new Date().toISOString().split("T")[0];
};

const DailyRecordCard = ({ record, deviceCode }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [milkTypeFilter, setMilkTypeFilter] = useState('ALL');

    const filteredRecords = record.records.filter(r =>
        (milkTypeFilter === 'ALL' || r.MILKTYPE === milkTypeFilter) &&
        String(r.CODE).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card className="mb-4">
            <Card.Header className="results-card-header d-flex justify-content-between align-items-center">
                <div >
                    <span className="fw-semibold me-2">Date: {record?.date}</span> | &nbsp;
                    <span className="fw-semibold me-2">Shift: {record?.shift}</span>  | &nbsp;
                    <span className="fw-semibold me-2">Device Id:{deviceCode}</span>
                </div>
                <Form.Group style={{ width: '250px' }}>
                    <Form.Control
                        type="text"
                        placeholder="Search by Member Code..."
                        className="form-control-modern"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Form.Group>
            </Card.Header>
            <Card.Body>
                {/* Filter Bar */}
                <div className="filter-buttons-group mb-3 d-flex align-items-center">
                    <Button
                        variant={milkTypeFilter === 'ALL' ? 'primary' : 'outline-secondary'}
                        className={`me-2 btn ${milkTypeFilter === 'ALL' ? 'active' : ''}`}
                        onClick={() => setMilkTypeFilter('ALL')}
                    >
                        <FontAwesomeIcon icon={faUser} className="fa-icon me-1" />All
                    </Button>
                    <Button
                        variant={milkTypeFilter === 'COW' ? 'info' : 'outline-info'}
                        className={`me-2 btn ${milkTypeFilter === 'COW' ? 'active cow' : ''}`}
                        onClick={() => setMilkTypeFilter('COW')}
                    >
                        <FontAwesomeIcon icon={faCow} className="fa-icon me-1" />Cow
                    </Button>
                    <Button
                        variant={milkTypeFilter === 'BUF' ? 'warning' : 'outline-warning'}
                        className={`btn ${milkTypeFilter === 'BUF' ? 'active buf' : ''}`}
                        onClick={() => setMilkTypeFilter('BUF')}
                    >
                        <FontAwesomeIcon icon={faHippo} className="fa-icon me-1" />Buffalo
                    </Button>
                </div>
                {/* Card Grid for Member Records */}
                {filteredRecords.length > 0 ? (
                    <div className="records-card-grid">
                        {filteredRecords.map((stat, statIndex) => (
                            <div
                                className={`record-card ${stat.MILKTYPE === 'COW' ? 'cow' : stat.MILKTYPE === 'BUF' ? 'buf' : 'other'}`}
                                key={statIndex}
                                tabIndex={0}
                                aria-label={`Milk type ${stat.MILKTYPE} member record card`}
                                style={{ minHeight: 240, boxShadow: '0 6px 24px 0 rgba(99,102,241,0.10)', transition: 'box-shadow 0.2s, transform 0.2s', outline: 'none' }}
                                onMouseOver={e => e.currentTarget.style.boxShadow = '0 12px 32px 0 rgba(99,102,241,0.18)'}
                                onMouseOut={e => e.currentTarget.style.boxShadow = '0 6px 24px 0 rgba(99,102,241,0.10)'}
                            >
                                <div
                                    className="record-card-header"
                                    style={{
                                        background: stat.MILKTYPE === 'COW'
                                            ? 'linear-gradient(90deg,#e0e7ff 0%,#f1f5ff 100%)'
                                            : 'linear-gradient(90deg,#fff7ed 0%,#fef6e4 100%)',
                                        borderBottom: '1.5px solid #e0e7ef',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.7em'
                                    }}
                                >
                                    <FontAwesomeIcon icon={stat.MILKTYPE === 'COW' ? faCow : faHippo} style={{ fontSize: '2rem', opacity: 0.85 }} />
                                    <span style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.02em' }}>{stat.MILKTYPE}</span>
                                    <Badge bg={stat.MILKTYPE === 'COW' ? 'info' : 'warning'} text="dark" style={{ fontSize: '1em', marginLeft: 'auto' }}>{stat.MILKTYPE}</Badge>
                                </div>
                                <div className="px-3 py-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5em 1.2em', alignItems: 'center' }}>
                                    <div><b>Code:</b> {stat.CODE}</div>
                                    <div><b>FAT:</b> {stat.FAT?.toFixed(1)}</div>
                                    <div><b>SNF:</b> {stat.SNF?.toFixed(1)}</div>
                                    <div><b>CLR:</b> {stat.CLR?.toFixed(1)}</div>
                                    <div><b>Qty:</b> {stat.QTY.toFixed(2)} L</div>
                                    <div><b>Rate:</b> ₹{stat.RATE?.toFixed(2)}</div>
                                    <div><b>Total:</b> ₹{stat.TOTALAMOUNT?.toFixed(2)}</div>
                                    <div><b>Incentive:</b> ₹{stat.INCENTIVEAMOUNT?.toFixed(2)}</div>
                                    <div style={{ gridColumn: '1 / span 2', marginTop: '0.5em', textAlign: 'center' }}>
                                        <span className="record-total" style={{ fontSize: '1.4em', color: '#22c55e', fontWeight: 700 }}>
                                            Grand Total: ₹{(Number(stat.TOTALAMOUNT) + Number(stat.INCENTIVEAMOUNT)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted my-4">
                        {searchTerm ? "No members found matching your search." : "No records for this period."}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
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
        useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy || !dairyCode });

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
    const totalPages = Math.ceil(totalCount / recordsPerPage);

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
                    CLR: stat?.CLR,

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
                    AvgCLR: stat?.avgClr.toFixed(2),

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
                    stat?.CLR,

                    stat?.RATE,
                    stat?.QTY,
                    stat?.INCENTIVEAMOUNT,
                    stat?.TOTALAMOUNT,
                ]);

                autoTable(doc, {
                    head: [[
                        "Code", "Milk Type", "FAT", "SNF", "CLR", "Rate", "Qty", "Incentive", "Total"
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
                    stat?.avgClr.toFixed(2),

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

        doc.save(`${getToday()}_${deviceCode}_datewise_detailed.pdf`);
    };

    return (
        <div className="records-container">
            <Card className="filter-card mb-4">
                <Card.Header className="filter-card-header">
                    <FontAwesomeIcon icon={faFilter} className="me-2" />
                    Filter Datewise Detailed Records
                </Card.Header>
                <Card.Body>
                    <Form>
                        <Row className="align-items-end">
                            {(isAdmin || isDairy) && (
                                <Col md={2}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faMicrochip} className="me-2" />Select Device</Form.Label>
                                        {isAdminLoading || isDairyLoading ? (
                                            <Spinner animation="border" size="sm" />
                                        ) : (
                                            <Form.Select
                                                className="form-select-modern"
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
                                        )}
                                    </Form.Group>
                                </Col>
                            )}

                            {isDevice && (
                                <Col md={2}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faMicrochip} className="me-2" />Device</Form.Label>
                                        {isDeviceLoading ? (
                                            <Spinner animation="border" size="sm" />
                                        ) : (
                                            <Form.Control className="form-control-modern" type="text" value={deviceCode} readOnly />
                                        )}
                                    </Form.Group>
                                </Col>
                            )}
                            <Col md={2}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faUser} className="me-2" />From Member</Form.Label>
                                    <Form.Select
                                        className="form-select-modern"
                                        value={fromCode}
                                        onChange={(e) => setFromCode(e.target.value)}
                                    >
                                        <option value="">Start Code</option>
                                        {memberCodes?.map((code, idx) => (
                                            <option
                                                key={idx}
                                                value={code.CODE}
                                            >{`${code?.CODE} - ${code?.MEMBERNAME}`}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faUser} className="me-2" />To Member</Form.Label>
                                    <Form.Select
                                        className="form-select-modern"
                                        value={toCode}
                                        onChange={(e) => setToCode(e.target.value)}
                                    >
                                        <option value="">End Code</option>
                                        {memberCodes?.map((code, idx) => (
                                            <option
                                                key={idx}
                                                value={code.CODE}
                                            >{`${code?.CODE} - ${code?.MEMBERNAME}`}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={2}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faCalendarAlt} className="me-2" />From Date</Form.Label>
                                    <Form.Control
                                        className="form-control-modern"
                                        type="date"
                                        value={fromDate}
                                        max={getToday()}
                                        onChange={(e) => setFromDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faCalendarAlt} className="me-2" />To Date</Form.Label>
                                    <Form.Control
                                        className="form-control-modern"
                                        type="date"
                                        value={toDate}
                                        max={getToday()}
                                        onChange={(e) => setToDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faClock} className="me-2" />Shift</Form.Label>
                                    <Form.Select className="form-select-modern" value={shift} onChange={e => setShift(e.target.value)}>
                                        <option value="BOTH">ALL Shifts</option>
                                        <option value="MORNING">MORNING</option>
                                        <option value="EVENING">EVENING</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="mt-3">
                            <Col>
                                <Button
                                    variant="primary"
                                    className="w-100 modern-button"
                                    onClick={handleSearch}
                                    disabled={isFetching}
                                >
                                    {isFetching ? (
                                        <Spinner size="sm" animation="border" />
                                    ) : (
                                        <><FontAwesomeIcon icon={faSearch} className="me-2" />Search</>
                                    )}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {searchParams && (
                <Card className="results-card">
                    <Card.Body>
                        {isFetching ? (
                            <div className="text-center my-5">
                                <Spinner animation="border" variant="primary" />
                            </div>
                        ) : (
                            <>
                                <div className="d-flex justify-content-end mb-3">
                                    <Button variant="outline-success" size="sm" className="export-button me-2" onClick={handleExportCSV}>
                                        <FontAwesomeIcon icon={faFileCsv} className="me-2" />CSV
                                    </Button>
                                    <Button variant="outline-danger" size="sm" className="export-button" onClick={handleExportPDF}>
                                        <FontAwesomeIcon icon={faFilePdf} className="me-2" />PDF
                                    </Button>
                                </div>
                                {records?.length === 0 ? (
                                    <div className="text-center text-muted">No summary data available.</div>
                                ) : (
                                    records?.map((record, index) => (
                                        <DailyRecordCard key={index} record={record} deviceCode={deviceCode} />
                                    ))
                                )}

                                {totalCount > 0 && (
                                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="text-muted">Rows per page:</span>
                                            <Form.Select
                                                size="sm"
                                                className="form-select-modern-sm"
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
                                            <Pagination>
                                                <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                                                <Pagination.Prev onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} />
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                    <Pagination.Item key={page} active={page === currentPage} onClick={() => setCurrentPage(page)}>
                                                        {page}
                                                    </Pagination.Item>
                                                ))}
                                                <Pagination.Next onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} />
                                                <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                                            </Pagination>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </Card.Body>
                </Card>
            )}
            {!searchParams && (
                <div className="text-center my-5 text-muted">
                    Please apply filters and click <strong>Search</strong> to view records.
                </div>
            )}
        </div>
    );
};

export default DatewiseDetailedRecords;
