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
  const [triggerFetch, setTriggerFetch] = useState(false);
  const [viewMode, setViewMode] = useState("ALL");

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
    setTriggerFetch(true);
  };

  const { data: resultData, isFetching } = useGetMemberCodewiseReportQuery(
    { params: { deviceCode, memberCode, fromDate, toDate } },
    { skip: !triggerFetch }
  );

  const records = resultData?.records || [];
  const totals = resultData?.totals || [];
  const handleExportCSV = () => {
    if (!totals?.length && !records?.length) {
      alert("No data available to export.");
      return;
    }

    let combinedCSV = "";
    if (records?.length) {
      const recordsCSVData = records.map((rec, index) => ({
        SNO: index + 1,
        Date: rec.SAMPLEDATE,
        Shift: rec?.SHIFT,
        MilkType: rec?.MILKTYPE,
        Fat: rec?.FAT,
        SNF: rec?.SNF,
        Qty: rec?.QTY,
        Rate: rec?.RATE,
        Amount: rec?.AMOUNT?.toFixed(2),
        Incentive: rec?.INCENTIVEAMOUNT?.toFixed(2),
        GrandTotal: rec?.TOTAL?.toFixed(2),
      }));

      combinedCSV += `Device Code:${deviceCode}\n`;

      combinedCSV += `Member Code:${memberCode.padStart(4, "0")}\n`;

      combinedCSV += `Member Records From ${fromDate} to ${toDate}\n`;

      combinedCSV += Papa.unparse(recordsCSVData);
      combinedCSV += "\n\n";
    }

    if (totals?.length) {
      const totalsCSVData = totals.map((total) => ({
        MilkType: total?._id.milkType,
        Samples: total?.totalRecords,
        AverageFat: total?.averageFat,
        AverageSNF: total?.averageSNF,
        AverageRate: total?.averageRate,
        TotalQuantity: total?.totalQuantity,
        TotalAmount: total?.totalAmount,
        TotalIncentive: total?.totalIncentive,
        GrandTotal: `${(
          parseFloat(total?.totalAmount || 0) +
          parseFloat(total?.totalIncentive || 0)
        ).toFixed(2)}`,
      }));

      combinedCSV += `Summary:\n`;
      combinedCSV += Papa.unparse(totalsCSVData);
    }

    const blob = new Blob([combinedCSV], { type: "text/csv;charset=utf-8" });
    saveAs(
      blob,
      `${memberCode.padStart(4, "0")}_Memberwise_Report_${getToday()}.csv`
    );
  };

  const handleExportPDF = () => {
    if (!totals?.length && !records?.length) {
      alert("No data available to export.");
      return;
    }

    const doc = new jsPDF();
    let currentY = 10;
    if (records?.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      const pageWidth = doc.internal.pageSize.getWidth();
      const text = "MEMBERWISE REPORT";
      const textWidth = doc.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;

      doc.text(text, x, currentY);
      currentY += 8;

      doc.setFontSize(16);
      doc.text(`Device Code: ${deviceCode}`, 14, currentY);

      // Right side: Shift
      const memberText = `Member Code: ${memberCode.padStart(4, "0")}`;
      const memberTextWidth = doc.getTextWidth(memberText);
      doc.text(memberText, pageWidth - 14 - memberTextWidth, currentY);
      currentY += 8;

      doc.text(`Records From ${fromDate} to ${toDate}`, 14, currentY);
      currentY += 1; // ⬅️ Add more space before table or next section
      const recordsTable = records.map((record, index) => [
        index + 1,
        record?.SAMPLEDATE,
        record?.MILKTYPE,
        record?.SHIFT,
        record?.QTY,
        record?.FAT,
        record?.SNF,
        record?.RATE,
        record?.AMOUNT.toFixed(2) || 0,
        record?.INCENTIVEAMOUNT.toFixed(2) || 0,
        record?.TOTAL.toFixed(2) || 0,
      ]);

      autoTable(doc, {
        head: [
          [
            "S.No",
            "Date",
            "Shift",
            "Milk Type",
            "Fat",
            "Snf",
            "Qty",
            "Rate",
            "Amount",
            "Incentive",
            "Grand Total",
          ],
        ],
        body: recordsTable,
        startY: currentY,
        theme: "grid",
        styles: { fontSize: 10 },
      });

      currentY = (doc.lastAutoTable?.finalY || currentY) + 10;
    }

    if (totals?.length) {
      doc.setFontSize(12);
      doc.text(`Summary:`, 14, currentY);
      currentY += 1;
      const totalsTable = totals.map((total) => [
        total._id.milkType,
        total.totalRecords,
        total.averageFat,
        total.averageSNF,
        total.totalQuantity,
        total.averageRate,
        total.totalAmount,
        total.totalIncentive,
        `${(
          parseFloat(total.totalAmount) + parseFloat(total.totalIncentive)
        ).toFixed(2)}`,
      ]);

      autoTable(doc, {
        head: [
          [
            "Milk Type",
            "Total Samples",
            "Avg FAT",
            "Avg SNF",
            "Total Qty",
            "Avg Rate",
            "Total Amount",
            "Total Incentive",
            "Grand Total",
          ],
        ],
        body: totalsTable,
        startY: currentY,
        theme: "striped",
        styles: { fontSize: 10 },
      });
    }

    doc.save(
      `${memberCode.padStart(4, "0")}_Memberwise_Report_${getToday()}.pdf`
    );
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
              </>
            )}
          </Card.Body>
        </Card>
      </div>
    </>
  );
};

export default MemberRecords;
