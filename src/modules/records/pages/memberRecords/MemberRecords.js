import {
  faFileCsv,
  faFilePdf,
  faSearch,
  faFilter,
  faMicrochip,
  faUser,
  faCalendarAlt,
  faEye,
  faUsers,
  faTint,
  faFlask,
  faBottleWater,
  faChartLine,
  faRupeeSign,
  faArrowUp,
  faEquals,
  faCow,
  faHippo,
  faSun,
  faMoon,
  faClipboardList
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Table, Card, Button, Form, Spinner, Row, Col, Badge, Pagination, ButtonGroup } from "react-bootstrap";
import { data, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { saveAs } from "file-saver";

import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { errorToast } from "../../../../shared/utils/appToaster";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import {
  useGetDeviceByCodeQuery,
  useGetAllDevicesQuery,
  useGetDeviceByIdQuery,
} from "../../../device/store/deviceEndPoint";
import { roles } from "../../../../shared/utils/appRoles";
import { useGetMemberCodewiseReportQuery } from "../../store/recordEndPoint";
import { skipToken } from "@reduxjs/toolkit/query";
import '../../Records.scss';

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};
const MemberRecords = () => {
  const navigate = useNavigate();
  const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
  const userType = UserTypeHook();

  const isAdmin = userType === roles.ADMIN;
  const isDairy = userType === roles.DAIRY;
  const isDevice = userType === roles.DEVICE;

  const deviceid = userInfo?.deviceid;
  const dairyCode = userInfo?.dairyCode;

  const { data: allDevices = [], isLoading: isAdminLoading } =
    useGetAllDevicesQuery(undefined, { skip: !isAdmin });
  const { data: dairyDevices = [], isLoading: isDairyLoading } =
    useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy });

  const { data: deviceData, isLoading: isDeviceLoading } =
    useGetDeviceByIdQuery(deviceid, { skip: !isDevice });

  const deviceList = isAdmin ? allDevices : isDairy ? dairyDevices : [];

  const [deviceCode, setDeviceCode] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [fromDate, setFromDate] = useState(getToday());
  const [toDate, setToDate] = useState(getToday());
  const [viewMode, setViewMode] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [searchParams, setSearchParams] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [milkTypeFilter, setMilkTypeFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');

  useEffect(() => {
    if (isDevice && deviceid) setDeviceCode(deviceid);
  }, [isDevice, deviceid]);

  const selectedDevice = isDevice
    ? deviceData
    : deviceList.find((dev) => dev.deviceid === deviceCode);
  const memberCodes = selectedDevice?.members || [];

  const handleSearch = () => {
    if (!deviceCode || !memberCode || !fromDate || !toDate) {
      errorToast("Please fill all required fields");
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      errorToast("From Date cannot be after To Date");
      return;
    }
    setSearchParams({
      deviceCode,
      memberCode,
      fromDate,
      toDate,
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
      setMemberCode(firstMember.CODE);
    } else {
      setMemberCode('')
    }
  }, [memberCodes, deviceCode]);

  const { data: resultData, isFetching } = useGetMemberCodewiseReportQuery(
    searchParams
      ? {
        params: {
          deviceCode: searchParams?.deviceCode,
          memberCode: searchParams?.memberCode,
          fromDate: searchParams?.fromDate,
          toDate: searchParams?.toDate,
          page: currentPage,
          limit: recordsPerPage,
        },
      }
      : skipToken
  );

  const records = resultData?.records || [];
  const totals = resultData?.totals || [];
  const totalCount = resultData?.totalRecords;
  const totalPages = Math.ceil(totalCount / recordsPerPage);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        record.SAMPLEDATE.toLowerCase().includes(searchLower) ||
        record.SHIFT.toLowerCase().includes(searchLower) ||
        record.MILKTYPE.toLowerCase().includes(searchLower);
      const matchesMilkType = milkTypeFilter === 'ALL' || record.MILKTYPE === milkTypeFilter;
      const matchesShift = shiftFilter === 'ALL' || record.SHIFT === shiftFilter;
      return matchesSearch && matchesMilkType && matchesShift;
    });
  }, [records, searchTerm, milkTypeFilter, shiftFilter]);

  const handleExportCSV = () => {
    if (!totals?.length && !records?.length) {
      alert("No data available to export.");
      return;
    }

    let combinedCSV = "";

    // Header Info
    combinedCSV += `Device Code:,${deviceCode}\n`;
    combinedCSV += `Member Code:,${memberCode.padStart(4, "0")}\n`;
    combinedCSV += `Member Records From,${fromDate},To,${toDate}\n\n`;

    // Records
    if (records?.length) {
      const recordsCSVData = records?.map((rec, index) => ({
        "S.No": index + 1,
        Date: rec?.SAMPLEDATE || "",
        Shift: rec?.SHIFT || "",
        "Milk Type": rec?.MILKTYPE || "",
        Fat: rec?.FAT ?? "",
        SNF: rec?.SNF ?? "",
        CLR: rec?.CLR ?? "",
        Qty: rec?.QTY ?? "",
        Rate: rec?.RATE ?? "",
        Amount: rec?.AMOUNT?.toFixed(2) ?? "0.00",
        Incentive: rec?.INCENTIVEAMOUNT?.toFixed(2) ?? "0.00",
        "Grand Total": rec?.TOTAL?.toFixed(2) ?? "0.00",
      }));
      combinedCSV += "Record Summary:\n";
      combinedCSV += Papa.unparse(recordsCSVData);
      combinedCSV += "\n\n";
    }

    // Totals
    if (totals?.length) {
      const totalsCSVData = totals?.map((total) => ({
        "Milk Type": total?._id?.milkType || "",
        "Total Samples": total?.totalRecords ?? "",
        "Avg FAT": total?.averageFat ?? "",
        "Avg SNF": total?.averageSNF ?? "",
        "Avg CLR": total?.averageCLR ?? "",

        "Total Qty": total?.totalQuantity ?? "",
        "Avg Rate": total?.averageRate ?? "",
        "Total Amount": total?.totalAmount ?? "0.00",
        "Total Incentive": total?.totalIncentive ?? "0.00",
        "Grand Total": `${(
          parseFloat(total?.totalAmount || 0) +
          parseFloat(total?.totalIncentive || 0)
        ).toFixed(2)}`,
      }));
      combinedCSV += "Total Summary:\n";
      combinedCSV += Papa.unparse(totalsCSVData);
    }

    const blob = new Blob([combinedCSV], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `${memberCode.padStart(4, "0")}_Memberwise_Report_${getToday()}.csv`);
  };

  const handleExportPDF = () => {
    if (!totals?.length && !records?.length) {
      alert("No data available to export.");
      return;
    }

    const doc = new jsPDF();
    let currentY = 10;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const title = "MEMBERWISE REPORT";
    const titleX = (pageWidth - doc.getTextWidth(title)) / 2;
    doc.text(title, titleX, currentY);

    currentY += 10;
    doc.setFontSize(12);
    doc.text(`Device Code: ${deviceCode}`, 14, currentY);
    const memberCodeText = `Member Code: ${memberCode.padStart(4, "0")}`;
    doc.text(memberCodeText, pageWidth - 14 - doc.getTextWidth(memberCodeText), currentY);

    currentY += 7;
    doc.text(`Records From: ${fromDate} To: ${toDate}`, 14, currentY);

    if (records?.length) {
      const recordsTable = records?.map((record, index) => [
        index + 1,
        record?.SAMPLEDATE || "",
        record?.SHIFT || "",
        record?.MILKTYPE || "",
        record?.FAT ?? "",
        record?.SNF ?? "",
        record?.CLR ?? "",

        record?.QTY ?? "",
        record?.RATE ?? "",
        record?.AMOUNT?.toFixed(2) ?? "0.00",
        record?.INCENTIVEAMOUNT?.toFixed(2) ?? "0.00",
        record?.TOTAL?.toFixed(2) ?? "0.00",
      ]);

      autoTable(doc, {
        startY: currentY + 6,
        head: [[
          "S.No", "Date", "Shift", "Milk Type", "Fat", "Snf", "Clr", "Qty", "Rate", "Amount", "Incentive", "Grand Total",
        ]],
        body: recordsTable,
        theme: "grid",
        styles: { fontSize: 9 },
      });

      currentY = doc.lastAutoTable.finalY + 10;
    }

    if (totals?.length) {
      doc.setFontSize(12);
      doc.text("Summary:", 14, currentY);

      const totalsTable = totals.map((total) => [
        total?._id?.milkType || "",
        total?.totalRecords ?? "",
        total?.averageFat ?? "",
        total?.averageSNF ?? "",
        total?.averageCLR ?? "",
        total?.totalQuantity ?? "",
        total?.averageRate ?? "",
        total?.totalAmount ?? "0.00",
        total?.totalIncentive ?? "0.00",
        (
          parseFloat(total?.totalAmount || 0) +
          parseFloat(total?.totalIncentive || 0)
        ).toFixed(2),
      ]);

      autoTable(doc, {
        startY: currentY + 6,
        head: [[
          "Milk Type", "Total Samples", "Avg FAT", "Avg SNF", "Avg CLR", "Total Qty", "Avg Rate",
          "Total Amount", "Total Incentive", "Grand Total",
        ]],
        body: totalsTable,
        theme: "striped",
        styles: { fontSize: 9 },
      });
    }

    doc.save(`${memberCode.padStart(4, "0")}_Memberwise_Report_${getToday()}.pdf`);
  };

  return (
    <div className="records-container">
      <Card className="filter-card mb-4">
        <Card.Header className="filter-card-header">
          <FontAwesomeIcon icon={faFilter} className="me-2" />
          Filter Member Records
        </Card.Header>
        <Card.Body>
          <Form>
            <Row className="align-items-end">
              {(isAdmin || isDairy) && (
                <Col md={3}>
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
                <Col md={3}>
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

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faUser} className="me-2" />Select Member</Form.Label>
                  <Form.Select
                    className="form-select-modern"
                    value={memberCode}
                    onChange={(e) => setMemberCode(e.target.value)}
                  >
                    <option value="">Select Member Code</option>
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
                  <Form.Label className="form-label-modern"><FontAwesomeIcon icon={faEye} className="me-2" />View Mode</Form.Label>
                  <Form.Select
                    className="form-select-modern"
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                  >
                    <option value="ALL">Show All Records</option>
                    <option value="RECORDS">Only Records Summary</option>
                    <option value="TOTALS">Only Record Totals</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>&nbsp;</Form.Label>
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
                </Form.Group>
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
                {viewMode !== "TOTALS" && (
                  <Card className="mb-4">
                    <Card.Header className="results-card-header d-flex justify-content-between align-items-center">
                      <span><FontAwesomeIcon icon={faUsers} className="me-2" />Member Records</span>
                      <div className="d-flex align-items-center">
                        <Form.Group style={{ width: '250px', marginRight: '1rem' }}>
                          <Form.Control
                            type="text"
                            placeholder="Search records..."
                            className="form-control-modern"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </Form.Group>
                        <Button variant="outline-success" size="sm" className="export-button me-2" onClick={handleExportCSV}>
                          <FontAwesomeIcon icon={faFileCsv} className="me-2" />CSV
                        </Button>
                        <Button variant="outline-danger" size="sm" className="export-button" onClick={handleExportPDF}>
                          <FontAwesomeIcon icon={faFilePdf} className="me-2" />PDF
                        </Button>
                      </div>
                    </Card.Header>
                    <Card.Header className="filter-card-header">

                      {filteredRecords.length > 0 && (
                        <div className="mb-1">
                          <div className="results-card-header d-flex justify-content-between align-items-center">
                            <span className="fw-semibold me-2">Device: {deviceCode || '--'}</span>&nbsp; | &nbsp;
                            <span className="fw-semibold me-2">Member: {memberCode || '--'}</span>&nbsp; | &nbsp;
                            <span className="fw-semibold me-2">From: {fromDate || '--'}</span>&nbsp; | &nbsp;
                            <span className="fw-semibold me-2">To: {toDate || '--'}</span>&nbsp; | &nbsp;
                            <span className="fw-semibold me-2">View Mode: {viewMode || '--'}</span>
                          </div>
                        </div>

                      )}
                    </Card.Header>

                    <Card.Body>
                      {/* Filters Info Row */}

                      {/* Modern Filter Block */}
                      <div className="mb-3 d-flex flex-wrap gap-2 align-items-center filter-buttons-group">
                        <span className="fw-semibold me-2">Filter:</span>
                        <ButtonGroup>
                          <Button active={milkTypeFilter === 'ALL'} variant={milkTypeFilter === 'ALL' ? 'primary' : 'outline-primary'} size="sm" onClick={() => setMilkTypeFilter('ALL')} aria-label="Show all milk types" title="Show all milk types">All Milk</Button>
                          <Button active={milkTypeFilter === 'COW'} variant={milkTypeFilter === 'COW' ? 'info' : 'outline-info'} size="sm" onClick={() => setMilkTypeFilter('COW')} aria-label="Cow Milk" title="Cow Milk"><FontAwesomeIcon icon={faCow} className="me-1" />Cow</Button>
                          <Button active={milkTypeFilter === 'BUF'} variant={milkTypeFilter === 'BUF' ? 'warning' : 'outline-warning'} size="sm" onClick={() => setMilkTypeFilter('BUF')} aria-label="Buffalo Milk" title="Buffalo Milk"><FontAwesomeIcon icon={faHippo} className="me-1" />Buffalo</Button>
                        </ButtonGroup>
                        <span className="mx-3 border-start" style={{ height: '24px' }}></span>
                        <ButtonGroup>
                          <Button active={shiftFilter === 'ALL'} variant={shiftFilter === 'ALL' ? 'primary' : 'outline-primary'} size="sm" onClick={() => setShiftFilter('ALL')} aria-label="All Shifts" title="All Shifts">All Shifts</Button>
                          <Button active={shiftFilter === 'MORNING'} variant={shiftFilter === 'MORNING' ? 'success' : 'outline-success'} size="sm" onClick={() => setShiftFilter('MORNING')} aria-label="Morning" title="Morning"><FontAwesomeIcon icon={faSun} className="me-1" />Morning</Button>
                          <Button active={shiftFilter === 'EVENING'} variant={shiftFilter === 'EVENING' ? 'secondary' : 'outline-secondary'} size="sm" onClick={() => setShiftFilter('EVENING')} aria-label="Evening" title="Evening"><FontAwesomeIcon icon={faMoon} className="me-1" />Evening</Button>
                        </ButtonGroup>
                      </div>                      <div className="records-card-grid">
                        {filteredRecords.map((record, index) => (
                          <Card key={index} className={`record-card mb-3 ${record?.MILKTYPE === 'COW' ? 'cow' : record?.MILKTYPE === 'BUF' ? 'buf' : 'other'}`}>
                            <div className="record-card-header">
                              <span className="record-date fw-bold">
                                <FontAwesomeIcon icon={faCalendarAlt} className="me-1 text-primary" />
                                {record?.SAMPLEDATE}
                              </span>
                              <Badge bg={record?.MILKTYPE === 'COW' ? 'info' : 'warning'} text="dark">
                                {record?.MILKTYPE}
                              </Badge>
                            </div>
                            <Card.Body>
                              <div className="d-flex flex-wrap gap-2 mb-2">
                                <span className="record-shift badge bg-light text-dark"><FontAwesomeIcon icon={faEye} className="record-value-icon" />{record?.SHIFT}</span>
                                <span className="record-fat badge bg-primary-subtle text-primary"><FontAwesomeIcon icon={faTint} className="record-value-icon" />Fat: {record?.FAT?.toFixed(1)}</span>
                                <span className="record-snf badge bg-success-subtle text-success"><FontAwesomeIcon icon={faFlask} className="record-value-icon" />SNF: {record?.SNF?.toFixed(1)}</span>
                                <span className="record-clr badge bg-info-subtle text-info"><FontAwesomeIcon icon={faFlask} className="record-value-icon" />CLR: {record?.CLR?.toFixed(1)}</span>
                              </div>
                              <div className="d-flex flex-wrap gap-3 mb-2">
                                <span className="record-qty"><FontAwesomeIcon icon={faBottleWater} className="record-value-icon text-info" /><strong>Qty:</strong> {record?.QTY?.toFixed(2)} L</span>
                                <span className="record-rate"><FontAwesomeIcon icon={faChartLine} className="record-value-icon text-primary" /><strong>Rate:</strong> ₹{record?.RATE?.toFixed(2)}</span>
                              </div>
                              <div className="d-flex flex-wrap gap-3 mb-2">
                                <span className="record-amount"><FontAwesomeIcon icon={faRupeeSign} className="record-value-icon text-success" /><strong>Amount:</strong> ₹{record?.AMOUNT.toFixed(2) || 0}</span>
                                <span className="record-incentive"><FontAwesomeIcon icon={faArrowUp} className="record-value-icon text-warning" /><strong>Incentive:</strong> ₹{record?.INCENTIVEAMOUNT.toFixed(2) || 0}</span>
                                <span className="record-total"><FontAwesomeIcon icon={faEquals} className="record-value-icon text-success" /><strong>Grand Total:</strong> <span className="record-total">₹{record?.TOTAL.toFixed(2)}</span></span>
                              </div>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    </Card.Body>
                    {viewMode !== "TOTALS" && totalCount > 0 && (
                      <Card.Footer>
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
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
                      </Card.Footer>
                    )}
                  </Card>
                )}
                {viewMode !== "RECORDS" && (
                  <Card>
                    <Card.Header className="results-card-header">
                      <FontAwesomeIcon icon={faClipboardList} className="me-2" />Total Records</Card.Header>
                    <Card.Body>
                      <Table hover responsive className="totals-table">
                        <thead>
                          <tr>
                            <th>Milk Type</th>
                            <th>Total Records</th>
                            <th>Avg Fat</th>
                            <th>Avg SNF</th>
                            <th>Avg CLR</th>
                            <th>Total Qty (L)</th>
                            <th>Avg Rate</th>
                            <th>Total Amount</th>
                            <th>Total Incentive</th>
                            <th>Grand Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {totals?.length > 0 ? (
                            totals?.map((total, index) => (
                              <tr key={index}>
                                <td>
                                  <Badge bg={total?._id.milkType === 'COW' ? 'info' : total?._id.milkType === 'BUF' ? 'warning' : 'secondary'} text='dark'>
                                    {total?._id.milkType}
                                  </Badge>
                                </td>
                                <td>{total?.totalRecords}</td>
                                <td>{total?.averageFat}</td>
                                <td>{total?.averageSNF}</td>
                                <td>{total?.averageCLR}</td>
                                <td>{total?.totalQuantity} L</td>
                                <td>₹{total?.averageRate}</td>
                                <td>₹{total?.totalAmount}</td>
                                <td>₹{total?.totalIncentive}</td>
                                <td>
                                  ₹{`${(
                                    parseFloat(total.totalAmount) +
                                    parseFloat(total.totalIncentive)
                                  ).toFixed(2)}`}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="9" className="text-center">
                                No totals available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      )}
      {!searchParams &&
        <div className="text-center my-5 text-muted">
          Please apply filters and click <strong>Search</strong> to view records.
        </div>
      }
    </div>
  );
};

export default MemberRecords;