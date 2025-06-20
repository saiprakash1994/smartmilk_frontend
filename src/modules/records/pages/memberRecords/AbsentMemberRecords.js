import { faClock, faDesktop, faEye, faFileCsv, faSearch } from "@fortawesome/free-solid-svg-icons";
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
import { useGetAbsentMemberReportQuery } from "../../store/recordEndPoint";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons/faFilePdf";
import { skipToken } from "@reduxjs/toolkit/query";
import InputGroup from "react-bootstrap/esm/InputGroup";
import ExportButtonsSection from "../ExportButtonsSection";

const isExporting = false

const getToday = () => new Date().toISOString().split("T")[0];

const AbsentMemberRecords = () => {
  const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
  const userType = UserTypeHook();

  const isAdmin = userType === roles.ADMIN;
  const isDairy = userType === roles.DAIRY;
  const isDevice = userType === roles.DEVICE;

  const deviceid = userInfo?.deviceid;
  const dairyCode = userInfo?.dairyCode;

  const { data: allDevices = [], isLoading: isAdminLoading } = useGetAllDevicesQuery(undefined, {
    skip: !isAdmin,
  });

  const { data: dairyDevices = [], isLoading: isDairyLoading } = useGetDeviceByCodeQuery(dairyCode, {
    skip: !isDairy,
  });

  const deviceList = isAdmin ? allDevices : isDairy ? dairyDevices : [];

  const [deviceCode, setDeviceCode] = useState("");
  const [date, setDate] = useState(getToday());
  const [shift, setShift] = useState("MORNING");
  const [viewMode, setViewMode] = useState("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [searchParams, setSearchParams] = useState(null);

  useEffect(() => {
    if (isDevice && deviceid) {
      setDeviceCode(deviceid);
    }
  }, [isDevice, deviceid]);

  const handleSearch = () => {
    if (!deviceCode || !date || !shift) {
      errorToast("Please fill all required fields");
      return;
    }

    setSearchParams({
      deviceid: deviceCode,
      date,
      shift,
    });
    setCurrentPage(1);
  };

  useEffect(() => {
    if (searchParams) {
      setSearchParams((prev) => ({ ...prev }));
    }
  }, [currentPage, recordsPerPage]);

  const formattedDate = searchParams?.date?.split("-").reverse().join("/");

  const { data: resultData, isFetching } = useGetAbsentMemberReportQuery(
    searchParams
      ? {
        params: {
          deviceid: searchParams.deviceid,
          date: formattedDate,
          shift: searchParams.shift,
          page: currentPage,
          limit: recordsPerPage,
        },
      }
      : skipToken
  );

  const absent = resultData?.absentMembers || [];
  const totalCount = resultData?.totalRecords || 0;

  const {
    totalMembers = 0,
    presentCount = 0,
    absentCount = 0,
    cowAbsentCount = 0,
    bufAbsentCount = 0,
  } = resultData || {};

  const handleExportCSV = () => {
    if (totalMembers === 0) {
      alert("No data available to export.");
      return;
    }

    let csv = "";

    if (absent?.length > 0) {
      const memberCSV = absent?.map((rec, index) => ({
        "S.No": index + 1,
        "Member Code": rec?.CODE,
        "Milk Type": rec?.MILKTYPE === "C" ? "COW" : "BUFFALO",
        "Member Name": rec?.MEMBERNAME || "",
      }));
      csv += `Absent Members Report\nDate: ${date}, Shift: ${shift}, Device Code: ${deviceCode}\n`;
      csv += Papa.unparse(memberCSV);
      csv += "\n\n";
    }

    const summary = [
      {
        "Total Members": totalMembers,
        "Present Members": presentCount,
        "Absent Members": absentCount,
        "Cow Absent": cowAbsentCount,
        "Buffalo Absent": bufAbsentCount,
      },
    ];
    csv += `Summary\n`;
    csv += Papa.unparse(summary);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `${deviceCode}_Absent_Members_Report_${date}_${shift}.csv`);
  };

  const handleExportPDF = () => {
    if (totalMembers === 0) {
      alert("No data available to export.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const title = "Absent Members Report";
    doc.text(title, (pageWidth - doc.getTextWidth(title)) / 2, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Date: ${date}`, 14, y);
    doc.text(`Shift: ${shift}`, pageWidth - 50, y);
    y += 6;
    doc.text(`Device Code: ${deviceCode}`, 14, y);
    y += 8;

    if (absent?.length > 0) {
      const tableData = absent?.map((rec, i) => [
        i + 1,
        rec?.CODE,
        rec?.MILKTYPE === "C" ? "COW" : "BUFFALO",
        rec?.MEMBERNAME || "",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["S.No", "Member Code", "Milk Type", "Member Name"]],
        body: tableData,
        styles: { fontSize: 10 },
        theme: "grid",
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Summary", 14, y);
    y += 6;

    const summaryTable = [
      [totalMembers, presentCount, absentCount, cowAbsentCount, bufAbsentCount],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Total Members", "Present", "Absent", "Cow Absent", "Buffalo Absent"]],
      body: summaryTable,
      styles: { fontSize: 10 },
      theme: "striped",
    });

    doc.save(`${deviceCode}_Absent_Members_Report_${date}_${shift}.pdf`);
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
                <Form.Group className="col-md-3">
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
                <Form.Group className="col-md-3">
                  <Form.Label className="form-label-modern">Device Code</Form.Label>
                  <InputGroup>
                  <InputGroup.Text><FontAwesomeIcon icon={faDesktop} /></InputGroup.Text>
                    <Form.Control className="form-control-modern select-device" type="text" value={deviceCode} readOnly />
                  </InputGroup>
                </Form.Group>
              )}
              <Form.Group className="col-md-2">
                <Form.Label className="form-label-modern">Shift</Form.Label>
                <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faClock} /></InputGroup.Text>
                  <Form.Select className="form-select-modern" value={shift} onChange={e => setShift(e.target.value)}>
                    <option value="MORNING">MORNING</option>
                    <option value="EVENING">EVENING</option>
                  </Form.Select>
                </InputGroup>
              </Form.Group>
              <Form.Group className="col-md-2">
                <Form.Label className="form-label-modern">Date</Form.Label>
                <InputGroup>
                  <Form.Control className="form-control-modern select-date" type="date" value={date} max={getToday()} onChange={e => setDate(e.target.value)} />
                </InputGroup>
              </Form.Group>
              <Form.Group className="col-md-2">
                <Form.Label className="form-label-modern">View Mode</Form.Label>
                <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faEye} /></InputGroup.Text>
                  <Form.Select className="form-select-modern" value={viewMode} onChange={e => setViewMode(e.target.value)}>
                    <option value="ALL">Show All</option>
                    <option value="TOTALS">Summary</option>
                    <option value="ABSENT">Absent Members</option>
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
                {(viewMode === "ABSENT" || viewMode === "ALL") && (
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
                            ABSENT MEMBERS REPORT
                        </div>
                        <div className="fw-semibold text-end" style={{minWidth: 220, fontSize: '1.08rem'}}>
                            Date: <span style={{color: '#fff', fontWeight: 700}}>{formatDateDMY(date)}</span>
                            <span className="mx-2">|</span>
                            Shift: <span style={{color: '#fff', fontWeight: 700}}>{shift}</span>
                        </div>
                    </div>
                    <div className="table-responsive">
                      <Table className="records-table" hover responsive>
                        <thead>
                       
                          <tr>
                            <th>#</th>
                            <th>CODE</th>
                            <th>MILKTYPE</th>
                            <th>MEMBERNAME</th>
                          </tr>
                        </thead>
                        <tbody>
                          {absent?.length > 0 ? (
                            absent?.map((item, index) => (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{item.CODE}</td>
                                <td>{item.MILKTYPE === "C" ? "COW" : "BUF"}</td>
                                <td>{item.MEMBERNAME}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="text-center">
                                No absent members
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
                {(viewMode === "TOTALS" || viewMode === "ALL") && (
                  <Card className="records-card mb-4">
                    <div className="table-responsive">
                      <Table className="records-table" hover responsive>
                        <thead>
                          <tr>
                            <th>Total Members</th>
                            <th>Present Members</th>
                            <th>Absent Members</th>
                            <th>Cow Absent</th>
                            <th>Buffalo Absent</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{totalMembers}</td>
                            <td>{presentCount}</td>
                            <td>{absentCount}</td>
                            <td>{cowAbsentCount}</td>
                            <td>{bufAbsentCount}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>
                  </Card>
                )}
                <div className="mb-3">
                  <Button
                    variant="outline-primary"
                    className="me-2"
                    onClick={handleExportCSV}
                    disabled={totalMembers === 0}
                  >
                    <FontAwesomeIcon icon={faFileCsv} /> Export CSV
                  </Button>
                  <Button
                    variant="outline-primary"
                    onClick={handleExportPDF}
                    disabled={totalMembers === 0}
                  >
                    <FontAwesomeIcon icon={faFilePdf} /> Export PDF
                  </Button>
                </div>
              </>
            )}
          </Card.Body>
        </div>
      </div>
    </>
  );
};

export default AbsentMemberRecords;