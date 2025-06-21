import {
  faFileCsv,
  faFilePdf,
  faSearch,
  faFilter,
  faMicrochip,
  faUser,
  faCalendarAlt,
  faEye
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Table, Card, Button, Form, Spinner, Row, Col, Badge } from "react-bootstrap";
import { data, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

  const filteredRecords = records.filter(record => {
    const searchLower = searchTerm.toLowerCase();
    return (
      record.SAMPLEDATE.toLowerCase().includes(searchLower) ||
      record.SHIFT.toLowerCase().includes(searchLower) ||
      record.MILKTYPE.toLowerCase().includes(searchLower)
    );
  });

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
        record?.QTY ?? "",
        record?.RATE ?? "",
        record?.AMOUNT?.toFixed(2) ?? "0.00",
        record?.INCENTIVEAMOUNT?.toFixed(2) ?? "0.00",
        record?.TOTAL?.toFixed(2) ?? "0.00",
      ]);

      autoTable(doc, {
        startY: currentY + 6,
        head: [[
          "S.No", "Date", "Shift", "Milk Type", "Fat", "Snf", "Qty", "Rate", "Amount", "Incentive", "Grand Total",
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
          "Milk Type", "Total Samples", "Avg FAT", "Avg SNF", "Total Qty", "Avg Rate",
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
                      <span>Record Summary</span>
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
                    <Card.Body>
                      <Table hover responsive className="records-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Shift</th>
                            <th>Milk Type</th>
                            <th>Fat</th>
                            <th>SNF</th>
                            <th>Qty (L)</th>
                            <th>Rate</th>
                            <th>Amount</th>
                            <th>Incentive</th>
                            <th>Grand Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRecords.length > 0 ? (
                            filteredRecords.map((record, index) => (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{record?.SAMPLEDATE}</td>
                                <td>{record?.SHIFT}</td>
                                <td>
                                  <Badge bg={record?.MILKTYPE === 'COW' ? 'info' : 'warning'} text="dark">
                                    {record?.MILKTYPE}
                                  </Badge>
                                </td>
                                <td>{record?.FAT?.toFixed(1)}</td>
                                <td>{record?.SNF?.toFixed(1)}</td>
                                <td>{record?.QTY?.toFixed(2)} L</td>
                                <td>₹{record?.RATE?.toFixed(2)}</td>
                                <td>₹{record?.AMOUNT.toFixed(2) || 0}</td>
                                <td>₹{record?.INCENTIVEAMOUNT.toFixed(2) || 0}</td>
                                <td>₹{record?.TOTAL.toFixed(2)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="11" className="text-center">
                                {searchTerm ? "No records found matching your search." : "No records found"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
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
                            <div className="d-flex align-items-center gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => prev - 1)}
                                disabled={currentPage === 1}
                              >
                                « Prev
                              </Button>
                              <span className="fw-semibold">
                                Page {currentPage} of {Math.ceil(totalCount / recordsPerPage)}
                              </span>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => prev + 1)}
                                disabled={currentPage >= Math.ceil(totalCount / recordsPerPage)}
                              >
                                Next »
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card.Footer>
                    )}
                  </Card>
                )}
                {viewMode !== "RECORDS" && (
                  <Card>
                    <Card.Header className="results-card-header">Total Records</Card.Header>
                    <Card.Body>
                      <Table hover responsive className="totals-table">
                        <thead>
                          <tr>
                            <th>Milk Type</th>
                            <th>Total Records</th>
                            <th>Avg Fat</th>
                            <th>Avg SNF</th>
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
                                  <Badge bg={total?._id.milkType === 'COW' ? 'info' : 'warning'} text="dark">
                                    {total?._id.milkType}
                                  </Badge>
                                </td>
                                <td>{total?.totalRecords}</td>
                                <td>{total?.averageFat}</td>
                                <td>{total?.averageSNF}</td>
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