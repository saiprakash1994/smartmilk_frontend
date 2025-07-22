import React, { useState, useEffect } from "react";
import { Card, Form, Button, Table, InputGroup, Alert,ToggleButton,Col,Row,ButtonGroup } from "react-bootstrap";
import Papa from "papaparse";
import {  FaFileCsv, FaFileUpload, FaPlus, FaRupeeSign,  FaSyncAlt,FaTable, FaTrash, FaUpload, FaTint, FaVial, FaExclamationTriangle } from "react-icons/fa";
import './PriceTableGenerator.scss';
import { useNavigate } from 'react-router-dom';
import { useSelector } from "react-redux";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { roles } from "../../../../shared/utils/appRoles";
import { useGetDeviceByCodeQuery } from "../../../device/store/deviceEndPoint";

const defaultFatRules = [
//   { from: 3.0, to: 4.0, increment: 0.10 },
//   { from: 4.1, to: 5.0, increment: 0.15 },
];
const defaultSnfRules = [
//   { from: 7.5, to: 8.0, increment: 0.10 },
//   { from: 8.1, to: 9.0, increment: 0.20 },
];

let snfOrCLR ;


function getIncrement(value, rules) {
  for (const rule of rules) {
    if (value >= rule.from && value <= rule.to) return rule.increment;
  }
  return 0;
}

function generateMatrixTable(basePrice, fatStart, fatEnd, fatStep, fatRules, snfStart, snfEnd, snfStep, snfRules, stepType) {
  // Defensive conversion to numbers
  basePrice = Number(basePrice);
  fatStart = Number(fatStart);
  fatEnd = Number(fatEnd);
  fatStep = Number(fatStep);
  snfStart = Number(snfStart);
  snfEnd = Number(snfEnd);
  snfStep = Number(snfStep);
  const fatValues = [];
  for (let f = fatStart; f <= fatEnd + 0.0001; f += fatStep) {
    fatValues.push(Number(f.toFixed(1)));
  }
  const snfValues = [];
  for (let s = snfStart; s <= snfEnd + 0.0001; s += snfStep) {
    snfValues.push(Number(s.toFixed(1)));
  }
  // Build matrix: first row is header
  const matrix = [];
  const header = [stepType === 'FAT + CLR' ? 'f/c' : 'f/s', ...snfValues.map(s => s.toFixed(1))];
  matrix.push(header);
  let prevFatRow = null;
  for (let i = 0; i < fatValues.length; ++i) {
    let fat = fatValues[i];
    let fatIncrement = 0;
    for (const rule of fatRules) {
      if (fat >= Number(rule.from) && fat <= Number(rule.to)) {
        fatIncrement = Number(rule.increment);
        break;
      }
    }
    let row = [fat.toFixed(1)];
    // For the first FAT row, start from basePrice; otherwise, carry forward from previous FAT row's first SNF value
    let prevValue;
    if (i === 0) {
      prevValue = Number(basePrice);
    } else {
      prevValue = Number(prevFatRow[1]) + fatIncrement;
    }
    row.push(prevValue.toFixed(2));
    // SNF/CLR running total logic (across columns)
    for (let j = 1; j < snfValues.length; ++j) {
      let snf = snfValues[j];
      let increment = 0;
      for (const rule of snfRules) {
        if (snf >= Number(rule.from) && snf <= Number(rule.to)) {
          increment = Number(rule.increment);
          break;
        }
      }
      let price = Number(row[j]) + increment;
      row.push(price.toFixed(2));
    }
    prevFatRow = row;
    matrix.push(row);
  }
  return matrix;
}

