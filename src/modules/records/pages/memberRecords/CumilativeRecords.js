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
  const [triggerFetch, setTriggerFetch] = useState(false);
  const [viewMode, setViewMode] = useState("TOTALS");

  // Set default deviceCode for device user
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
    setTriggerFetch(true);
  };
  const formattedFromDate = fromDate.split("-").reverse().join("/");
  const formattedToDate = toDate.split("-").reverse().join("/");

  const { data: resultData, isFetching } = useGetCumulativeReportQuery(
    {
      params: {
        deviceid: deviceCode,
        fromCode,
        toCode,
        fromDate: formattedFromDate,
        toDate: formattedToDate,
      },
    },
    { skip: !triggerFetch }
  );
  console.log(resultData, "data");

  const records = resultData?.data || [];
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

    let combinedCSV = "";

    if (records?.length) {
      const recordsCSVData = records.map((record, index) => ({
        SNO: index + 1,
        Code: record?.CODE,
        MILKTYPE: record?.MILKTYPE,
        TotalQty: record?.totalQty,
        AvgRate: record?.avgRate,
        TotalAmount: record?.totalAmount,
        TotalIncentive: record?.totalIncentive,
        GrandTotal: record?.grandTotal,
      }));

      combinedCSV += `Device Code: ${deviceCode}\n`;
      combinedCSV += `Members:${fromCode} to ${toCode} \n`;
      combinedCSV += `Records from ${fromDate} to ${toDate}\n`;
      combinedCSV += Papa.unparse(recordsCSVData);
      combinedCSV += "\n\n";
    }
    let finalCSVData = [];

    if (cowMilkTypeTotals?.length) {
      cowMilkTypeTotals.forEach((cow) => {
        finalCSVData.push({
          //Type: "COW",
          MilkType: cow?.MILKTYPE,
          MemberCount: cow?.memberCount,
          TotalQty: cow?.totalQty,
          TotalAmount: cow?.totalAmount,
          TotalIncentive: cow?.totalIncentive,
          GrandTotal: cow?.grandTotal,
        });
      });
    }

    if (bufMilkTypeTotals?.length) {
      bufMilkTypeTotals.forEach((buf) => {
        finalCSVData.push({
          // Type: "BUF",
          MilkType: buf?.MILKTYPE,
          MemberCount: buf?.memberCount,

          TotalQty: buf?.totalQty,
          TotalAmount: buf?.totalAmount,
          TotalIncentive: buf?.totalIncentive,
          GrandTotal: buf?.grandTotal,
        });
      });
    }

    if (totalMembers !== 0) {
      finalCSVData.push({
        //Type: "TOTAL",
        MilkType: "TOTAL",
        MemberCount: totalMembers,
        TotalQty: grandTotalQty,
        TotalAmount: grandTotalAmount,
        TotalIncentive: grandTotalIncentive,
        GrandTotal: grandTotal,
      });
    }
    combinedCSV += Papa.unparse(finalCSVData);

    const blob = new Blob([combinedCSV], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `${deviceCode}_Payment_Register.csv`);
  };

  const handleExportPDF = () => {
    if (totalMembers === 0) {
      alert("No data available to export.");
      return;
    }

    const doc = new jsPDF();
    let currentY = 10;

    if (records?.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      const pageWidth = doc.internal.pageSize.getWidth();
      const text = "Payment Register";
      const textWidth = doc.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;

      doc.text(text, x, currentY);
      currentY += 10;

      doc.setFontSize(16);
      doc.text(`Device Code: ${deviceCode}`, 14, currentY);

      // Right side: Shift
      const memberText = `Members: ${fromCode} to ${toCode}`;
      const memberTextWidth = doc.getTextWidth(memberText);
      doc.text(memberText, pageWidth - 14 - memberTextWidth, currentY);
      currentY += 8;

      doc.text(`Records from ${fromDate} to ${toDate}`, 14, currentY);
      currentY += 2;

      const recordsTable = records.map((record, index) => [
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
            "Total Incentive",
            "Total Amount",
            "Grand Total",
          ],
        ],
        body: recordsTable,
        startY: currentY,
        theme: "grid",
        styles: { fontSize: 8 },
      });

      currentY = (doc.lastAutoTable?.finalY || currentY) + 10;
    }

    if (cowMilkTypeTotals.length) {
      doc.setFontSize(12);
      //   doc.text(
      //     `Cumulative Cow Records for ${fromCode} to ${toCode} members from ${fromDate} to ${toDate} in device ${deviceCode}`,
      //     14,
      //     currentY
      //   );
      //   currentY += 6;

      const cowTotalsTable = cowMilkTypeTotals.map((cow) => [
        cow?.memberCount,
        cow?.MILKTYPE,
        cow?.totalQty,
        cow?.totalAmount,
        cow?.totalIncentive,
        cow?.grandTotal,
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
        body: cowTotalsTable,
        startY: currentY,
        theme: "striped",
        styles: { fontSize: 10 },
      });

      currentY = (doc.lastAutoTable?.finalY || currentY) + 5;
    }

    if (bufMilkTypeTotals.length) {
      doc.setFontSize(12);
      //   doc.text(
      //     `Cumulative Buffalo Totals for ${fromCode} to ${toCode} members from ${fromDate} to ${toDate} in device ${deviceCode}`,
      //     14,
      //     currentY
      //   );
      //   currentY += 6;

      const bufTotalsTable = bufMilkTypeTotals.map((buf) => [
        buf?.memberCount,
        buf?.MILKTYPE,
        buf?.totalQty,
        buf?.totalAmount,
        buf?.totalIncentive,
        buf?.grandTotal,
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
        body: bufTotalsTable,
        startY: currentY,
        theme: "striped",
        styles: { fontSize: 10 },
      });

      currentY = (doc.lastAutoTable?.finalY || currentY) + 5;
    }

    if (totalMembers !== 0) {
      //   doc.setFontSize(12);

      //   doc.text(
      //     `Cumulative Totals for ${fromCode} to ${toCode} members from ${fromDate} to ${toDate} in device ${deviceCode}`,
      //     14,
      //     currentY
      //   );
      //   currentY += 6;

      const TotalsTable = [
        [
          totalMembers,
          grandTotalQty,
          grandTotalIncentive,
          grandTotalAmount,
          grandTotal,
        ],
      ];

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
        body: TotalsTable,
        startY: currentY,
        theme: "striped",
        styles: { fontSize: 10 },
      });
    }

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
                {viewMode == "TOTALS" && (
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

                {viewMode == "COWTOTALS" && (
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
                {viewMode == "BUFFTOTALS" && (
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
                {viewMode == "DATA" && (
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
                    <hr />
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
                    <hr />
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
                    <hr />
                    <PageTitle name="All Totals" />
                    <Table hover responsive>
                      <thead>
                        <tr>
                          <th>Total Members</th>
                          <th>Grand Total Qty</th>
                          <th>Grand Total Amount</th>
                          <th>Grand Total Incentive</th>
                          <th>Grand Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{totalMembers}</td>
                          <td>{grandTotalQty}</td>
                          <td>{grandTotalAmount}</td>
                          <td>{grandTotalIncentive}</td>
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
              </>
            )}
          </Card.Body>
        </Card>
      </div>
    </>
  );
};

export default CumilativeRecords;
