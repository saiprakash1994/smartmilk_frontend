import React, { useState } from "react";
import "./PriceTableGenerator.scss";
import { useNavigate } from "react-router-dom";

import Papa from "papaparse";

import {
  Card,
  Table,
  Form,
  Row,
  Col,
  InputGroup,
  Button,
} from "react-bootstrap";
import {
  FaFileCsv,
  FaFileUpload,
  FaSyncAlt,
  FaTable,
  FaTint,
  FaVial,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { roles } from "../../../../shared/utils/appRoles";
import { useGetDeviceByCodeQuery } from "../../../device/store/deviceEndPoint";
import { set } from "lodash";

const StdSnfRateTable = () => {
  const [table, setTable] = useState({
    fatValues: [],
    snfValues: [],
    rows: [],
  });
  const navigate = useNavigate();

  const [milkType, setMilkType] = useState("Buf");
  const [tableError, setTableError] = useState("");
  const [fatStart, setFatStart] = useState("5.0");
  const [fatEnd, setFatEnd] = useState("8.0");
  const [snfStart, setSnfStart] = useState("8.0");
  const [snfEnd, setSnfEnd] = useState("10.0");
  const [basePrice, setBasePrice] = useState("100");
  const [stepType, setStepType] = useState("SNF");
  const [standardSnf, setStandardSnf] = useState(parseFloat(snfStart) + 0.5);
  const [lowSnfDecrement, setLowSnfDecrement] = useState(0.1);
  const [highSnfIncrement, setHighSnfIncrement] = useState(0.2);

  // Add user and device selection state
  const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
  const userType = UserTypeHook();
  const isDairy = userType === roles.DAIRY;
  const dairyCode = userInfo?.dairyCode;
  const [selectedDeviceId, setSelectedDeviceId] = useState(""); // Default to All Devices
  const { data: dairyDevices = [], isLoading: isDairyLoading } =
    useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy || !dairyCode });

  let snfOrClrLabel = "SNF";

  const handleReset = () => {
    setBasePrice("100.00");
    setFatStart(milkType === "Cow" ? "2.5" : "5.0");
    setFatEnd(milkType === "Cow" ? "4.9" : "10.0  ");
    setSnfStart(milkType === "Cow" ? "7.5" : "8.0");
    setSnfEnd(milkType === "Cow" ? "8.6" : "10.0");
    setStandardSnf(milkType === "Cow" ? "8.0" : "8.5");
    setLowSnfDecrement("0.10");
    setHighSnfIncrement("0.20");
    setTableError("");
    setTable({
      fatValues: [],
      snfValues: [],
      rows: [],
    });
  };

  const handleDownloadCSV = () => {
    if (!table.rows.length) return;
    // Build CSV data: first row is header, then each row is [fat, ...rates]
    const csvData = [
      ["f \\ s", ...table.snfValues],
      ...table.fatValues.map((fat, i) => [fat, ...table.rows[i]]),
    ];
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const milkTypeShort = milkType === "Cow" ? "COW" : "BUF";
    const stepTypeShort = stepType === "FAT + CLR" ? "CLR" : "SNF";
    const filename = `${stepTypeShort}_${milkTypeShort}_Standard.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadCSV = () => {
    if (!table.rows.length) return;
    const csvData = [
      ["f \\ s", ...table.snfValues],
      ...table.fatValues.map((fat, i) => [fat, ...table.rows[i]]),
    ];
    const csv = Papa.unparse(csvData);
    const milkTypeShort = milkType === "Cow" ? "COW" : "BUF";
    const stepTypeShort = stepType === "FAT + CLR" ? "CLR" : "SNF";
    const filename = `${stepTypeShort}_${milkTypeShort}Standard.csv`;
    // Pass CSV and info to uploads page
    // For dairy user, pass selectedDeviceId; for others, pass dairyCode or deviceid as before
    let uploadState = {
      csv,
      filename,
      milkType: milkTypeShort,
      stepType: stepTypeShort,
    };
    if (isDairy && selectedDeviceId) {
      uploadState.deviceId = selectedDeviceId;
    } else if (userInfo?.deviceid) {
      uploadState.deviceId = userInfo.deviceid;
    } else if (userInfo?.dairyCode) {
      uploadState.dairyCode = userInfo.dairyCode;
    }
    // Add preferredUploadTab for FAT + CLR
    if (stepType === "FAT + CLR") {
      uploadState.preferredUploadTab =
        milkType === "Cow" ? "clr-cow" : "clr-buf";
    }
    // Add return path to identify this came from NewRateTableGenerator
    uploadState.returnPath = "/ratetable-stdsnf";
    uploadState.sourcePage = "StdSnfRateTable";
    navigate("/uploads", { state: uploadState });
  };

  const generateTable = () => {
    // Convert all string inputs to numbers
    const fatStartNum = parseFloat(fatStart);
    const fatEndNum = parseFloat(fatEnd);
    const snfStartNum = parseFloat(snfStart);
    const snfEndNum = parseFloat(snfEnd);

    const basePriceNum = parseFloat(basePrice);
    const standardSnfNum = parseFloat(standardSnf);
    const lowSnfDecrementNum = parseFloat(lowSnfDecrement);
    const highSnfIncrementNum = parseFloat(highSnfIncrement);

    // Validation: max should not be less than min
    if (fatEndNum < fatStartNum) {
      setTableError("Fat maximum value should not be less than minimum value.");
      return;
    }
    if (snfEndNum < snfStartNum) {
      setTableError("SNF maximum value should not be less than minimum value.");
      return;
    }

    // Validation: standard SNF must be between min and max
    if (standardSnfNum < snfStartNum || standardSnfNum > snfEndNum) {
      setTableError(
        "Standard SNF value must be between SNF minimum and maximum."
      );
      return;
    }

    setTableError(""); // Clear previous errors

    const fatValues = [];
    const snfValues = [];
    for (
      let fat = fatStartNum;
      fat <= fatEndNum;
      fat = +(fat + 0.1).toFixed(1)
    ) {
      fatValues.push(+fat.toFixed(1));
    }
    for (
      let snf = snfStartNum;
      snf <= snfEndNum;
      snf = +(snf + 0.1).toFixed(1)
    ) {
      snfValues.push(+snf.toFixed(1));
    }

    const rows = fatValues.map((fat) => {
      return snfValues.map((snf) => {
        let rate = (fat * basePriceNum) / 100;
        if (snf < standardSnfNum) {
          rate -= (standardSnfNum - snf) * 10 * lowSnfDecrementNum;
        } else if (snf > standardSnfNum) {
          rate += (snf - standardSnfNum) * 10 * highSnfIncrementNum;
        }
        return rate.toFixed(2);
      });
    });

    setTable({ fatValues, snfValues, rows });
  };

  const handleMilkTypeChange = (e) => {
    const type = e.target.value;
    setMilkType(type);
    if (type === "Cow") {
      setFatStart("2.5");
      setFatEnd("4.9");
      if (stepType === "FAT + CLR") {
        setSnfStart("24");
        setSnfEnd("26");
      } else {
        setSnfStart("7.5");
        setSnfEnd("8.6");
      }
    } else if (type === "Buffalo") {
      setFatStart("5.0");
      setFatEnd("10.0");
      if (stepType === "FAT + CLR") {
        setSnfStart("26");
        setSnfEnd("30");
      } else {
        setSnfStart("8.0");
        setSnfEnd("10.0");
      }
    }
    // setFatRules([]);
    // setSnfRules([]);
    // setFatRuleError("");
    // setSnfRuleError("");
    // setError("");
    // setMatrixTable([]);
  };

  return (
    <div className="ratetable-page" style={{ padding: "18px" }}>
      <Card
        className="price-table-generator-card mx-auto"
        style={{
          maxWidth: 900,
          boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          borderRadius: 18,
        }}
      >
        <Card.Header
          className="position-relative"
          style={{
            borderRadius: "18px 18px 0 0",
            padding: "0.75rem",
            background: "linear-gradient(135deg, #2b50a1 0%, #4f8fe8 100%)",
            color: "whitesmoke",
          }}
        >
          <div className="d-flex w-100 align-items-center justify-content-between position-relative">
            <div className="d-flex flex-column">
              <span className="d-flex align-items-center mb-1">
                {/* <FaTable size={18} className="me-2" /> */}
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    marginBottom: 0,
                    textAlign: "left",
                  }}
                >
                  Milk Rate Table Generator(Standard SNF for Buffalo)
                </span>
              </span>
              <div
                style={{ fontSize: "1rem", opacity: 0.9, textAlign: "left" }}
              >
                Generate, download and upload milk rate tables with standard snf
              </div>
            </div>
            {/* Device id and change button at the right */}
            {isDairy && selectedDeviceId && (
              <div className="d-flex align-items-center gap-3 ms-auto">
                <button
                  type="button"
                  className="btn btn-sm rounded-pill"
                  style={{
                    background: "whitesmoke",
                    color: "#2b50a1",
                    fontWeight: 600,
                    fontSize: "1rem",
                    minWidth: 80,
                  }}
                >
                  {selectedDeviceId}
                </button>
                <button
                  type="button"
                  className="btn btn-sm rounded-pill"
                  style={{
                    background: "whitesmoke",
                    color: "#2b50a1",
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                  onClick={() => setSelectedDeviceId("")}
                >
                  Change Device
                </button>
              </div>
            )}
          </div>
        </Card.Header>

        <Card.Body>
          {isDairy && !selectedDeviceId && (
            <div
              className="d-flex flex-row align-items-center gap-2 mb-3"
              style={{ maxWidth: 400, margin: "0 auto" }}
            >
              <Form.Label className="fw-bold mb-0" style={{ minWidth: 70 }}>
                Device
              </Form.Label>
              <Form.Select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                disabled={isDairyLoading}
                style={{ flex: 1 }}
              >
                <option value="">All Devices</option>
                {dairyDevices?.map((dev) => (
                  <option key={dev.deviceid} value={dev.deviceid}>
                    {dev.deviceid}
                  </option>
                ))}
              </Form.Select>
              {isDairyLoading && (
                <div className="text-center text-secondary mt-2">
                  Loading devices...
                </div>
              )}
            </div>
          )}
          {(!isDairy || (isDairy && selectedDeviceId !== undefined)) && (
            <div className="row justify-content-center g-4">
              {/* FAT Section */}
              <div className="col-12 col-md-6 d-flex flex-column align-items-center">
                <Card className="ratetable-page config-section-card fat-config-card m-2 w-100">
                  <Card.Header
                    className="config-section-header fat-section-header d-flex align-items-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #2b50a1 0%, #4f8fe8 100%)",
                      color: "whitesmoke",
                    }}
                  >
                    <FaTint className="me-2" /> FAT Configuration
                  </Card.Header>
                  <Card.Body>
                    {/* Limits Section Label */}
                    <div
                      className="fw-bold mb-1"
                      style={{
                        fontSize: "1.08rem",
                        color: "#2b50a1",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Limits:
                    </div>
                    <div className="row">
                      <div className="col-6">
                        <Form.Label
                          className="fw-bold text-center w-100"
                          style={{ margin: "2px" }}
                        >
                          Minimum
                        </Form.Label>
                        <Form.Control
                          type="text"
                          inputMode="decimal"
                          step="0.1"
                          value={fatStart}
                          className="text-center"
                          onChange={(e) => {
                            setTableError(""); // <-- Clear error on change
                            const val = e.target.value;
                            if (/^\d*(\.\d{0,1})?$/.test(val)) {
                              setFatStart(val);
                            }
                          }}
                          onBlur={(e) => {
                            if (fatStart !== "")
                              setFatStart(Number(fatStart).toFixed(1));
                          }}
                        />
                      </div>
                      <div className="col-6">
                        <Form.Label
                          className="fw-bold text-center w-100"
                          style={{ margin: "2px" }}
                        >
                          Maximum
                        </Form.Label>
                        <Form.Control
                          type="text"
                          inputMode="decimal"
                          step="0.1"
                          value={fatEnd}
                          className="text-center"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*(\.\d{0,1})?$/.test(val)) {
                              setFatEnd(val);
                            }
                          }}
                          onBlur={(e) => {
                            if (fatEnd !== "")
                              setFatEnd(Number(fatEnd).toFixed(1));
                          }}
                        />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
              {/* SNF/CLR Section */}
              <div className="col-12 col-md-6 d-flex flex-column align-items-center">
                <Card className="ratetable-page config-section-card snf-config-card m-2 w-100">
                  <Card.Header
                    className="config-section-header snf-section-header d-flex align-items-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #2b50a1 0%, #4f8fe8 100%)",
                      color: "whitesmoke",
                    }}
                  >
                    <FaVial className="me-2" /> {snfOrClrLabel} Configuration
                  </Card.Header>
                  <Card.Body>
                    {/* Limits Section Label */}
                    <div
                      className="fw-bold mb-1"
                      style={{
                        fontSize: "1.08rem",
                        color: "#2b50a1",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Limits:
                    </div>
                    <div className="row g-3 mb-2">
                      <div className="col-6">
                        <Form.Label
                          className="fw-bold text-center w-100"
                          style={{ margin: "2px" }}
                        >
                          Minimum
                        </Form.Label>
                        <Form.Control
                          type="text"
                          inputMode="decimal"
                          step="0.1"
                          value={snfStart}
                          className="text-center"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*(\.\d{0,1})?$/.test(val)) {
                              setSnfStart(val);
                            }
                          }}
                          onBlur={(e) => {
                            if (snfStart !== "")
                              setSnfStart(Number(snfStart).toFixed(1));
                          }}
                        />
                      </div>
                      <div className="col-6">
                        <Form.Label
                          className="fw-bold text-center w-100"
                          style={{ margin: "2px" }}
                        >
                          Maximum
                        </Form.Label>
                        <Form.Control
                          type="text"
                          inputMode="decimal"
                          step="0.1"
                          value={snfEnd}
                          className="text-center"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*(\.\d{0,1})?$/.test(val)) {
                              setSnfEnd(val);
                            }
                          }}
                          onBlur={(e) => {
                            if (snfEnd !== "")
                              setSnfEnd(Number(snfEnd).toFixed(1));
                          }}
                        />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
              <div>
                <Card
                  className="ratetable-page selection-section-card p-0"
                  // style={{ margin: "24px " }} // Add top and bottom margin
                >
                  <Card.Header
                    className="selection-section-header d-flex align-items-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #2b50a1 0%, #4f8fe8 100%)",
                      color: "whitesmoke",
                    }}
                  >
                    <FaTable className="me-2" /> Options
                  </Card.Header>
                  <Card.Body>
                    <Row className="gx-3 gy-3 align-items-end justify-content-center">
                      <Col md={3} xs={12} className="mb-2 mb-md-0 text-center">
                        <Form.Label className="mb-1 fw-bold">
                          Base Price
                        </Form.Label>
                        <div className="d-flex justify-content-center">
                          <InputGroup className="rupee-group w-auto">
                            <InputGroup.Text className="fs-6 rupee-toggle-color">
                              ₹
                            </InputGroup.Text>
                            <Form.Control
                              className="base-price-input base-price-input-sm"
                              type="text"
                              inputMode="decimal"
                              step="0.01"
                              value={basePrice}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*(\.\d{0,2})?$/.test(val)) {
                                  setBasePrice(val);
                                }
                              }}
                              onBlur={(e) => {
                                if (basePrice !== "")
                                  setBasePrice(Number(basePrice).toFixed(2));
                              }}
                              required
                            />
                          </InputGroup>
                        </div>
                      </Col>
                      <Col md={3} xs={12} className="mb-1 mb-md-0 text-center">
                        <Form.Label className="mb-1 fw-bold">
                          Standard SNF
                        </Form.Label>
                        <div className="d-flex justify-content-center">
                          <InputGroup className="rupee-group w-auto">
                            <InputGroup.Text className="fs-6 rupee-toggle-color">
                              %
                            </InputGroup.Text>
                            <Form.Control
                              className="base-price-input base-price-input-sm"
                              type="text"
                              inputMode="decimal"
                              step="0.01"
                              value={standardSnf}
                              onChange={(e) => {
                                setTableError("");
                                const val = e.target.value;
                                if (/^\d*(\.\d{0,2})?$/.test(val)) {
                                  setStandardSnf(val);
                                }
                              }}
                              onBlur={(e) => {
                                if (standardSnf !== "")
                                  setStandardSnf(
                                    Number(standardSnf).toFixed(1)
                                  );
                              }}
                              required
                            />
                          </InputGroup>
                        </div>
                      </Col>
                      <Col md={3} xs={12} className="mb-1 mb-md-0 text-center">
                        <Form.Label className="mb-1 fw-bold">
                          Decrement Amount
                        </Form.Label>
                        <div className="d-flex justify-content-center">
                          <InputGroup className="rupee-group w-auto">
                            <InputGroup.Text className="fs-6 rupee-toggle-color">
                              ₹
                            </InputGroup.Text>
                            <Form.Control
                              className="base-price-input base-price-input-sm"
                              type="text"
                              inputMode="decimal"
                              step="0.01"
                              value={lowSnfDecrement}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*(\.\d{0,2})?$/.test(val)) {
                                  setLowSnfDecrement(val);
                                }
                              }}
                              onBlur={(e) => {
                                if (lowSnfDecrement !== "")
                                  setLowSnfDecrement(
                                    Number(lowSnfDecrement).toFixed(2)
                                  );
                              }}
                              required
                            />
                          </InputGroup>
                        </div>
                      </Col>
                      <Col md={3} xs={12} className="mb-1 mb-md-0 text-center">
                        <Form.Label className="mb-1 fw-bold">
                          Increment Amount
                        </Form.Label>
                        <div className="d-flex justify-content-center">
                          <InputGroup className="rupee-group w-auto">
                            <InputGroup.Text className="fs-6 rupee-toggle-color">
                              ₹
                            </InputGroup.Text>
                            <Form.Control
                              className="base-price-input base-price-input-sm"
                              type="text"
                              inputMode="decimal"
                              step="0.01"
                              value={highSnfIncrement}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*(\.\d{0,2})?$/.test(val)) {
                                  setHighSnfIncrement(val);
                                }
                              }}
                              onBlur={(e) => {
                                if (highSnfIncrement !== "")
                                  setHighSnfIncrement(
                                    Number(highSnfIncrement).toFixed(2)
                                  );
                              }}
                              required
                            />
                          </InputGroup>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </div>
            </div>
          )}
          {/* Actions */}
          <div className="d-flex gap-3 justify-content-center mb-3">
            <Button
              style={{
                background:
                  "linear-gradient(135deg, #dc3545 0%, #e83e8c 100%) ! important",
                color: "whitesmoke",
                fontSize: "1.0em",
                fontWeight: "500",
              }}
              // type="submit"
              onClick={generateTable}
              //disabled={!canGenerate}
            >
              <FaTable className="me-1" />
              Generate Table
            </Button>
            <Button
              style={{
                background: "linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)",
                color: "whitesmoke",
                fontSize: "1.0em",
                fontWeight: "500",
              }}
              onClick={handleReset}
            >
              <FaSyncAlt className="me-1" />
              Reset
            </Button>
            {table.rows.length > 0 && (
              <>
                <Button
                  style={{
                    background:
                      "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                    color: "whitesmoke",
                    fontSize: "1.0em",
                    fontWeight: "500",
                  }}
                  className="me-1"
                  onClick={handleDownloadCSV}
                >
                  <FaFileCsv className="me-1" />
                  Download CSV
                </Button>
                <Button
                  style={{
                    background:
                      "linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)",
                    color: "whitesmoke",
                    fontSize: "1.0em",
                    fontWeight: "500",
                  }}
                  className="me-1"
                  onClick={handleUploadCSV}
                >
                  <FaFileUpload />
                  Upload CSV
                </Button>
              </>
            )}
          </div>
          {tableError && (
            <div className="text-center text-danger mb-3">
              <FaExclamationTriangle className="me-2" />
              {tableError}
            </div>
          )}
        </Card.Body>
      </Card>
      <div className="m-4">
        {" "}
        {/* Result Table */}
        {table.rows.length > 0 && (
          <Card>
            <Card.Header
              style={{
                background: "linear-gradient(135deg, #2b50a1 0%, #4f8fe8 100%)",
                color: "whitesmoke",
              }}
            >
              Generated Rate Table
            </Card.Header>
            <Card.Body>
              <div style={{ maxHeight: 500, overflow: "auto" }}>
                <Table
                  style={{ border: "2px solid #2b50a1" }}
                  striped
                  bordered
                  hover
                  responsive
                  size="sm"
                >
                  <thead className="sticky-header">
                    <tr>
                      <th style={{ textAlign: "center" }}>f/s</th>
                      {table.snfValues.map((snf, idx) => (
                        <th
                          key={idx}
                          style={{
                            color: "black",
                            fontWeight: "bold",
                            textAlign: "center",
                          }}
                        >
                          {snf}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.fatValues.map((fat, ridx) => (
                      <tr key={ridx}>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>
                          {fat}
                        </td>
                        {table.rows[ridx].map((rate, cidx) => (
                          <td key={cidx} style={{ textAlign: "center" }}>
                            {rate}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StdSnfRateTable;