const PriceTableGenerator = () => {
  const navigate = useNavigate();
  // Milk type state
  const [milkType, setMilkType] = useState('Cow');
  // Step type state
  const [stepType, setStepType] = useState('FAT + SNF');
  const [basePrice, setBasePrice] = useState('0.00');
  const [fatStart, setFatStart] = useState('2.5');
  const [fatEnd, setFatEnd] = useState('4.9');
  const [fatStep] = useState(0.1);
  const [fatRules, setFatRules] = useState([...defaultFatRules]);
  const [snfStart, setSnfStart] = useState('7.5');
  const [snfEnd, setSnfEnd] = useState('8.6');
  const [snfStep] = useState(0.1);
  const [snfRules, setSnfRules] = useState([...defaultSnfRules]);
  const [matrixTable, setMatrixTable] = useState([]);
  const [error, setError] = useState("");
  const [fatRuleError, setFatRuleError] = useState("");
  const [snfRuleError, setSnfRuleError] = useState("");
  // const [showDeviceUpload] = useState(false);

  // Add user and device selection state
  const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
  const userType = UserTypeHook();
  const isDairy = userType === roles.DAIRY;
  const dairyCode = userInfo?.dairyCode;
  const [selectedDeviceId, setSelectedDeviceId] = useState(""); // Default to All Devices
  const { data: dairyDevices = [], isLoading: isDairyLoading } = useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy || !dairyCode });

  // Handle milk type change
  const handleMilkTypeChange = (e) => {
    const type = e.target.value;
    setMilkType(type);
    if (type === 'Cow') {
      setFatStart('2.5');
      setFatEnd('4.9');
      if (stepType === 'FAT + CLR') {
        setSnfStart('24');
        setSnfEnd('26');
      } else {
        setSnfStart('7.5');
        setSnfEnd('8.6');
      }
    } else if (type === 'Buffalo') {
      setFatStart('5.0');
      setFatEnd('10.0');
      if (stepType === 'FAT + CLR') {
        setSnfStart('26');
        setSnfEnd('30');
      } else {
        setSnfStart('8.0');
        setSnfEnd('10.0');
      }
    }
    setFatRules([]);
    setSnfRules([]);
    setFatRuleError("");
    setSnfRuleError("");
    setError("");
    setMatrixTable([]);
  };

  // Update SNF/CLR limits when stepType changes
  useEffect(() => {
    if (milkType === 'Cow') {
      if (stepType === 'FAT + CLR') {
        setSnfStart('24');
        setSnfEnd('26');
      } else {
        setSnfStart('7.5');
        setSnfEnd('8.6');
      }
    } else if (milkType === 'Buffalo') {
      if (stepType === 'FAT + CLR') {
        setSnfStart('26');
        setSnfEnd('30');
      } else {
        setSnfStart('8.0');
        setSnfEnd('10.0');
      }
    }
    setSnfRules([]);
    setSnfRuleError("");
    setError("");
    setMatrixTable([]);
  }, [stepType, milkType]);

  // Clear FAT rule error when validation passes
  // Remove the useEffect hooks for error clearing

  // Clear error if at least one step is added after missing steps error
  useEffect(() => {
    if (
      (fatRules.length > 0 || snfRules.length > 0) &&
      error &&
      error.startsWith("Please add at least one FAT and one")
    ) {
      setError("");
    }
  }, [fatRules.length, snfRules.length]);

  // Validation for editing (no 'must end at' check)
  const validateFatRulesEditing = (rules = fatRules, start = fatStart, end = fatEnd) => {
    if (rules.length > 0 && Number(Number(rules[0].from).toFixed(1)) !== Number(Number(start).toFixed(1))) {
      return `First FAT step must start at ${start}`;
    }
    for (let i = 0; i < rules.length; ++i) {
      const from = Number(Number(rules[i].from).toFixed(1));
      const to = Number(Number(rules[i].to).toFixed(1));
      if (to < from) {
        return `FAT step #${i + 1} 'To' must not be less than 'From'.`;
      }
      if (to > end) {
        return `FAT step #${i + 1} 'To' must not exceed FAT End (${end}).`;
      }
      if (i > 0) {
        const prevTo = Number(Number(rules[i - 1].to).toFixed(1));
        if (from < prevTo) {
          return `FAT step #${i + 1} starts before previous step ends.`;
        }
        if (Math.abs(from - (prevTo + 0.1)) > 0.0001) {
          return `FAT step #${i + 1} must start at ${(prevTo + 0.1).toFixed(1)} (immediately after previous rule's end).`;
        }
      }
    }
    return "";
  };

  // For dynamic label (SNF or CLR)
  const snfOrClrLabel = stepType === 'FAT + CLR' ? 'CLR' : 'SNF';

  const validateSnfRulesEditing = (rules = snfRules, start = snfStart, end = snfEnd) => {
    if (rules.length > 0 && Number(Number(rules[0].from).toFixed(1)) !== Number(Number(start).toFixed(1))) {
      return `First ${snfOrClrLabel} step must start at ${start}`;
    }
    for (let i = 0; i < rules.length; ++i) {
      const from = Number(Number(rules[i].from).toFixed(1));
      const to = Number(Number(rules[i].to).toFixed(1));
      if (to < from) {
        return `${snfOrClrLabel} step #${i + 1} 'To' must not be less than 'From'.`;
      }
      if (to > end) {
        return `${snfOrClrLabel} step #${i + 1} 'To' must not exceed ${snfOrClrLabel} End (${end}).`;
      }
      if (i > 0) {
        const prevTo = Number(Number(rules[i - 1].to).toFixed(1));
        if (from < prevTo) {
          return `${snfOrClrLabel} step #${i + 1} starts before previous step ends.`;
        }
        if (Math.abs(from - (prevTo + 0.1)) > 0.0001) {
          return `${snfOrClrLabel} step #${i + 1} must start at ${(prevTo + 0.1).toFixed(1)} (immediately after previous rule's end).`;
        }
      }
    }
    return "";
  };

  // Strict validation for Generate (includes 'must end at')
  const validateFatRules = (rules = fatRules, start = fatStart, end = fatEnd) => {
    const editErr = validateFatRulesEditing(rules, start, end);
    if (editErr) return editErr;
    if (rules.length > 0 && Number(Number(rules[rules.length - 1].to).toFixed(1)) !== Number(Number(end).toFixed(1))) {
      return `Last FAT step must end at ${end}`;
    }
    return "";
  };

  const validateSnfRules = (rules = snfRules, start = snfStart, end = snfEnd) => {
    const editErr = validateSnfRulesEditing(rules, start, end);
    if (editErr) return editErr;
    if (rules.length > 0 && Number(Number(rules[rules.length - 1].to).toFixed(1)) !== Number(Number(end).toFixed(1))) {
      return `Last ${snfOrClrLabel} step must end at ${end}`;
    }
    return "";
  };

  // Only update value, do not validate
  const updateFatRuleValue = (idx, field, value) => {
    setFatRules(rules => rules.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };
  const updateSnfRuleValue = (idx, field, value) => {
    setSnfRules(rules => rules.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  // Remove validation from handleFatRuleChange and handleSnfRuleChange
  // const handleFatRuleChange = () => {};
  // const handleSnfRuleChange = () => {};

  const handleAddFatRule = () => {
    setFatRules(rules => {
      let updated;
      if (rules.length === 0) {
        updated = [{ from: fatStart, to: fatEnd, increment: 0.1 }];
      } else {
        const prevTo = Number(Number(rules[rules.length - 1].to).toFixed(1));
        updated = [
          ...rules,
          { from: (prevTo + 0.1).toFixed(1), to: fatEnd, increment: 0.1 }
        ];
      }
      const err = validateFatRulesEditing(updated, fatStart, fatEnd);
      setFatRuleError(err);
      return updated;
    });
  };
  const handleRemoveFatRule = idx => {
    setFatRules(rules => {
      const updated = rules.filter((_, i) => i !== idx);
      const err = validateFatRulesEditing(updated, fatStart, fatEnd);
      setFatRuleError(err);
      return updated;
    });
  };

  const handleAddSnfRule = () => {
    setSnfRules(rules => {
      let updated;
      if (rules.length === 0) {
        updated = [{ from: snfStart, to: snfEnd, increment: 0.1 }];
      } else {
        const prevTo = Number(Number(rules[rules.length - 1].to).toFixed(1));
        updated = [
          ...rules,
          { from: (prevTo + 0.1).toFixed(1), to: snfEnd, increment: 0.1 }
        ];
      }
      const err = validateSnfRulesEditing(updated, snfStart, snfEnd);
      setSnfRuleError(err);
      return updated;
    });
  };
  const handleRemoveSnfRule = idx => {
    setSnfRules(rules => {
      const updated = rules.filter((_, i) => i !== idx);
      const err = validateSnfRulesEditing(updated, snfStart, snfEnd);
      setSnfRuleError(err);
      return updated;
    });
  };

  const handleGenerate = e => {
    e.preventDefault();
    setError("");
    if (fatRules.length === 0 || snfRules.length === 0) {
      setError("Please add at least one FAT and one " + snfOrClrLabel + " step before generating the table.");
      return;
    }
    const fatErr = validateFatRules(fatRules, fatStart, fatEnd);
    if (fatErr) {
      setError(fatErr);
      return;
    }
    const snfErr = validateSnfRules(snfRules, snfStart, snfEnd);
    if (snfErr) {
      setError(snfErr);
      return;
    }
    setMatrixTable(
      generateMatrixTable(
        Number(basePrice),
        Number(fatStart),
        Number(fatEnd),
        Number(fatStep),
        fatRules,
        Number(snfStart),
        Number(snfEnd),
        Number(snfStep),
        snfRules,
        stepType
      )
    );
  };

  const handleDownloadCSV = () => {
    if (!matrixTable.length) return;
    const csv = Papa.unparse(matrixTable);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const milkTypeShort = milkType === 'Cow' ? 'COW' : 'BUF';
    const stepTypeShort = stepType === 'FAT + CLR' ? 'CLR' : 'SNF';
    const filename = `${stepTypeShort}_${milkTypeShort}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadCSV = () => {
    if (!matrixTable.length) return;
    const csv = Papa.unparse(matrixTable);
    const milkTypeShort = milkType === 'Cow' ? 'COW' : 'BUF';
    const stepTypeShort = stepType === 'FAT + CLR' ? 'CLR' : 'SNF';
    const filename = `${stepTypeShort}_${milkTypeShort}.csv`;
    // Pass CSV and info to uploads page
    // For dairy user, pass selectedDeviceId; for others, pass dairyCode or deviceid as before
    let uploadState = {
      csv,
      filename,
      milkType: milkTypeShort,
      stepType: stepTypeShort
    };
    if (isDairy && selectedDeviceId) {
      uploadState.deviceId = selectedDeviceId;
    } else if (userInfo?.deviceid) {
      uploadState.deviceId = userInfo.deviceid;
    } else if (userInfo?.dairyCode) {
      uploadState.dairyCode = userInfo.dairyCode;
    }
    // Add preferredUploadTab for FAT + CLR
    if (stepType === 'FAT + CLR') {
      uploadState.preferredUploadTab = milkType === 'Cow' ? 'clr-cow' : 'clr-buf';
    }
    navigate('/uploads', { state: uploadState });
  };

  const handleReset = () => {
    setFatRules([]);
    setSnfRules([]);
    setFatRuleError("");
    setSnfRuleError("");
    setError("");
    setMatrixTable([]);
  };

  const canAddFatRule = fatRules.length === 0 || Number(Number(fatRules[fatRules.length - 1].to).toFixed(1)) < Number(Number(fatEnd).toFixed(1));
  const canAddSnfRule = snfRules.length === 0 || Number(Number(snfRules[snfRules.length - 1].to).toFixed(1)) < Number(Number(snfEnd).toFixed(1));

  return (
    <div className="ratetable-page" style={{padding:"20px"}} >
      
      <Card className="price-table-generator-card mx-auto" style={{ maxWidth: 900, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', borderRadius: 18 }}>
        <Card.Header className="position-relative" style={{ borderRadius: '18px 18px 0 0', padding: '0.75rem', background: '#2b50a1', color: 'whitesmoke' }}>
          <div className="d-flex w-100 align-items-center justify-content-between position-relative">
            <div className="d-flex flex-column">
              <span className="d-flex align-items-center mb-1">
                <FaTable size={18} className="me-2" />
                <span style={{ fontSize: '1.1rem',fontWeight: "bold", marginBottom: 0, textAlign: 'left' }}>Milk Rate Table Generator</span>
              </span>
              <div style={{ fontSize: '1rem', opacity: 0.9, textAlign: 'left' }}>Generate, download and upload milk rate tables with custom steps</div>
            </div>
            {/* Device id and change button at the right */}
            {isDairy && selectedDeviceId && (
              <div className="d-flex align-items-center gap-3 ms-auto">
                <button
                  type="button"
                  className="btn btn-sm rounded-pill"
                  style={{ background: 'whitesmoke', color: '#2b50a1', fontWeight: 600, fontSize: '1rem', minWidth: 80 }}
                  
                >
                  {selectedDeviceId}
                </button>
                <button
                  type="button"
                  className="btn btn-sm rounded-pill"
                  style={{ background: 'whitesmoke', color: '#2b50a1', fontWeight: 600, fontSize: '1rem' }}
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
            <div className="d-flex flex-row align-items-center gap-2 mb-4" style={{ maxWidth: 400, margin: '0 auto' }}>
              <Form.Label className="fw-bold mb-0" style={{ minWidth: 70 }}>Device</Form.Label>
              <Form.Select
                value={selectedDeviceId}
                onChange={e => setSelectedDeviceId(e.target.value)}
                disabled={isDairyLoading}
                style={{ flex: 1 }}
              >
                <option value="">All Devices</option>
                {dairyDevices?.map((dev) => (
                  <option key={dev.deviceid} value={dev.deviceid}>{dev.deviceid}</option>
                ))}
              </Form.Select>
              {isDairyLoading && <div className="text-center text-secondary mt-2">Loading devices...</div>}
            </div>
          )}
          {/* Only show the rest of the UI if not dairy, or if dairy and a device is selected or All Devices is selected */}
          {(!isDairy || (isDairy && (selectedDeviceId !== undefined))) && (
            <Form onSubmit={handleGenerate}>
              <Card className="ratetable-page selection-section-card mb-4">
                <Card.Header className="selection-section-header d-flex align-items-center" style={{ background: '#2b50a1', color: 'whitesmoke' }}>
                  <FaTable className="me-2" /> Milk Rate Table Options
                </Card.Header>
                <Card.Body>
                  <Row className="gx-4 gy-3 align-items-end justify-content-center">
                    <Col md={4} xs={12} className="mb-3 mb-md-0 text-center">
                      <div className="fw-bold mb-2">Milk Type</div>
                      <ButtonGroup className="w-auto mx-auto" size="sm">
                        {['Cow', 'Buffalo'].map(type => (
                          <ToggleButton
                            key={type}
                            id={`milk-type-${type}`}
                            type="radio"
                            size="sm"
                            variant={milkType === type ? "primary" : "outline-primary"}
                            name="milk-type"
                            value={type}
                            checked={milkType === type}
                            onChange={handleMilkTypeChange}
                            className="milk-type-toggle-btn"
                          >
                            {type}
                          </ToggleButton>
                        ))}
                      </ButtonGroup>
                    </Col>
                    <Col md={4} xs={12} className="text-center">
                      <div className="fw-bold mb-2">Step Type</div>
                      <ButtonGroup className="w-auto mx-auto" size="sm">
                        {['FAT + SNF', 'FAT + CLR'].map(type => (
                          <ToggleButton
                            key={type}
                            id={`step-type-${type}`}
                            type="radio"
                            size="sm"
                            variant={stepType === type ? "primary" : "outline-primary"}
                            name="step-type"
                            value={type}
                            checked={stepType === type}
                            onChange={e => setStepType(e.target.value)}
                            className="step-type-toggle-btn"
                          >
                            {type}
                          </ToggleButton>
                        ))}
                      </ButtonGroup>
                    </Col>
                    <Col md={4} xs={12} className="mb-3 mb-md-0 text-center">
                      <Form.Label className="fw-bold">Base Price</Form.Label>
                      <div className="d-flex justify-content-center">
                        <InputGroup className="rupee-group w-auto">
                          <InputGroup.Text className="fs-6 rupee-toggle-color">₹</InputGroup.Text>
                          <Form.Control
                            className="base-price-input base-price-input-sm"
                            type="text"
                            inputMode="decimal"
                            step="0.01"
                            value={basePrice}
                            onChange={e => {
                              const val = e.target.value;
                              if (/^\d*(\.\d{0,2})?$/.test(val)) {
                                setBasePrice(val);
                              }
                            }}
                            onBlur={e => {
                              if (basePrice !== "") setBasePrice(Number(basePrice).toFixed(2));
                            }}
                            required
                          />
                        </InputGroup>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <div className="row justify-content-center g-4">
                {/* FAT Section */}
                <div className="col-12 col-md-6 d-flex flex-column align-items-center">
                  <Card className=" ratetable-page config-section-card fat-config-card mb-4 w-100">
                    <Card.Header className="config-section-header fat-section-header d-flex align-items-center" style={{ background: '#2b50a1', color: 'whitesmoke' }}>
                      <FaTint className="me-2" /> FAT Configuration
                    </Card.Header>
                    <Card.Body>
                      {/* Limits Section Label */}
                      <div className="fw-bold text-secondary mb-2 mt-1" style={{fontSize: '1.08rem', letterSpacing: '0.5px'}}>Limits</div>
                      <div className="row g-3 mb-3">
                        <div className="col-6">
                          <Form.Label className="fw-bold text-center w-100">FAT Minimum</Form.Label>
                          <InputGroup>
                            <Form.Control
                              type="text"
                              inputMode="decimal"
                              step="0.1"
                              value={fatStart}
                              className="text-center"
                              onChange={e => {
                                const val = e.target.value;
                                if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                  setFatStart(val);
                                }
                              }}
                              onBlur={e => {
                                if (fatStart !== "") setFatStart(Number(fatStart).toFixed(1));
                                const err = validateFatRulesEditing(fatRules, Number(fatStart), Number(fatEnd));
                                setFatRuleError(err);
                              }}
                              required
                            />
                            {/* <InputGroup.Text>%</InputGroup.Text> */}
                          </InputGroup>
                        </div>
                        <div className="col-6">
                          <Form.Label className="fw-bold text-center w-100">FAT Maximum</Form.Label>
                          <InputGroup style={{ margin: 0, borderRadius: 0 }}>
                          <Form.Control
                              type="text"
                              inputMode="decimal"
                              step="0.1"
                              value={fatEnd}
                              className="text-center"
                              onChange={e => {
                                const val = e.target.value;
                                if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                  setFatEnd(val);
                                }
                              }}
                              onBlur={e => {
                                if (fatEnd !== "") setFatEnd(Number(fatEnd).toFixed(1));
                                const err = validateFatRulesEditing(fatRules, Number(fatStart), Number(fatEnd));
                                setFatRuleError(err);
                              }}
                              required
                            />
                            {/* <InputGroup.Text>%</InputGroup.Text> */}
                          </InputGroup>
                        </div>
                      </div>
                      {/* Steps Section Label */}
                      <div className="fw-bold  mb-2 mt-3" style={{color:'#2b50a1',fontSize: '1.08rem', letterSpacing: '0.5px'}}>Steps</div>
                      {fatRuleError && (
                        <Alert variant="danger" className="py-1 px-2 mb-2 d-flex align-items-center">
                          <FaExclamationTriangle className="me-2" /> {fatRuleError}
                        </Alert>
                      )}
                      {fatRules.length > 0 && (
                        <div className="table-responsive">
                          <Table bordered hover size="sm" className="mb-3 step-table">
                            <thead>
                              <tr style={{ background: '#2b50a1', color: 'whitesmoke' }}>
                              <th >#</th>
                                <th >From</th>
                                <th >To</th>
                                <th >Rate</th>
                                <th ></th>
                              </tr>
                            </thead>
                            <tbody>
                              {fatRules.map((rule, idx) => (
                                <tr key={idx}>
                                  <td><span className="step-badge">{idx + 1}</span></td>
                                  <td><Form.Control type="text" inputMode="decimal" step="0.1" value={rule.from !== undefined ? rule.from.toString() : ''} className="text-center" onChange={e => { const val = e.target.value; if (/^\d*(\.\d{0,1})?$/.test(val)) { updateFatRuleValue(idx, 'from', val); } }} onBlur={e => { updateFatRuleValue(idx, 'from', Number(rule.from).toFixed(1)); const err = validateFatRulesEditing(fatRules.map((r, i) => i === idx ? { ...r, from: Number(Number(e.target.value).toFixed(1)) } : r), Number(fatStart), Number(fatEnd)); setFatRuleError(err); }} placeholder="" /></td>
                                  <td><Form.Control type="text" inputMode="decimal" step="0.1" value={rule.to !== undefined ? rule.to.toString() : ''} className="text-center" onChange={e => { const val = e.target.value; if (/^\d*(\.\d{0,1})?$/.test(val)) { updateFatRuleValue(idx, 'to', val); } }} onBlur={e => { updateFatRuleValue(idx, 'to', Number(rule.to).toFixed(1)); const err = validateFatRulesEditing(fatRules.map((r, i) => i === idx ? { ...r, to: Number(Number(e.target.value).toFixed(1)) } : r), Number(fatStart), Number(fatEnd)); setFatRuleError(err); }} placeholder="" /></td>
                                  <td><Form.Control type="number" step="0.01" value={rule.increment} className="text-center" onChange={e => updateFatRuleValue(idx, 'increment', e.target.value)} onBlur={e => { const err = validateFatRulesEditing(fatRules.map((r, i) => i === idx ? { ...r, increment: parseFloat(e.target.value) } : r), fatStart, fatEnd); setFatRuleError(err); }} placeholder="" /></td>
                                  <td><Button variant="outline-danger" size="sm" onClick={() => handleRemoveFatRule(idx)} title="Remove Step"><FaTrash /></Button></td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      )}
                      <div className="d-flex justify-content-center">
                        <Button variant="success" onClick={e => { e.preventDefault(); handleAddFatRule(); }} disabled={!canAddFatRule} className="d-flex align-items-center gap-2">
                          <FaPlus className="me-1" /> Add FAT Step
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
                {/* SNF/CLR Section */}
                <div className="col-12 col-md-6 d-flex flex-column align-items-center">
                  <Card className="ratetable-page config-section-card snf-config-card mb-4 w-100">
                    <Card.Header className="config-section-header snf-section-header d-flex align-items-center" style={{ background: '#2b50a1', color: 'whitesmoke' }}>
                      <FaVial className="me-2" /> {snfOrClrLabel} Configuration
                    </Card.Header>
                    <Card.Body>
                      {/* Limits Section Label */}
                      <div className="fw-bold text-secondary mb-2 mt-1" style={{fontSize: '1.08rem', letterSpacing: '0.5px'}}>Limits</div>
                      <div className="row g-3 mb-3">
                        <div className="col-6">
                          <Form.Label className="fw-bold text-center w-100">{snfOrClrLabel} Mimimum</Form.Label>
                          <InputGroup>
                            <Form.Control
                              type="text"
                              inputMode="decimal"
                              step="0.1"
                              value={snfStart}
                              className="text-center"
                              onChange={e => {
                                const val = e.target.value;
                                if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                  setSnfStart(val);
                                }
                              }}
                              onBlur={e => {
                                if (snfStart !== "") setSnfStart(Number(snfStart).toFixed(1));
                                const err = validateSnfRulesEditing(snfRules, Number(snfStart), Number(snfEnd));
                                setSnfRuleError(err);
                              }}
                              required
                            />
                            {/* <InputGroup.Text>%</InputGroup.Text> */}
                          </InputGroup>
                        </div>
                        <div className="col-6">
                          <Form.Label className="fw-bold text-center w-100">{snfOrClrLabel} Maximum</Form.Label>
                          <InputGroup>
                            <Form.Control
                              type="text"
                              inputMode="decimal"
                              step="0.1"
                              value={snfEnd}
                              className="text-center"
                              onChange={e => {
                                const val = e.target.value;
                                if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                  setSnfEnd(val);
                                }
                              }}
                              onBlur={e => {
                                if (snfEnd !== "") setSnfEnd(Number(snfEnd).toFixed(1));
                                const err = validateSnfRulesEditing(snfRules, Number(snfStart), Number(snfEnd));
                                setSnfRuleError(err);
                              }}
                              required
                            />
                            {/* <InputGroup.Text>%</InputGroup.Text> */}
                          </InputGroup>
                        </div>
                      </div>
                      {/* Steps Section Label */}
                      <div className="fw-bold  mb-2 mt-3" style={{color:'#2b50a1',fontSize: '1.08rem', letterSpacing: '0.5px'}}>Steps</div>
                      {snfRuleError && (
                        <Alert variant="danger" className="py-1 px-2 mb-2 d-flex align-items-center">
                          <FaExclamationTriangle className="me-2" /> {snfRuleError}
                        </Alert>
                      )}
                      {snfRules.length > 0 && (
                        <div className="table-responsive">
                          <Table bordered hover size="sm" className="mb-3 step-table">
                            <thead>
                              <tr style={{ background: '#2b50a1', color: ' #2b50a1' }}>
                                <th >#</th>
                                <th >From</th>
                                <th >To</th>
                                <th >Rate</th>
                                <th ></th>
                              </tr>
                            </thead>
                            <tbody>
                              {snfRules.map((rule, idx) => (
                                <tr key={idx}>
                                  <td><span className="step-badge">{idx + 1}</span></td>
                                  <td><Form.Control type="text" inputMode="decimal" step="0.1" value={rule.from !== undefined ? rule.from.toString() : ''} className="text-center" onChange={e => { const val = e.target.value; if (/^\d*(\.\d{0,1})?$/.test(val)) { updateSnfRuleValue(idx, 'from', val); } }} onBlur={e => { updateSnfRuleValue(idx, 'from', Number(rule.from).toFixed(1)); const err = validateSnfRulesEditing(snfRules.map((r, i) => i === idx ? { ...r, from: Number(Number(e.target.value).toFixed(1)) } : r), Number(snfStart), Number(snfEnd)); setSnfRuleError(err); }} placeholder=" " /></td>
                                  <td><Form.Control type="text" inputMode="decimal" step="0.1" value={rule.to !== undefined ? rule.to.toString() : ''} className="text-center" onChange={e => { const val = e.target.value; if (/^\d*(\.\d{0,1})?$/.test(val)) { updateSnfRuleValue(idx, 'to', val); } }} onBlur={e => { updateSnfRuleValue(idx, 'to', Number(rule.to).toFixed(1)); const err = validateSnfRulesEditing(snfRules.map((r, i) => i === idx ? { ...r, to: Number(Number(e.target.value).toFixed(1)) } : r), Number(snfStart), Number(snfEnd)); setSnfRuleError(err); }} placeholder="" /></td>
                                  <td><Form.Control type="number" step="0.01" value={rule.increment} className="text-center" onChange={e => updateSnfRuleValue(idx, 'increment', e.target.value)} onBlur={e => { const err = validateSnfRulesEditing(snfRules.map((r, i) => i === idx ? { ...r, increment: parseFloat(e.target.value) } : r), snfStart, snfEnd); setSnfRuleError(err); }} placeholder="" /></td>
                                  <td><Button variant="outline-danger" size="sm" onClick={() => handleRemoveSnfRule(idx)} title="Remove Step"><FaTrash /></Button></td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      )}
                      <div className="d-flex justify-content-center">
                        <Button variant="success" onClick={e => { e.preventDefault(); handleAddSnfRule(); }} disabled={!canAddSnfRule} className="d-flex align-items-center gap-2">
                          <FaPlus className="me-1" /> Add {snfOrClrLabel} Step
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              </div>
              {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
              <div className="row justify-content-center mt-4">
                <div className="col-auto d-flex gap-4 align-items-center">
                  <Button className="generate-reset-btn" type="submit"><FaTable className="me-1" />Generate Table</Button>
                  <Button variant="secondary" onClick={handleReset} className="generate-reset-btn"><FaSyncAlt className="me-1" />Reset</Button>
                  {matrixTable.length > 0 && (
                    <>
                      <Button variant="success" className="me-1" onClick={handleDownloadCSV}><FaFileCsv  className="me-1" />Download CSV</Button>
                      <Button variant="info" className="me-1" onClick={handleUploadCSV}><FaFileUpload className="me-1" />Upload CSV</Button>
                    </>
                  )}
                </div>
              </div>
            </Form>
          )}
        </Card.Body>
      </Card>
     
      {matrixTable.length > 0 && (
        <div style={{padding:"20px"}} >
        <Card className="ratetable-page" >
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <Card.Title>Generated Rate Table</Card.Title>
              {/* Removed Download and Upload buttons from here */}
            </div>
            <div style={{ maxHeight: 500, overflow: "auto" }}>
              <Table style={{border: '2px solid #2b50a1' }} striped bordered hover responsive size="sm">
                <thead className="sticky-header">
                  <tr>
                  {matrixTable[0].map((col, idx) => (
                    <th key={idx} style={{ color: "black", fontWeight: "bold", textAlign: "center" }}>{
                      idx === 0 ? `${snfOrClrLabel === 'CLR' ?'f/c':'f/s'}` :
                      idx > 0 ? `${snfOrClrLabel === 'CLR' ? parseFloat(col).toFixed(1) : col}` : col
                    }</th>
                  ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixTable.slice(1).map((row, ridx) => (
                    <tr key={ridx}>
                      {row.map((cell, cidx) => (
                        cidx === 0 ? <td key={cidx} style={{ textAlign: "center" }}><b>{cell}</b></td> : <td key={cidx} style={{ textAlign: "center" }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
        </div>
      )}
     
    </div>
  );
};

export default PriceTableGenerator; 