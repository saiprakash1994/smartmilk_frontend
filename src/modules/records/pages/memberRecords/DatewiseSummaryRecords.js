import {
    faFileCsv,
    faFilePdf,
    faSearch,
    faFilter,
    faMicrochip,
    faUser,
    faCalendarAlt,
    faClock
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
    const totalPages = Math.ceil(totalCount / recordsPerPage);

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



    return (
        <div className="records-container">
            <Card className="filter-card mb-4">
                <Card.Header className="filter-card-header">
                    <FontAwesomeIcon icon={faFilter} className="me-2" />
                    Filter Datewise Summary Records
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
                                                    <option key={dev.deviceid} value={dev.deviceid}>
                                                        {dev.deviceid}
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
                                            >{`${code.CODE} - ${code.MEMBERNAME}`}</option>
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
                                        {memberCodes.map((code, idx) => (
                                            <option
                                                key={idx}
                                                value={code.CODE}
                                            >{`${code.CODE} - ${code.MEMBERNAME}`}</option>
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
                                        <Card key={index} className="mb-4">
                                            <Card.Header className="results-card-header">
                                                <strong>Date:</strong> {record.date} &nbsp; | &nbsp;
                                                <strong>Shift:</strong> {record.shift}
                                            </Card.Header>
                                            <Card.Body>
                                                <Table hover responsive className="records-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Milk Type</th>
                                                            <th>Samples</th>
                                                            <th>Avg FAT</th>
                                                            <th>Avg SNF</th>
                                                            <th>Total Qty (L)</th>
                                                            <th>Avg Rate</th>
                                                            <th>Total Amount</th>
                                                            <th>Incentive</th>
                                                            <th>Grand Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {record.milktypeStats.map((stat, statIndex) => (
                                                            <tr key={statIndex}>
                                                                <td>
                                                                    <Badge bg={stat.milktype === 'COW' ? 'info' : 'warning'} text="dark">
                                                                        {stat.milktype}
                                                                    </Badge>
                                                                </td>
                                                                <td>{stat.totalSamples}</td>
                                                                <td>{stat.avgFat.toFixed(2)}</td>
                                                                <td>{stat.avgSnf.toFixed(2)}</td>
                                                                <td>{stat.totalQty.toFixed(2)} L</td>
                                                                <td>₹{stat.avgRate.toFixed(2)}</td>
                                                                <td>₹{stat.totalAmount.toFixed(2)}</td>
                                                                <td>₹{stat.totalIncentive.toFixed(2)}</td>
                                                                <td>₹{stat.grandTotal.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </Card.Body>
                                        </Card>
                                    ))
                                )}
                                <hr />

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
    )
}

export default DatewiseSummaryRecords;
