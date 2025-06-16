import { faFileCsv, faSearch } from "@fortawesome/free-solid-svg-icons";
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
const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

const AbsentMemberRecords = () => {
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

  const deviceList = isAdmin ? allDevices : isDairy ? dairyDevices : [];

  const [deviceCode, setDeviceCode] = useState("");
  const [date, setDate] = useState(getToday());
  const [shift, setShift] = useState("MORNING");

  const [triggerFetch, setTriggerFetch] = useState(false);
  const [viewMode, setViewMode] = useState("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  useEffect(() => {
    if (isDevice && deviceid) setDeviceCode(deviceid);
  }, [isDevice, deviceid]);

  const handleSearch = () => {
    if (!deviceCode || !date || !shift) {
      errorToast("Please fill all required fields");
      return;
    }
    setTriggerFetch(true);
    setCurrentPage(1);

  };
  const formattedDate = date.split("-").reverse().join("/");

  const { data: resultData, isFetching } = useGetAbsentMemberReportQuery(
    {
      params: {
        deviceid: deviceCode, date: formattedDate, shift, page: currentPage,
        limit: recordsPerPage,
      }
    },
    { skip: !triggerFetch }
  );

  const absent = resultData?.absentMembers || [];
  const totalCount = resultData?.totalRecords;

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

    let combinedCSV = "";

    // Section: Absent Member Details
    if (absent.length > 0) {
      const memberCSV = absent.map((rec, index) => ({
        "S.No": index + 1,
        "Member Code": rec?.CODE,
        "Milk Type": rec?.MILKTYPE === "C" ? "COW" : "BUFFALO",
        "Member Name": rec?.MEMBERNAME || "",
      }));

      combinedCSV += `Absent Members Report\nDate: ${date}, Shift: ${shift}, Device Code: ${deviceCode}\n`;
      combinedCSV += Papa.unparse(memberCSV);
      combinedCSV += "\n\n";
    }

    // Section: Summary
    const summaryCSV = [
      {
        "Total Members": totalMembers,
        "Present Members": presentCount,
        "Absent Members": absentCount,
        "Cow Absent": cowAbsentCount,
        "Buffalo Absent": bufAbsentCount,
      },
    ];

    combinedCSV += `Summary\n`;
    combinedCSV += Papa.unparse(summaryCSV);

    const blob = new Blob([combinedCSV], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `${deviceCode}_Absent_Members_Report_${date}_${shift}.csv`);
  };

  const handleExportPDF = () => {
    if (totalMembers === 0) {
      alert("No data available to export.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 10;

    // Report title centered
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const title = "Absent Members Report";
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, (pageWidth - titleWidth) / 2, currentY);
    currentY += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${date}`, 14, currentY);
    doc.text(`Shift: ${shift}`, pageWidth - 50, currentY);
    currentY += 6;
    doc.text(`Device Code: ${deviceCode}`, 14, currentY);
    currentY += 8;

    // Table: Absent Members
    if (absent.length > 0) {
      const tableData = absent.map((rec, i) => [
        i + 1,
        rec?.CODE,
        rec?.MILKTYPE === "C" ? "COW" : "BUFFALO",
        rec?.MEMBERNAME || "",
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["S.No", "Member Code", "Milk Type", "Member Name"]],
        body: tableData,
        styles: { fontSize: 10 },
        theme: "grid",
      });

      currentY = doc.lastAutoTable.finalY + 10;
    }

    // Summary Table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, currentY);
    currentY += 6;

    const summaryTable = [
      [
        totalMembers,
        presentCount,
        absentCount,
        cowAbsentCount,
        bufAbsentCount,
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Total Members", "Present", "Absent", "Cow Absent", "Buffalo Absent"]],
      body: summaryTable,
      styles: { fontSize: 10 },
      theme: "striped",
    });

    doc.save(`${deviceCode}_Absent_Members_Report_${date}_${shift}.pdf`);
  };




  return (
    <>
      <div className="d-flex justify-content-between pageTitleSpace">
        <PageTitle name="ABESENT MEMBER RECORDS" pageItems={0} />
      </div>
      <div className="usersPage">
        <Card className="h-100">
          <div className="filters d-flex gap-3 p-3">
            {(isAdmin || isDairy) &&
              (isAdminLoading || isDairyLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <Form.Select
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
              ))}

            {isDevice && (
              <Form.Control type="text" value={deviceCode} readOnly />
            )}

            <Form.Select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            >
              <option value="MORNING">MORNING</option>
              <option value="EVENING">EVENING</option>
            </Form.Select>

            <Form.Control
              type="date"
              value={date}
              max={getToday()}
              onChange={(e) => setDate(e.target.value)}
            />
            <Form.Select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
            >
              <option value="ALL">All Data</option>

              <option value="TOTALS">Attendance Summary</option>
              <option value="ABSENT">Absent Members</option>
            </Form.Select>
            <Button
              variant="outline-primary"
              onClick={handleSearch}
              disabled={isFetching}
            >
              {isFetching ? (
                <Spinner size="sm" animation="border" />
              ) : (
                <FontAwesomeIcon icon={faSearch} />
              )}
            </Button>
          </div>

          <Card.Body className="cardbodyCss">
            {!triggerFetch ? (
              <div className="text-center my-5 text-muted">
                Please apply filters and click <strong>Search</strong> to view
                records.
              </div>
            ) : isFetching ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="primary" />
              </div>
            ) : (
              <>
                <hr />

                {(viewMode === "ABSENT" || viewMode == "ALL") && (
                  <>
                    <PageTitle name="Absent Members" />
                    <Table hover responsive>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>CODE</th>
                          <th>MILKTYPE</th>
                          <th>MEMBERNAME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {absent.length > 0 ? (
                          absent.map((absent, index) => (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td>{absent?.CODE}</td>
                              <td>{absent?.MILKTYPE == "C" ? "COW" : "BUF"}</td>
                              <td>{absent?.MEMBERNAME}</td>
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
                  </>
                )}
                {(viewMode === "TOTALS" || viewMode == "ALL") && (
                  <>
                    <PageTitle name="Attendance Summary" />
                    <Table hover responsive>
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
                  </>
                )}
                <Button
                  variant="outline-primary"
                  className="mb-3 me-2"
                  onClick={handleExportCSV}
                >
                  <FontAwesomeIcon icon={faFileCsv} /> Export CSV
                </Button>
                <Button
                  variant="outline-primary"
                  className="mb-3"
                  onClick={handleExportPDF}
                >
                  <FontAwesomeIcon icon={faFilePdf} /> Export PDF
                </Button>

                {(viewMode === "ABSENT" || viewMode === "ALL") && totalCount > 0 && (
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4">
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted">Rows per page:</span>
                      <Form.Select
                        size="sm"
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
      </div>
    </>
  );
};

export default AbsentMemberRecords;
