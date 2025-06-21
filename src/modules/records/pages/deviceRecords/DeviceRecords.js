import { faFileCsv, faSearch, faUsers, faFilePdf, faCalendarAlt, faFilter, faFileExport, faMicrochip, faClock } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Table, Card, Button, Form, Spinner, Row, Col, Badge, Pagination } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { useGetDeviceByCodeQuery, useGetAllDevicesQuery } from "../../../device/store/deviceEndPoint";
import { roles } from "../../../../shared/utils/appRoles";
import '../../Records.scss';
import { useLazyGetAllRecordsQuery } from "../../store/recordEndPoint";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const getToday = () => {
    return new Date().toISOString().split("T")[0];
};

const DeviceRecords = () => {
    const navigate = useNavigate();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const userType = UserTypeHook();

    const isAdmin = userType === roles.ADMIN;
    const isDairy = userType === roles.DAIRY;
    const isDevice = userType === roles.DEVICE;

    const deviceid = userInfo?.deviceid;
    const dairyCode = userInfo?.dairyCode;

    const { data: allDevices = [] } = useGetAllDevicesQuery(undefined, { skip: !isAdmin });
    const { data: dairyDevices = [] } = useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy });
    const [triggerGetRecords, { isLoading: isFetching }] = useLazyGetAllRecordsQuery();

    const deviceList = isAdmin ? allDevices : isDairy ? dairyDevices : [];

    const [deviceCode, setDeviceCode] = useState('');
    const [date, setDate] = useState(getToday());
    const [shift, setShift] = useState('');
    const [milkTypeFilter, setMilkTypeFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [records, setRecords] = useState([]);
    const [totals, setTotals] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        if (isDevice && deviceid) {
            setDeviceCode(deviceid);
        }
    }, [isDevice, deviceid]);

    useEffect(() => {
        if (isDevice && deviceCode && date) {
            handleSearch();
        }
    }, [isDevice, deviceCode, date]);

    useEffect(() => {
        if (hasSearched) {
            handleSearch();
        }
    }, [currentPage, recordsPerPage]);

    const handleSearch = async () => {
        if (!deviceCode || !date) {
            errorToast("Please select device code and date");
            return;
        }
        const today = new Date().toISOString().split("T")[0];
        if (date > today) {
            errorToast("Future dates are not allowed.");
            return;
        }

        const formattedDate = date.split("-").reverse().join("/");

        try {
            const result = await triggerGetRecords({
                params: { date: formattedDate, deviceCode, ...(shift && { shift }), page: currentPage, limit: recordsPerPage },
            }).unwrap();
            setHasSearched(true);
            setRecords(result?.records || []);
            setTotals(result?.totals || []);
            setTotalCount(result?.pagination?.totalRecords || 0);
            if (result?.records?.length > 0) successToast("Data loaded successfully!");
        } catch (err) {
            console.error(err);
            errorToast("Failed to fetch data");
        }
    };

    const milkTypeFilteredRecords = milkTypeFilter === "ALL" ? records : records?.filter(record => record?.MILKTYPE === milkTypeFilter);

    const filteredRecords = searchTerm
        ? milkTypeFilteredRecords?.filter(record =>
            String(record?.CODE).toLowerCase().includes(searchTerm.toLowerCase())
        )
        : milkTypeFilteredRecords;

    const filteredTotals = milkTypeFilter === "ALL" ? totals?.filter(t => t._id.milkType !== "TOTAL") : totals?.filter(t => t._id.milkType === milkTypeFilter);

    const handleExportCSV = () => {
        if (!totals?.length && !records?.length) {
            alert("No data available to export.");
            return;
        }

        let combinedCSV = "";

        // Records Section
        if (records?.length) {
            const recordsCSVData = records.map((rec, index) => ({
                "S.No": index + 1,
                "Member Code": rec?.CODE,
                "Milk Type": rec?.MILKTYPE,
                "Shift": rec?.SHIFT,
                "FAT": rec?.FAT?.toFixed(1),
                "SNF": rec?.SNF?.toFixed(1),
                "Qty (L)": rec?.QTY?.toFixed(2) || '0.00',
                "Rate": rec?.RATE?.toFixed(2),
                "Amount": rec?.AMOUNT?.toFixed(2) || '0.00',
                "Incentive": rec?.INCENTIVEAMOUNT?.toFixed(2),
                "Total": rec?.TOTAL?.toFixed(2),
                "Analyzer": rec?.ANALYZERMODE,
                "Weight Mode": rec?.WEIGHTMODE,
                "Device ID": rec?.DEVICEID,
                "Date": date
            }));

            combinedCSV += `Milk Records for ${deviceCode} on ${date}\n`;
            combinedCSV += Papa.unparse(recordsCSVData);
            combinedCSV += "\n\n";
        }

        // Totals Section
        if (totals?.length) {
            const totalsCSVData = totals.map(item => ({
                "Milk Type": item._id?.milkType || '',
                "Total Records": item.totalRecords,
                "Total Quantity": item.totalQuantity?.toFixed(2) || '0.00',
                "Total Amount": item.totalAmount?.toFixed(2) || '0.00',
                "Total Incentive": item.totalIncentive?.toFixed(2) || '0.00',
                "Average FAT": item.averageFat,
                "Average SNF": item.averageSNF,
                "Average Rate": item.averageRate
            }));

            combinedCSV += `Milk Totals for ${deviceCode} on ${date}\n`;
            combinedCSV += Papa.unparse(totalsCSVData);
        }

        const blob = new Blob([combinedCSV], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `Milk_Data_${deviceCode}_${date}.csv`);
    };

    const handleExportPDF = () => {
        if (!totals?.length && !records?.length) {
            alert("No data available to export.");
            return;
        }

        const doc = new jsPDF();
        let currentY = 10;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Milk Data Report - ${deviceCode}`, 14, currentY);
        currentY += 8;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Date: ${date} | Shift: ${shift || 'ALL'} | Milk Type: ${milkTypeFilter}`, 14, currentY);
        currentY += 8;

        // Records Table
        if (records?.length) {
            const recordTable = records.map((rec, i) => [
                i + 1,
                rec?.CODE,
                rec?.MILKTYPE,
                rec?.SHIFT,
                rec?.FAT?.toFixed(1),
                rec?.SNF?.toFixed(1),
                rec?.QTY?.toFixed(2),
                rec?.RATE?.toFixed(2),
                rec?.AMOUNT?.toFixed(2),
                rec?.INCENTIVEAMOUNT?.toFixed(2),
                rec?.TOTAL?.toFixed(2)
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [[
                    "S.No", "Code", "Milk Type", "Shift", "FAT", "SNF", "Qty (L)",
                    "Rate", "Amount", "Incentive", "Total"
                ]],
                body: recordTable,
                styles: { fontSize: 8 },
                theme: "grid"
            });

            currentY = doc.lastAutoTable.finalY + 10;
        }

        // Totals Table
        if (totals?.length) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Milk Totals", 14, currentY);
            currentY += 6;

            const totalsTable = totals.map(total => [
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

        doc.save(`Milk_Data_${deviceCode}_${date}.pdf`);
    };

    const totalPages = Math.ceil(totalCount / recordsPerPage);

    return (
        <div className="records-container">
            {/* Filter Card */}
            <Card className="filter-card mb-4">
                <Card.Header className="filter-card-header">
                    <FontAwesomeIcon icon={faFilter} className="me-2" />
                    Filter Device Records
                </Card.Header>
                <Card.Body>
                    <Form>
                        <Row className="align-items-end">
                            {!isDevice && (
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faMicrochip} className="me-2" />Select Device</Form.Label>
                                        <Form.Select className="form-select-modern" value={deviceCode} onChange={e => setDeviceCode(e.target.value)}>
                                            <option value="">-- Select Device --</option>
                                            {deviceList?.map(dev => <option key={dev.deviceid} value={dev.deviceid}>{dev.deviceid}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            )}
                            <Col md={isDevice ? 4 : 3}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faCalendarAlt} className="me-2" />Select Date</Form.Label>
                                    <Form.Control className="form-control-modern" type="date" value={date} onChange={e => setDate(e.target.value)} />
                                </Form.Group>
                            </Col>
                            <Col md={isDevice ? 4 : 2}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faClock} className="me-2" />Shift</Form.Label>
                                    <Form.Select className="form-select-modern" value={shift} onChange={e => setShift(e.target.value)}>
                                        <option value="">ALL</option>
                                        <option value="MORNING">MORNING</option>
                                        <option value="EVENING">EVENING</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={isDevice ? 4 : 3}>
                                <Form.Group className="mb-3">
                                    <Form.Label>&nbsp;</Form.Label>
                                    <Button variant="primary" className="w-100 modern-button" onClick={handleSearch} disabled={isFetching}>
                                        <FontAwesomeIcon icon={faSearch} className="me-2" />
                                        {isFetching ? 'Searching...' : 'Search'}
                                    </Button>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {hasSearched && (
                <>
                    {/* Results Card */}
                    <Card className="results-card mb-4">
                        <Card.Header className="results-card-header">
                            <div className="d-flex justify-content-between align-items-center">
                                <span><FontAwesomeIcon icon={faUsers} className="me-2" />Collection Records</span>
                                <div className="d-flex align-items-center">
                                    <Form.Control
                                        type="search"
                                        placeholder="Search by Member..."
                                        className="form-control-modern me-2"
                                        style={{ width: '200px' }}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <Form.Select size="sm" className="form-select-modern-sm me-3" value={milkTypeFilter} onChange={e => setMilkTypeFilter(e.target.value)}>
                                        <option value="ALL">All Milk Types</option>
                                        <option value="COW">Cow</option>
                                        <option value="BUF">Buffalo</option>
                                    </Form.Select>
                                    <Button variant="outline-success" size="sm" className="export-button me-2" onClick={handleExportCSV}>
                                        <FontAwesomeIcon icon={faFileCsv} className="me-2" />CSV
                                    </Button>
                                    <Button variant="outline-danger" size="sm" className="export-button" onClick={handleExportPDF}>
                                        <FontAwesomeIcon icon={faFilePdf} className="me-2" />PDF
                                    </Button>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Body>
                            {isFetching ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-2">Loading Records...</p>
                                </div>
                            ) : filteredRecords.length > 0 ? (
                                <Table hover responsive className="records-table">
                                    <thead>
                                        <tr>
                                            <th>S.No</th>
                                            <th>Member</th>
                                            <th>Milk</th>
                                            <th>Shift</th>
                                            <th>FAT</th>
                                            <th>SNF</th>
                                            <th>Qty (L)</th>
                                            <th>Rate</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRecords.map((rec, index) => (
                                            <tr key={rec._id}>
                                                <td>{index + 1 + (currentPage - 1) * recordsPerPage}</td>
                                                <td>{rec?.CODE}</td>
                                                <td><Badge bg={rec?.MILKTYPE === 'COW' ? 'warning' : 'info'}>{rec?.MILKTYPE}</Badge></td>
                                                <td>{rec?.SHIFT}</td>
                                                <td>{rec?.FAT?.toFixed(1)}</td>
                                                <td>{rec?.SNF?.toFixed(1)}</td>
                                                <td>{rec?.QTY?.toFixed(2) || '0.00'}</td>
                                                <td>{rec?.RATE?.toFixed(2)}</td>
                                                <td>{rec?.AMOUNT?.toFixed(2) || '0.00'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <div className="text-center py-5">No records found for the selected criteria.</div>
                            )}
                        </Card.Body>
                        {filteredRecords.length > 0 && (
                            <Card.Footer>
                                <Pagination>
                                    <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                                    <Pagination.Prev onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} />
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <Pagination.Item key={page} active={page === currentPage} onClick={() => setCurrentPage(page)}>
                                            {page}
                                        </Pagination.Item>
                                    ))}
                                    <Pagination.Next onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} />
                                    <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                                </Pagination>
                            </Card.Footer>
                        )}
                    </Card>

                    {/* Totals Card */}
                    {filteredTotals.length > 0 && (
                        <Card className="totals-card">
                            <Card.Header className="totals-card-header">
                                <FontAwesomeIcon icon={faFileExport} className="me-2" />
                                Summary Totals
                            </Card.Header>
                            <Card.Body>
                                <Table hover responsive className="totals-table">
                                    <thead>
                                        <tr>
                                            <th>Milk Type</th>
                                            <th>Total Qty</th>
                                            <th>Total Amount</th>
                                            <th>Avg FAT</th>
                                            <th>Avg SNF</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTotals.map(total => (
                                            <tr key={total._id.milkType}>
                                                <td><Badge bg={total._id.milkType === 'COW' ? 'warning' : 'info'}>{total._id.milkType}</Badge></td>
                                                <td>{total.totalQuantity?.toFixed(2) || '0.00'}</td>
                                                <td>{total.totalAmount?.toFixed(2) || '0.00'}</td>
                                                <td>{total.averageFat}</td>
                                                <td>{total.averageSNF}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default DeviceRecords;
