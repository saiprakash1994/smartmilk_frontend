import {
  faFileCsv,
  faFilePdf,
  faSearch,
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
      const recordsCSVData = records.map((record, index) => ({
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
      const cowData = cowMilkTypeTotals.map((cow) => ({
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
      const bufData = bufMilkTypeTotals.map((buf) => ({
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
      const memberTable = records.map((record, index) => [
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
      if (!data.length) return startY;

      doc.setFontSize(11);
      doc.text(title, 14, startY);
      startY += 4;

      const tableData = data.map((item) => [
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
    <>
      <div className="d-flex justify-content-between pageTitleSpace">
        <PageTitle name="CUMILATIVE RECORDS" pageItems={0} />
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

            {isDevice &&
              (isDeviceLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <Form.Control type="text" value={deviceCode} readOnly />
              ))}

            <Form.Select
              value={fromCode}
              onChange={(e) => setFromCode(e.target.value)}
            >
              <option value="">Select Start Member Code</option>
              {memberCodes.map((code, idx) => (
                <option
                  key={idx}
                  value={code.CODE}
                >{`${code.CODE} - ${code.MEMBERNAME}`}</option>
              ))}
            </Form.Select>
            <Form.Select
              value={toCode}
              onChange={(e) => setToCode(e.target.value)}
            >
              <option value="">Select End Member Code</option>
              {memberCodes.map((code, idx) => (
                <option
                  key={idx}
                  value={code.CODE}
                >{`${code.CODE} - ${code.MEMBERNAME}`}</option>
              ))}
            </Form.Select>

            <Form.Control
              type="date"
              value={fromDate}
              max={getToday()}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <Form.Control
              type="date"
              value={toDate}
              max={getToday()}
              onChange={(e) => setToDate(e.target.value)}
            />
            <Form.Select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
            >
              <option value="ALL">All DATA</option>
              <option value="TOTALS">All MilkType Totals</option>
              <option value="COWTOTALS">COW Totals</option>
              <option value="BUFFTOTALS">BUF Totals</option>
              <option value="DATA">Members Data </option>
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
            {!searchParams ? (
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
                {(viewMode == "DATA" || viewMode == "ALL") && (
                  <>
                    <PageTitle name="Members Data" />
                    <Table bordered responsive>
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
                        {records.length > 0 ? (
                          records?.map((record, index) => (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td>{record?.CODE}</td>
                              <td>{record?.MILKTYPE}</td>
                              <td>{record?.totalQty}</td>
                              <td>{record?.avgRate}</td>
                              <td>{record?.totalAmount}</td>
                              <td>{record?.totalIncentive}</td>
                              <td>{record?.grandTotal}</td>
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


                {(viewMode == "COWTOTALS" || viewMode == "ALL") && (
                  <>
                    <PageTitle name="Cow Totals" />
                    <Table bordered responsive>
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
                        {cowMilkTypeTotals.length > 0 ? (
                          cowMilkTypeTotals.map((cow, index) => (
                            <tr key={index}>
                              <td>{cow?.memberCount}</td>
                              <td>{cow?.MILKTYPE}</td>
                              <td>{cow?.totalQty}</td>
                              <td>{cow?.totalAmount}</td>
                              <td>{cow?.totalIncentive}</td>
                              <td>{cow?.grandTotal}</td>
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
                {(viewMode == "BUFFTOTALS" || viewMode == "ALL") && (
                  <>
                    <PageTitle name="Buf Totals" />
                    <Table bordered responsive>
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
                        {bufMilkTypeTotals.length > 0 ? (
                          bufMilkTypeTotals.map((buf, index) => (
                            <tr key={index}>
                              <td>{buf?.memberCount}</td>
                              <td>{buf?.MILKTYPE}</td>
                              <td>{buf?.totalQty}</td>
                              <td>{buf?.totalAmount}</td>
                              <td>{buf?.totalIncentive}</td>
                              <td>{buf?.grandTotal}</td>
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
                {(viewMode == "TOTALS" || viewMode == "ALL") && (
                  <>
                    <PageTitle name="All Totals" />
                    <Table hover responsive>
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
                          <td>{grandTotalQty}</td>
                          <td>{grandTotalIncentive}</td>
                          <td>{grandTotalAmount}</td>
                          <td>{grandTotal}</td>
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
                {(viewMode === "DATA" || viewMode === "ALL") && totalCount > 0 && (
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

export default CumilativeRecords;
