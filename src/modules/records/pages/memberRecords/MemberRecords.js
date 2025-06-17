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
      const recordsCSVData = records.map((rec, index) => ({
        "S.No": index + 1,
        Date: rec.SAMPLEDATE || "",
        Shift: rec.SHIFT || "",
        "Milk Type": rec.MILKTYPE || "",
        Fat: rec.FAT ?? "",
        SNF: rec.SNF ?? "",
        Qty: rec.QTY ?? "",
        Rate: rec.RATE ?? "",
        Amount: rec.AMOUNT?.toFixed(2) ?? "0.00",
        Incentive: rec.INCENTIVEAMOUNT?.toFixed(2) ?? "0.00",
        "Grand Total": rec.TOTAL?.toFixed(2) ?? "0.00",
      }));
      combinedCSV += "Record Summary:\n";
      combinedCSV += Papa.unparse(recordsCSVData);
      combinedCSV += "\n\n";
    }

    // Totals
    if (totals?.length) {
      const totalsCSVData = totals.map((total) => ({
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
      const recordsTable = records.map((record, index) => [
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
    <>
      <div className="d-flex justify-content-between pageTitleSpace">
        <PageTitle name="MEMBER RECORDS" pageItems={0} />
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
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
            >
              <option value="">Select Member Code</option>
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
              <option value="ALL">Show All Records</option>
              <option value="RECORDS">Only Records Summary</option>
              <option value="TOTALS">Only Record Totals</option>
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
                {viewMode !== "TOTALS" && (
                  <>
                    <PageTitle name="Record Summary" />
                    <Table hover responsive>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Date</th>
                          <th>Shift</th>
                          <th>Milk Type</th>
                          <th>Fat</th>
                          <th>SNF</th>
                          <th>Qty</th>
                          <th>Rate</th>
                          <th>Amount</th>
                          <th>Incentive</th>
                          <th>Grand Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.length > 0 ? (
                          records.map((record, index) => (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td>{record?.SAMPLEDATE}</td>
                              <td>{record?.MILKTYPE}</td>
                              <td>{record?.SHIFT}</td>
                              <td>{record?.QTY}</td>
                              <td>{record?.FAT}</td>
                              <td>{record?.SNF}</td>
                              <td>{record?.RATE}</td>
                              <td>{record?.AMOUNT.toFixed(2) || 0}</td>
                              <td>{record?.INCENTIVEAMOUNT.toFixed(2) || 0}</td>
                              <td>{record?.TOTAL.toFixed(2)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="9" className="text-center">
                              No records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </>
                )}
                {viewMode !== "RECORDS" && (
                  <>
                    <PageTitle name="Total Records" />
                    <Table bordered responsive>
                      <thead>
                        <tr>
                          <th>Milk Type</th>
                          <th>Total Records</th>
                          <th>Avg Fat</th>
                          <th>Avg SNF</th>
                          <th>Total Qty</th>
                          <th>Avg Rate</th>
                          <th>Total Amount</th>
                          <th>Total Incentive</th>
                          <th>Grand Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {totals.length > 0 ? (
                          totals.map((total, index) => (
                            <tr key={index}>
                              <td>{total._id.milkType}</td>
                              <td>{total.totalRecords}</td>
                              <td>{total.averageFat}</td>
                              <td>{total.averageSNF}</td>
                              <td>{total.totalQuantity}</td>
                              <td>{total.averageRate}</td>
                              <td>{total.totalAmount}</td>
                              <td>{total.totalIncentive}</td>
                              <td>
                                {`${(
                                  parseFloat(total.totalAmount) +
                                  parseFloat(total.totalIncentive)
                                ).toFixed(2)}`}
                              </td>
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
                {viewMode !== "TOTALS" && totalCount > 0 && (
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

export default MemberRecords;
