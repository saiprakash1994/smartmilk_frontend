import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PriceTableGenerator.scss";

import {
  Card,
  Form,
  Button,
  Table,
  InputGroup,
  Alert,
  Col,
  Row,
  ButtonGroup,
  ToggleButton,
} from "react-bootstrap";
import Papa from "papaparse";
import {
  FaFileCsv,
  FaFileUpload,
  FaPlus,
  FaRupeeSign,
  FaSyncAlt,
  FaTable,
  FaTrash,
  FaUpload,
  FaTint,
  FaVial,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { roles } from "../../../../shared/utils/appRoles";
import { useGetDeviceByCodeQuery } from "../../../device/store/deviceEndPoint";

// Helper: validate that rules cover [start, end] continuously without gaps/overlaps
function validateContinuousRules(rules, start, end, stepPrecisionLabel) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return `Please add at least one ${stepPrecisionLabel} step.`;
  }
  // Normalize to numbers with one decimal
  const norm = (n) => Number(Number(n).toFixed(1));
  const s = norm(start);
  const e = norm(end);
  for (let i = 0; i < rules.length; i++) {
    const from = norm(rules[i].from);
    const to = norm(rules[i].to);
    if (isNaN(from) || isNaN(to))
      return `${stepPrecisionLabel} step #${i + 1} has invalid limits.`;
    if (to < from)
      return `${stepPrecisionLabel} step #${
        i + 1
      } 'To' must not be less than 'From'.`;
    if (i === 0 && from !== s)
      return `First ${stepPrecisionLabel} step must start at ${s.toFixed(1)}.`;
    if (i > 0) {
      const prevTo = norm(rules[i - 1].to);
      if (from < prevTo)
        return `${stepPrecisionLabel} step #${
          i + 1
        } starts before previous step ends.`;
      if (Math.abs(from - (prevTo + 0.1)) > 0.0001) {
        return `${stepPrecisionLabel} step #${i + 1} must start at ${(
          prevTo + 0.1
        ).toFixed(1)}.`;
      }
    }
  }
  const lastTo = norm(rules[rules.length - 1].to);
  if (lastTo !== e)
    return `Last ${stepPrecisionLabel} step must end at ${e.toFixed(1)}.`;
  return "";
}

// Generate matrix using unified rules
function generateMatrix(
  // basePrice,
  fatStart,
  fatEnd,
  snfStart,
  snfEnd,
  unifiedRules,
  stepTypeLabel
) {
  const toNum = (v) => Number(v);
  const sFat = toNum(fatStart);
  const eFat = toNum(fatEnd);
  const sSnf = toNum(snfStart);
  const eSnf = toNum(snfEnd);

  // Build axis values at 0.1 precision
  const fatValues = [];
  for (let f = sFat; f <= eFat + 0.0001; f += 0.1)
    fatValues.push(Number(f.toFixed(1)));
  const snfValues = [];
  for (let s = sSnf; s <= eSnf + 0.0001; s += 0.1)
    snfValues.push(Number(s.toFixed(1)));

  const header = [
    stepTypeLabel === "FAT + CLR" ? "f/c" : "f/s",
    ...snfValues.map((v) => v.toFixed(1)),
  ];
  const matrix = [header];

  // Helper to find rate for a value from rules
  const findRate = (fatValue, snfValue, rules) => {
    for (const r of rules) {
      const fatFrom = Number(Number(r.fatFrom).toFixed(1));
      const fatTo = Number(Number(r.fatTo).toFixed(1));
      const snfFrom = Number(Number(r.snfFrom).toFixed(1));
      const snfTo = Number(Number(r.snfTo).toFixed(1));

      if (
        fatValue >= fatFrom &&
        fatValue <= fatTo &&
        snfValue >= snfFrom &&
        snfValue <= snfTo
      ) {
        return Number(r.rate);
      }
    }
    return 0;
  };

  for (let i = 0; i < fatValues.length; i++) {
    const fat = fatValues[i];
    const row = [fat.toFixed(1)];

    // Build across SNF
    for (let j = 0; j < snfValues.length; j++) {
      const snf = snfValues[j];
      const rate = findRate(fat, snf, unifiedRules);
      const price = ((Number(fat) + Number(snf)) * Number(rate)) / 100;
      row.push(price.toFixed(2));
    }
    matrix.push(row);
  }

  return matrix;
}

