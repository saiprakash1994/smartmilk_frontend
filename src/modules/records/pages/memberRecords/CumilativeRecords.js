import {
  faFileCsv,
  faFilePdf,
  faSearch,
  faDesktop,
  faUser,
  faCalendarDays,
  faEye

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
import { useGetCumulativeReportQuery } from "../../store/recordEndPoint";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { skipToken } from "@reduxjs/toolkit/query";
import InputGroup from "react-bootstrap/esm/InputGroup";
import ExportButtonsSection from "../ExportButtonsSection";


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



const isExporting = false
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

  return (
    <>
    <div className="datewise-detailed-page" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '30px 0' }}>
            <div className="container" style={{ maxWidth: 1400 }}>
                                <Card className="mb-4 shadow filters-card" style={{ borderRadius: 16, padding: 24, background: 'rgba(255,255,255,0.97)' }}>

        <Form className="row g-3 align-items-end">
          
            {(isAdmin || isDairy) && (
            <Form.Group className="col-md-2">
                <Form.Label className="form-label-modern">Device Code</Form.Label>
                <InputGroup>
                    <InputGroup.Text><FontAwesomeIcon icon={faDesktop} /></InputGroup.Text>
                    <Form.Select className="form-select-modern select-device" value={deviceCode} onChange={e => setDeviceCode(e.target.value)}>
                        <option value="">Select Device</option>
                        {deviceList?.map((dev) => (
                            <option key={dev.deviceid} value={dev.deviceid}>{dev.deviceid}</option>
                        ))}
                    </Form.Select>
                </InputGroup>
            </Form.Group>
        )}
           {isDevice && (
            <Form.Group className="col-md-2">
                <Form.Label className="form-label-modern">Device Code</Form.Label>
                <InputGroup>
                    <InputGroup.Text><FontAwesomeIcon icon={faDesktop} /></InputGroup.Text>
                    <Form.Control className="form-control-modern select-device" type="text" value={deviceCode} readOnly />
                </InputGroup>
            </Form.Group>
        )}
          <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">Start Member</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faUser} /></InputGroup.Text>
                <Form.Select className="form-select-modern select-member" value={fromCode} onChange={e => setFromCode(e.target.value)}>
                    <option value="">Start Member Code</option>
                    {memberCodes?.map((code, idx) => (
                        <option key={idx} value={code.CODE}>{code.CODE} - {code.MEMBERNAME}</option>
                    ))}
                </Form.Select>
            </InputGroup>
        </Form.Group>
            <Form.Group className="col-md-2">
              <Form.Label className="form-label-modern">End Member</Form.Label>
              <InputGroup>
                <Form.Select className="form-select-modern" value={toCode} onChange={e => setToCode(e.target.value)}>
                  <option value="">Select End Member Code</option>
                  {memberCodes?.map((code, idx) => (
                    <option key={idx} value={code.CODE}>{code.CODE} - {code.MEMBERNAME}</option>
                  ))}
                </Form.Select>
              </InputGroup>
            </Form.Group>
            
        <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">From Date</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faCalendarDays} /></InputGroup.Text>
                <Form.Control className="form-control-modern select-date" type="date" value={fromDate} max={getToday()} onChange={e => setFromDate(e.target.value)} />
            </InputGroup>
        </Form.Group>
        <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">To Date</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faCalendarDays} /></InputGroup.Text>
                <Form.Control className="form-control-modern select-date" type="date" value={toDate} max={getToday()} onChange={e => setToDate(e.target.value)} />
            </InputGroup>
        </Form.Group>
            <Form.Group className="col-md-2">
              <Form.Label className="form-label-modern">View Mode</Form.Label>
              <InputGroup>
              <InputGroup.Text><FontAwesomeIcon icon={faEye} /></InputGroup.Text>

                <Form.Select className="form-select-modern" value={viewMode} onChange={e => setViewMode(e.target.value)}>
                  <option value="ALL">Show All</option>
                  <option value="TOTALS">Only Totals</option>
                  <option value="COWTOTALS">COW Totals</option>
                  <option value="BUFFTOTALS">BUF Totals</option>
                  <option value="DATA">Members Data </option>
                </Form.Select>
              </InputGroup>
            </Form.Group>
            <Form.Group className="col-md-2 ms-auto d-flex align-items-end justify-content-end">
              <Button className="export-btn w-100" variant="primary" onClick={handleSearch} disabled={isFetching} type="button">
                {isFetching ? <Spinner size="sm" animation="border" /> : <FontAwesomeIcon icon={faSearch} />} Search
              </Button>
            </Form.Group>
          </Form>
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
        {/* Modern Records Section */}
        <Card.Body className="cardbodyCss">
          {!searchParams ? (
            <div className="text-center my-5 text-muted">
              Please apply filters and click <strong>Search</strong> to view records.
            </div>
          ) : isFetching ? (
            <div className="text-center my-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <>
              <hr />
              {(viewMode == "DATA" || viewMode == "ALL") && (
                <Card className="records-card mb-4">
                  {/* Modern Gradient Header Section */}
                  <div className="d-flex justify-content-between align-items-center px-3 py-3 mb-4"
                      style={{
                          gap: 16,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#fff',
                          boxShadow: '0 4px 16px rgba(102, 126, 234, 0.10)'
                      }}>
                      <div className="fw-semibold" style={{minWidth: 120, fontSize: '1.08rem'}}>
                          Device Code: <span style={{color: '#fff', fontWeight: 700}}>{deviceCode}</span>
                      </div>
                      <div className="flex-grow-1 text-center" style={{fontWeight: 700, fontSize: '1.2rem', letterSpacing: 1}}>
                          PAYMENT REGISTER
                      </div>
                      <div className="fw-semibold text-end" style={{minWidth: 320, fontSize: '1.08rem'}}>
                          From: <span style={{color: '#fff', fontWeight: 700}}>{String(fromCode || '').padStart(4, '0')}</span>
                          <span className="mx-1">to</span>
                          <span style={{color: '#fff', fontWeight: 700}}>{String(toCode || '').padStart(4, '0')}</span>
                          <span className="mx-2">|</span>
                          <span>Dates:</span>
                          <span style={{color: '#fff', fontWeight: 700}} className="ms-1">{fromDate ? formatDateDMY(fromDate) : ''}</span>
                          <span className="mx-1">to</span>
                          <span style={{color: '#fff', fontWeight: 700}}>{toDate ? formatDateDMY(toDate) : ''}</span>
                      </div>
                  </div>
                  <div className="table-responsive">
                    <Table className="records-table" hover responsive>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Code</th>
                          <th>MILKTYPE</th>
                          <th>Total Qty</th>
                          <th>Avg Rate</th>
                          <th>Total Amount</th>
                          <th>Total Incentive</th>
                          <th>Grand Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records?.length > 0 ? (
                          records?.map((record, index) => (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td>{record?.CODE}</td>
                              <td>{record?.MILKTYPE}</td>
                              <td>{record?.totalQty}</td>
                              <td>₹{record?.avgRate}</td>
                              <td>₹{record?.totalAmount}</td>
                              <td>₹{record?.totalIncentive}</td>
                              <td>₹{record?.grandTotal}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8" className="text-center">
                              No totals available
                            </td>
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
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                        </Form.Select>
                      </div>
                      <div className="flex-grow-1 text-center fw-semibold">
                        Page {currentPage} of {Math.max(1, Math.ceil(totalCount / recordsPerPage))}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => setCurrentPage(prev => prev - 1)}
                          disabled={currentPage === 1}
                        >
                          &laquo; Prev
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          disabled={currentPage >= Math.ceil(totalCount / recordsPerPage)}
                        >
                          Next &raquo;
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}
              {/* Merged Summary Table for COW, BUFF, and GRAND TOTALS */}
              {(viewMode === "TOTALS" || viewMode === "ALL" || viewMode === "COWTOTALS" || viewMode === "BUFFTOTALS") && (
                <Card className="records-card mb-4">
                  <div className="table-responsive">
                    <Table className="records-table" hover responsive>
                      <thead>
                        <tr>
                          <th>Milk Type</th>
                          <th>Member Count</th>
                          <th>Total Qty</th>
                          <th>Total Amount</th>
                          <th>Total Incentive</th>
                          <th>Grand Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Cow Milk Type Totals */}
                        {(viewMode === "COWTOTALS" || viewMode === "TOTALS" || viewMode === "ALL") && cowMilkTypeTotals?.map((row, idx) => (
                          <tr key={`cow-${idx}`}>
                            <td>{row?.MILKTYPE || 'COW'}</td>
                            <td>{row?.memberCount}</td>
                            <td>{row?.totalQty}</td>
                            <td>₹{row?.totalAmount}</td>
                            <td>₹{row?.totalIncentive}</td>
                            <td>₹{row?.grandTotal}</td>
                          </tr>
                        ))}
                        {/* Buff Milk Type Totals */}
                        {(viewMode === "BUFFTOTALS" || viewMode === "TOTALS" || viewMode === "ALL") && bufMilkTypeTotals?.map((row, idx) => (
                          <tr key={`buff-${idx}`}>
                            <td>{row?.MILKTYPE || 'BUFFALO'}</td>
                            <td>{row?.memberCount}</td>
                            <td>{row?.totalQty}</td>
                            <td>₹{row?.totalAmount}</td>
                            <td>₹{row?.totalIncentive}</td>
                            <td>₹{row?.grandTotal}</td>
                          </tr>
                        ))}
                        {/* Grand Total Row */}
                        {(viewMode === "TOTALS" || viewMode === "ALL") && (
                          <tr className="fw-bold bg-light">
                            <td>Grand Total</td>
                            <td>{totalMembers}</td>
                            <td>₹{grandTotalQty}</td>
                            <td>₹{grandTotalAmount}</td>
                            <td>₹{grandTotalIncentive}</td>
                            <td>₹{grandTotal}</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              )}
            </>
          )}
        </Card.Body>
      </div>
      </div>
      
    </>
  );
};

export default CumilativeRecords;
