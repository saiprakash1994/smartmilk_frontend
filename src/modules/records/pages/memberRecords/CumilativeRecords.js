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
import { useGetCumulativeReportQuery } from "../../store/recordEndPoint";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { skipToken } from "@reduxjs/toolkit/query";
import '../../Records.scss';

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};
const CumilativeRecords = () => {
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

  // Get selected device and member list
  const selectedDevice = isDevice
    ? deviceData
    : deviceList.find((dev) => dev.deviceid === deviceCode);
  const memberCodes = selectedDevice?.members || [];

  const handleSearch = () => {
    if (!deviceCode || !fromCode || !toCode || !fromDate || !toDate) {
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

  const { data: resultData, isFetching } = useGetCumulativeReportQuery(
    searchParams
      ? {
        params: {
          deviceid: searchParams?.deviceCode,
          fromCode: searchParams?.fromCode,
          toCode: searchParams?.toCode,
          fromDate: formattedFromDate,
          toDate: formattedToDate,
          page: currentPage,
          limit: recordsPerPage,
        },
      }
      : skipToken
  );

  const records = resultData?.data || [];
  const totalCount = resultData?.pagination?.totalRecords;

  const filteredRecords = records.filter(record =>
    String(record.CODE).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cowMilkTypeTotals =
    resultData?.milkTypeTotals.filter((cow) => cow?.MILKTYPE === "COW") || [];
  const bufMilkTypeTotals =
    resultData?.milkTypeTotals.filter((buf) => buf?.MILKTYPE === "BUF") || [];

  const {
    totalMembers = 0,
    grandTotalQty = 0,
    grandTotalIncentive = 0,
    grandTotalAmount = 0,
    grandTotal = 0,
  } = resultData || {};

  const handleExportCSV = () => {
    if (totalMembers === 0) {
      alert("No data available to export.");
      return;
    }

    let csvSections = [];

    // Header
    csvSections.push(`Device Code: ${deviceCode}`);
    csvSections.push(`Members: ${fromCode} to ${toCode}`);
    csvSections.push(`Date Range: ${fromDate} to ${toDate}`);
    csvSections.push(""); // spacer

    // Member Records
    if (records?.length) {
      const recordsCSVData = records?.map((record, index) => ({
        SNO: index + 1,
        MemberCode: record?.CODE,
        MilkType: record?.MILKTYPE,
        TotalQty: record?.totalQty,
        AvgRate: record?.avgRate,
        TotalAmount: record?.totalAmount,
        TotalIncentive: record?.totalIncentive,
        GrandTotal: record?.grandTotal,
      }));

      csvSections.push("=== Member-wise Records ===");
      csvSections.push(Papa.unparse(recordsCSVData));
      csvSections.push(""); // spacer
    }

    // COW Totals
    if (cowMilkTypeTotals?.length) {
      const cowData = cowMilkTypeTotals?.map((cow) => ({
        MilkType: cow?.MILKTYPE,
        MemberCount: cow?.memberCount,
        TotalQty: cow?.totalQty,
        TotalAmount: cow?.totalAmount,
        TotalIncentive: cow?.totalIncentive,
        GrandTotal: cow?.grandTotal,
      }));

      csvSections.push("=== COW Totals ===");
      csvSections.push(Papa.unparse(cowData));
      csvSections.push("");
    }

    // BUF Totals
    if (bufMilkTypeTotals?.length) {
      const bufData = bufMilkTypeTotals?.map((buf) => ({
        MilkType: buf?.MILKTYPE,
        MemberCount: buf?.memberCount,
        TotalQty: buf?.totalQty,
        TotalAmount: buf?.totalAmount,
        TotalIncentive: buf?.totalIncentive,
        GrandTotal: buf?.grandTotal,
      }));

      csvSections.push("=== BUF Totals ===");
      csvSections.push(Papa.unparse(bufData));
      csvSections.push("");
    }

    // Grand Total
    csvSections.push("=== Overall Totals ===");
    csvSections.push(
      Papa.unparse([
        {
          MilkType: "TOTAL",
          MemberCount: totalMembers,
          TotalQty: grandTotalQty,
          TotalAmount: grandTotalAmount,
          TotalIncentive: grandTotalIncentive,
          GrandTotal: grandTotal,
        },
      ])
    );

    const blob = new Blob([csvSections.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    saveAs(blob, `${deviceCode}_Payment_Register.csv`);
  };

  const handleExportPDF = () => {
    if (totalMembers === 0) {
      alert("No data available to export.");
      return;
    }

    const doc = new jsPDF();
    let currentY = 10;

    const pageWidth = doc.internal.pageSize.getWidth();
    const centerText = (text, y) => {
      const textWidth = doc.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      doc.text(text, x, y);
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    centerText("Payment Register", currentY);
    currentY += 8;

    doc.setFontSize(12);
    doc.text(`Device Code: ${deviceCode}`, 14, currentY);
    doc.text(`Members: ${fromCode} to ${toCode}`, pageWidth - 90, currentY);
    currentY += 6;
    doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, currentY);
    currentY += 6;

    // Member-wise Table
    if (records?.length) {
      const memberTable = records?.map((record, index) => [
        index + 1,
        record?.CODE,
        record?.MILKTYPE,
        record?.totalQty,
        record?.avgRate,
        record?.totalAmount,
        record?.totalIncentive,
        record?.grandTotal,
      ]);

      autoTable(doc, {
        head: [
          [
            "S.No",
            "Member Code",
            "Milk Type",
            "Total Qty",
            "Avg Rate",
            "Total Amount",
            "Total Incentive",
            "Grand Total",
          ],
        ],
        body: memberTable,
        startY: currentY,
        styles: { fontSize: 8 },
        theme: "striped",
      });

      currentY = doc.lastAutoTable.finalY + 8;
    }

    const renderSection = (title, data, startY) => {
      if (!data?.length) return startY;

      doc.setFontSize(11);
      doc.text(title, 14, startY);
      startY += 4;

      const tableData = data?.map((item) => [
        item.memberCount,
        item.MILKTYPE,
        item.totalQty,
        item.totalAmount,
        item.totalIncentive,
        item.grandTotal,
      ]);

      autoTable(doc, {
        head: [
          [
            "Member Count",
            "Milk Type",
            "Total Qty",
            "Total Amount",
            "Total Incentive",
            "Grand Total",
          ],
        ],
        body: tableData,
        startY,
        styles: { fontSize: 9 },
        theme: "grid",
      });

      return doc.lastAutoTable.finalY + 8;
    };

    currentY = renderSection("COW Totals", cowMilkTypeTotals, currentY);
    currentY = renderSection("BUF Totals", bufMilkTypeTotals, currentY);

    // Grand Total
    doc.text("Overall Totals", 14, currentY);
    currentY += 4;

    autoTable(doc, {
      head: [
        [
          "Total Members",
          "Total Qty",
          "Total Incentive",
          "Total Amount",
          "Grand Total",
        ],
      ],
      body: [
        [
          totalMembers,
          grandTotalQty,
          grandTotalIncentive,
          grandTotalAmount,
          grandTotal,
        ],
      ],
      startY: currentY,
      styles: { fontSize: 9 },
      theme: "grid",
    });

    doc.save(`${deviceCode}_Payment_Register.pdf`);
  };

  return (
    <div className="records-container">

      <Card className="filter-card mb-4">
        <Card.Header className="filter-card-header">
          <FontAwesomeIcon icon={faFilter} className="me-2" />
          Filter Cumulative Records
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
                    <option value="ALL">All DATA</option>
                    <option value="TOTALS">All MilkType Totals</option>
                    <option value="COWTOTALS">COW Totals</option>
                    <option value="BUFFTOTALS">BUF Totals</option>
                    <option value="DATA">Members Data </option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
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

                {(viewMode === "DATA" || viewMode === "ALL") && (
                  <Card className="mb-4">
                    <Card.Header className="results-card-header d-flex justify-content-between align-items-center">
                      <span>Members Data</span>
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
                      <Table hover responsive className="records-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Code</th>
                            <th>MILKTYPE</th>
                            <th>Total Qty (L)</th>
                            <th>Avg Rate</th>
                            <th>Total Amount</th>
                            <th>Total Incentive</th>
                            <th>Grand Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRecords.length > 0 ? (
                            filteredRecords.map((record, index) => (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{record?.CODE}</td>
                                <td>
                                  <Badge bg={record?.MILKTYPE === 'COW' ? 'info' : 'warning'} text="dark">
                                    {record?.MILKTYPE}
                                  </Badge>
                                </td>
                                <td>{record?.totalQty} L</td>
                                <td>₹{record?.avgRate}</td>
                                <td>₹{record?.totalAmount}</td>
                                <td>₹{record?.totalIncentive}</td>
                                <td>₹{record?.grandTotal}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="8" className="text-center">
                                {searchTerm ? "No members found matching your search." : "No totals available"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                )}


                {(viewMode === "COWTOTALS" || viewMode === "ALL") && (
                  <Card className="mb-4">
                    <Card.Header className="results-card-header">Cow Totals</Card.Header>
                    <Card.Body>
                      <Table hover responsive className="totals-table">
                        <thead>
                          <tr>
                            <th>Member Count</th>
                            <th>MILKTYPE</th>
                            <th>Total Qty (L)</th>
                            <th>Total Amount</th>
                            <th>total Incentive</th>
                            <th>Grand Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cowMilkTypeTotals?.length > 0 ? (
                            cowMilkTypeTotals?.map((cow, index) => (
                              <tr key={index}>
                                <td>{cow?.memberCount}</td>
                                <td>
                                  <Badge bg={cow?.MILKTYPE === 'COW' ? 'info' : 'warning'} text="dark">
                                    {cow?.MILKTYPE}
                                  </Badge>
                                </td>
                                <td>{cow?.totalQty} L</td>
                                <td>₹{cow?.totalAmount}</td>
                                <td>₹{cow?.totalIncentive}</td>
                                <td>₹{cow?.grandTotal}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="text-center">
                                No totals available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                )}
                {(viewMode === "BUFFTOTALS" || viewMode === "ALL") && (
                  <Card className="mb-4">
                    <Card.Header className="results-card-header">Buf Totals</Card.Header>
                    <Card.Body>
                      <Table hover responsive className="totals-table">
                        <thead>
                          <tr>
                            <th>Member Count</th>
                            <th>MILKTYPE</th>
                            <th>Total Qty</th>
                            <th>Total Amount</th>
                            <th>total Incentive</th>
                            <th>Grand Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bufMilkTypeTotals?.length > 0 ? (
                            bufMilkTypeTotals?.map((buf, index) => (
                              <tr key={index}>
                                <td>{buf?.memberCount}</td>
                                <td>
                                  <Badge bg={buf?.MILKTYPE === 'COW' ? 'info' : 'warning'} text="dark">
                                    {buf?.MILKTYPE}
                                  </Badge>
                                </td>
                                <td>{buf?.totalQty} L</td>
                                <td>₹{buf?.totalAmount}</td>
                                <td>₹{buf?.totalIncentive}</td>
                                <td>₹{buf?.grandTotal}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="text-center">
                                No totals available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                )}
                {(viewMode === "TOTALS" || viewMode === "ALL") && (
                  <Card className="mb-4">
                    <Card.Header className="results-card-header">All Totals</Card.Header>
                    <Card.Body>
                      <Table hover responsive className="totals-table">
                        <thead>
                          <tr>
                            <th>Total Members</th>
                            <th>Grand Total Qty</th>
                            <th>Grand Total Incentive</th>
                            <th>Grand Total Amount</th>
                            <th>Grand Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{totalMembers}</td>
                            <td>{grandTotalQty} L</td>
                            <td>₹{grandTotalIncentive}</td>
                            <td>₹{grandTotalAmount}</td>
                            <td>₹{grandTotal}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                )}

                {(viewMode === "DATA" || viewMode === "ALL") && totalCount > 0 && (
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

export default CumilativeRecords;