const NewRateTableGenerator = () => {
  const navigate = useNavigate();
  // Global options
  const [milkType, setMilkType] = useState("Cow");
  const [stepType, setStepType] = useState("FAT + SNF");
  // const [basePrice, setBasePrice] = useState("0.00");
  const [fatStart, setFatStart] = useState("2.5");
  const [fatEnd, setFatEnd] = useState("4.9");
  const [snfStart, setSnfStart] = useState("7.5");
  const [snfEnd, setSnfEnd] = useState("8.6");

  // Unified rules table
  const [unifiedRules, setUnifiedRules] = useState([]);
  const [tableError, setTableError] = useState("");

  // Result matrix
  const [matrixTable, setMatrixTable] = useState([]);

  // Add user and device selection state
  const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
  const userType = UserTypeHook();
  const isDairy = userType === roles.DAIRY;
  const dairyCode = userInfo?.dairyCode;
  const [selectedDeviceId, setSelectedDeviceId] = useState(""); // Default to All Devices
  const { data: dairyDevices = [], isLoading: isDairyLoading } =
    useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy || !dairyCode });

  const snfOrClrLabel = stepType === "FAT + CLR" ? "CLR" : "SNF";

  const handleAddRule = () => {
    setUnifiedRules((rules) => {
      let newRule;
      if (rules.length === 0) {
        // First rule starts with minimum values
        newRule = {
          fatFrom: fatStart,
          fatTo: fatEnd,
          snfFrom: snfStart,
          snfTo: snfEnd,
          rate: 100,
        };
      } else {
        const lastRule = rules[rules.length - 1];
        const lastSnfTo = Number(Number(lastRule.snfTo).toFixed(1));
        const lastFatTo = Number(Number(lastRule.fatTo).toFixed(1));

        if (lastSnfTo < Number(Number(snfEnd).toFixed(1))) {
          // Continue with SNF for same FAT range
          newRule = {
            fatFrom: lastRule.fatFrom,
            fatTo: lastRule.fatTo,
            snfFrom: (lastSnfTo + 0.1).toFixed(1),
            snfTo: snfEnd,
            rate: 0.1,
          };
        } else if (lastFatTo < Number(Number(fatEnd).toFixed(1))) {
          // Move to next FAT range
          newRule = {
            fatFrom: (lastFatTo + 0.1).toFixed(1),
            fatTo: fatEnd,
            snfFrom: snfStart,
            snfTo: snfEnd,
            rate: 0.1,
          };
        } else {
          // Already at maximum, don't add
          return rules;
        }
      }

      setTableError("");
      return [...rules, newRule];
    });
  };

  const handleRemoveRule = (idx) => {
    setUnifiedRules((rules) => rules.filter((_, i) => i !== idx));
  };

  const updateRuleValue = (idx, field, value) => {
    setUnifiedRules((rules) =>
      rules.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const validateUnifiedRules = () => {
    if (unifiedRules.length === 0) {
      return "Please add at least one rule.";
    }

    const norm = (n) => Number(Number(n).toFixed(1));
    const sFat = norm(fatStart);
    const eFat = norm(fatEnd);
    const sSnf = norm(snfStart);
    const eSnf = norm(snfEnd);

    // Check if all ranges are covered
    let currentFat = sFat;
    let currentSnf = sSnf;

    for (let i = 0; i < unifiedRules.length; i++) {
      const rule = unifiedRules[i];
      const fatFrom = norm(rule.fatFrom);
      const fatTo = norm(rule.fatTo);
      const snfFrom = norm(rule.snfFrom);
      const snfTo = norm(rule.snfTo);

      if (isNaN(fatFrom) || isNaN(fatTo) || isNaN(snfFrom) || isNaN(snfTo)) {
        return `Rule #${i + 1} has invalid values.`;
      }

      if (fatTo < fatFrom || snfTo < snfFrom) {
        return `Rule #${
          i + 1
        } 'To' values must not be less than 'From' values.`;
      }

      // Check continuity
      if (Math.abs(fatFrom - currentFat) > 0.0001) {
        return `Rule #${i + 1} FAT should start at ${currentFat.toFixed(1)}.`;
      }

      if (Math.abs(snfFrom - currentSnf) > 0.0001) {
        return `Rule #${
          i + 1
        } ${snfOrClrLabel} should start at ${currentSnf.toFixed(1)}.`;
      }

      // Update current positions
      if (snfTo >= eSnf) {
        // Move to next FAT range
        currentFat = fatTo + 0.1;
        currentSnf = sSnf;
      } else {
        // Continue with SNF
        currentSnf = snfTo + 0.1;
      }
    }

    // Check if we've covered the full range
    // If we've reached beyond the end values, we're complete
    if (currentFat > eFat || currentSnf > eSnf) {
      return "";
    }

    // If we haven't reached the end values, we need more rules
    if (currentFat < eFat || currentSnf < eSnf) {
      return "Rules do not cover the complete range. Add more rules.";
    }

    return "";
  };

  const handleGenerate = () => {
    const err = validateUnifiedRules();
    if (err) {
      setTableError(err);
      return;
    }

    const matrix = generateMatrix(
      // Number(basePrice),
      Number(fatStart),
      Number(fatEnd),
      Number(snfStart),
      Number(snfEnd),
      unifiedRules,
      stepType
    );
    setMatrixTable(matrix);
  };

  const handleDownloadCSV = () => {
    if (!matrixTable.length) return;
    const csv = Papa.unparse(matrixTable);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const milkTypeShort = milkType === "Cow" ? "COW" : "BUF";
    const stepTypeShort = stepType === "FAT + CLR" ? "CLR" : "SNF";
    const filename = `${stepTypeShort}_${milkTypeShort}_Equationcsv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadCSV = () => {
    if (!matrixTable.length) return;
    const csv = Papa.unparse(matrixTable);
    const milkTypeShort = milkType === "Cow" ? "COW" : "BUF";
    const stepTypeShort = stepType === "FAT + CLR" ? "CLR" : "SNF";
    const filename = `${stepTypeShort}_${milkTypeShort}_Formula.csv`;
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
    uploadState.returnPath = "/ratetable-step";
    uploadState.sourcePage = "NewRateTableGenerator";
    navigate("/uploads", { state: uploadState });
  };

  const handleReset = () => {
    setUnifiedRules([]);
    setTableError("");
    setMatrixTable([]);
  };

  const canGenerate = unifiedRules.length > 0;

  // Check if all limits have been reached
  const isRangeComplete = () => {
    if (unifiedRules.length === 0) return false;

    const norm = (n) => Number(Number(n).toFixed(1));
    const eFat = norm(fatEnd);
    const eSnf = norm(snfEnd);

    const lastRule = unifiedRules[unifiedRules.length - 1];
    const lastFatTo = norm(lastRule.fatTo);
    const lastSnfTo = norm(lastRule.snfTo);

    // Check if we've reached the maximum values
    return lastFatTo >= eFat && lastSnfTo >= eSnf;
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
                <FaTable size={18} className="me-2" />
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    marginBottom: 0,
                    textAlign: "left",
                  }}
                >
                  Milk Rate Table Generator(FORMULA)
                </span>
              </span>
              <div
                style={{ fontSize: "1rem", opacity: 0.9, textAlign: "left" }}
              >
                Generate, download and upload milk rate tables with Formula
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
          {/* Device selection for dairy users - only show if not selected */}
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
          {/* Only show the rest of the UI if not dairy, or if dairy and a device is selected or All Devices is selected */}
          {(!isDairy || (isDairy && selectedDeviceId !== undefined)) && (
            <>
              {/* Global Options */}
              <Card className="ratetable-page selection-section-card mb-4">
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
                  <Row className="gx-4 gy-3 align-items-end justify-content-center">
                    <Col md={4} xs={12} className="text-center">
                      <div className="fw-bold mb-1">Milk Type</div>
                      <ButtonGroup className="w-auto mx-auto" size="sm">
                        {["Cow", "Buffalo"].map((type) => (
                          <ToggleButton
                            key={type}
                            id={`milk-type-${type}`}
                            type="radio"
                            size="sm"
                            variant={
                              milkType === type ? "primary" : "outline-primary"
                            }
                            name="milk-type"
                            value={type}
                            checked={milkType === type}
                            onChange={(e) => {
                              const t = e.target.value;
                              setMilkType(t);
                              if (t === "Cow") {
                                setFatStart("2.5");
                                setFatEnd("4.9");
                                if (stepType === "FAT + CLR") {
                                  setSnfStart("24.0");
                                  setSnfEnd("26.0");
                                } else {
                                  setSnfStart("7.5");
                                  setSnfEnd("8.6");
                                }
                              } else {
                                setFatStart("5.0");
                                setFatEnd("10.0");
                                if (stepType === "FAT + CLR") {
                                  setSnfStart("26.0");
                                  setSnfEnd("30.0");
                                } else {
                                  setSnfStart("8.0");
                                  setSnfEnd("10.0");
                                }
                              }
                              setUnifiedRules([]);
                              setMatrixTable([]);
                            }}
                            className="milk-type-toggle-btn"
                          >
                            {type}
                          </ToggleButton>
                        ))}
                      </ButtonGroup>
                    </Col>
                    <Col md={4} xs={12} className="text-center">
                      <div className="fw-bold mb-1">Step Type</div>
                      <ButtonGroup className="w-auto mx-auto" size="sm">
                        {["FAT + SNF", "FAT + CLR"].map((type) => (
                          <ToggleButton
                            key={type}
                            id={`step-type-${type}`}
                            type="radio"
                            size="sm"
                            variant={
                              stepType === type ? "primary" : "outline-primary"
                            }
                            name="step-type"
                            value={type}
                            checked={stepType === type}
                            onChange={(e) => {
                              const v = e.target.value;
                              setStepType(v);
                              if (milkType === "Cow") {
                                if (v === "FAT + CLR") {
                                  setSnfStart("24.0");
                                  setSnfEnd("26.0");
                                } else {
                                  setSnfStart("7.5");
                                  setSnfEnd("8.6");
                                }
                              }
                              if (milkType === "Buffalo") {
                                if (v === "FAT + CLR") {
                                  setSnfStart("26.0");
                                  setSnfEnd("30.0");
                                } else {
                                  setSnfStart("8.0");
                                  setSnfEnd("10.0");
                                }
                              }
                              setUnifiedRules([]);
                              setMatrixTable([]);
                            }}
                            className="step-type-toggle-btn"
                          >
                            {type}
                          </ToggleButton>
                        ))}
                      </ButtonGroup>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Range Settings */}
              <div className="row justify-content-center g-4">
                {/* FAT Section */}
                <div className="col-12 col-md-6 d-flex flex-column align-items-center">
                  <Card className="ratetable-page config-section-card fat-config-card mb-4 w-100">
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
                  <Card className="ratetable-page config-section-card snf-config-card mb-4 w-100">
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
              </div>

              {/* Unified Rules Table */}
              <Card className="ratetable-page selection-section-card mb-4">
                <Card.Header
                  className="config-section-header snf-section-header d-flex align-items-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #2b50a1 0%, #4f8fe8 100%)",
                    color: "whitesmoke",
                  }}
                >
                  <FaTable className="me-1" /> Rate Rules Table
                </Card.Header>
                <Card.Body>
                  {unifiedRules.length > 0 && (
                    <div className="table-responsive">
                      <Table bordered hover size="sm" className="mb-3">
                        <thead>
                          <tr
                            style={{
                              background: "#2b50a1",
                              color: "whitesmoke",
                            }}
                          >
                            <th>#</th>
                            <th>FAT From</th>
                            <th>FAT To</th>
                            <th>{snfOrClrLabel} From</th>
                            <th>{snfOrClrLabel} To</th>
                            <th>Rate</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {unifiedRules.map((rule, idx) => (
                            <tr key={idx}>
                              <td>
                                <span className="step-badge">{idx + 1}</span>
                              </td>
                              <td>
                                <Form.Control
                                  type="text"
                                  inputMode="decimal"
                                  step="0.1"
                                  value={rule.fatFrom}
                                  className="text-center"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                      updateRuleValue(idx, "fatFrom", val);
                                    }
                                  }}
                                  onBlur={() => {
                                    updateRuleValue(
                                      idx,
                                      "fatFrom",
                                      Number(rule.fatFrom).toFixed(1)
                                    );
                                  }}
                                />
                              </td>
                              <td>
                                <Form.Control
                                  type="text"
                                  inputMode="decimal"
                                  step="0.1"
                                  value={rule.fatTo}
                                  className="text-center"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                      updateRuleValue(idx, "fatTo", val);
                                    }
                                  }}
                                  onBlur={() => {
                                    updateRuleValue(
                                      idx,
                                      "fatTo",
                                      Number(rule.fatTo).toFixed(1)
                                    );
                                  }}
                                />
                              </td>
                              <td>
                                <Form.Control
                                  type="text"
                                  inputMode="decimal"
                                  step="0.1"
                                  value={rule.snfFrom}
                                  className="text-center"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                      updateRuleValue(idx, "snfFrom", val);
                                    }
                                  }}
                                  onBlur={() => {
                                    updateRuleValue(
                                      idx,
                                      "snfFrom",
                                      Number(rule.snfFrom).toFixed(1)
                                    );
                                  }}
                                />
                              </td>
                              <td>
                                <Form.Control
                                  type="text"
                                  inputMode="decimal"
                                  step="0.1"
                                  value={rule.snfTo}
                                  className="text-center"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                      updateRuleValue(idx, "snfTo", val);
                                    }
                                  }}
                                  onBlur={() => {
                                    updateRuleValue(
                                      idx,
                                      "snfTo",
                                      Number(rule.snfTo).toFixed(1)
                                    );
                                  }}
                                />
                              </td>
                              <td>
                                <Form.Control
                                  type="number"
                                  step="0.01"
                                  value={rule.rate}
                                  className="text-center"
                                  onChange={(e) =>
                                    updateRuleValue(idx, "rate", e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleRemoveRule(idx)}
                                  title="Remove Rule"
                                >
                                  <FaTrash />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                  {tableError && (
                    <Alert variant="danger" className="py-1 px-2 mb-2">
                      {tableError}
                    </Alert>
                  )}
                  <div className="d-flex gap-2">
                    <Button
                      onClick={handleAddRule}
                      disabled={isRangeComplete()}
                    >
                      Add Rule
                    </Button>
                  </div>
                </Card.Body>
              </Card>

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
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                >
                  <FaTable className="me-1" />
                  Generate Table
                </Button>
                <Button
                  style={{
                    background:
                      "linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)",
                    color: "whitesmoke",
                    fontSize: "1.0em",
                    fontWeight: "500",
                  }}
                  onClick={handleReset}
                >
                  <FaSyncAlt className="me-1" />
                  Reset
                </Button>
                {matrixTable.length > 0 && (
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

              {/* Result Table */}
              {matrixTable.length > 0 && (
                <Card>
                  <Card.Header>Generated Rate Table</Card.Header>
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
                            {matrixTable[0].map((col, idx) => (
                              <th
                                key={idx}
                                style={{
                                  color: "black",
                                  fontWeight: "bold",
                                  textAlign: "center",
                                }}
                              >
                                {idx === 0
                                  ? snfOrClrLabel === "CLR"
                                    ? "f/c"
                                    : "f/s"
                                  : col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {matrixTable.slice(1).map((row, ridx) => (
                            <tr key={ridx}>
                              {row.map((cell, cidx) =>
                                cidx === 0 ? (
                                  <td
                                    key={cidx}
                                    style={{ textAlign: "center" }}
                                  >
                                    <b>{cell}</b>
                                  </td>
                                ) : (
                                  <td
                                    key={cidx}
                                    style={{ textAlign: "center" }}
                                  >
                                    {cell}
                                  </td>
                                )
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default NewRateTableGenerator;
