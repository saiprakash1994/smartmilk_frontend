import React, { useState, useEffect } from "react";
import { Card, Form, Button, Table, InputGroup, Alert } from "react-bootstrap";
import Papa from "papaparse";
import { FaPlus, FaTrash } from "react-icons/fa";
import './PriceTableGenerator.scss';

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
  // Milk type state
  const [milkType, setMilkType] = useState('Cow');
  // Step type state
  const [stepType, setStepType] = useState('FAT + SNF');
  const [basePrice, setBasePrice] = useState('25.00');
  const [fatStart, setFatStart] = useState('2.5');
  const [fatEnd, setFatEnd] = useState('4.9');
  const [fatStep, setFatStep] = useState(0.1);
  const [fatRules, setFatRules] = useState([...defaultFatRules]);
  const [snfStart, setSnfStart] = useState('7.5');
  const [snfEnd, setSnfEnd] = useState('8.6');
  const [snfStep, setSnfStep] = useState(0.1);
  const [snfRules, setSnfRules] = useState([...defaultSnfRules]);
  const [matrixTable, setMatrixTable] = useState([]);
  const [error, setError] = useState("");
  const [fatRuleError, setFatRuleError] = useState("");
  const [snfRuleError, setSnfRuleError] = useState("");

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
  const handleFatRuleChange = () => {};
  const handleSnfRuleChange = () => {};

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
    <>
      <Card >
        <Card.Body>
          <Card.Title className="text-center w-100 fs-2 py-3 text-primary bg-light rounded mb-4" style={{letterSpacing: '1px'}}>Rate Table Generator</Card.Title>
          <Form onSubmit={handleGenerate}>
            <div className="row justify-content-center mb-4">
              <div className="col-auto">
                <div className="d-flex align-items-center gap-4">
                  {/* Milk Type Selection */}
                  <div className="d-flex align-items-center" style={{ minWidth: 200 }}>
                    <Form.Label className="mb-0 me-2 fs-5 fw-bold text-nowrap" htmlFor="milkTypeSelect">
                      Milk Type
                    </Form.Label>
                    <Form.Select
                      id="milkTypeSelect"
                      value={milkType}
                      onChange={handleMilkTypeChange}
                      className="form-control-lg text-center"
                      style={{ width: 120, height: 48 }}
                    >
                      <option value="Cow">Cow</option>
                      <option value="Buffalo">Buffalo</option>
                    </Form.Select>
                  </div>
                  {/* Step Type Selection */}
                  <div className="d-flex align-items-center" style={{ minWidth: 200 }}>
                    <Form.Label className="mb-0 me-2 fs-5 fw-bold text-nowrap" htmlFor="stepTypeSelect">
                      Step Type
                    </Form.Label>
                    <Form.Select
                      id="stepTypeSelect"
                      value={stepType}
                      onChange={e => setStepType(e.target.value)}
                      className="form-control-lg text-center"
                      style={{ width: 160, height: 48 }}
                    >
                      <option value="FAT + SNF">FAT + SNF</option>
                      <option value="FAT + CLR">FAT + CLR</option>
                    </Form.Select>
                  </div>
                  {/* Base Rate */}
                  <div className="d-flex align-items-center" style={{ minWidth: 200 }}>
                    <Form.Label
                      className="mb-0 me-2 fs-5 fw-bold text-nowrap"
                      htmlFor="baseRateInput"
                    >
                      Base Rate
                    </Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="fs-5">₹</InputGroup.Text>
                      <Form.Control
                        id="baseRateInput"
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        value={basePrice}
                        className="form-control-lg text-center"
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
                        style={{ width: 120, height: 48 }}
                      />
                    </InputGroup>
                  </div>
                </div>
              </div>
            </div>
            <div className="row justify-content-center g-4">
              {/* FAT Section */}
              <div className="col-12 col-md-6 d-flex justify-content-center">
                <div className="border rounded p-4 w-100 bg-white" style={{maxWidth: 600}}>
                  <div className="row mb-2">
                    <div className="col-12">
                      <div className="fw-bold text-primary fs-5 text-center mb-2">FAT Limits</div>
                      <hr className="my-2" />
                    </div>
                  </div>
                  <div className="row justify-content-center mb-3">
                    <div className="col-4 mb-3">
                      <Form.Label className="fw-bold text-center w-100">FAT Start</Form.Label>
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
                        <InputGroup.Text>%</InputGroup.Text>
                      </InputGroup>
                    </div>
                    <div className="col-4 mb-3">
                      <Form.Label className="fw-bold text-center w-100">FAT End</Form.Label>
                      <InputGroup>
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
                        <InputGroup.Text>%</InputGroup.Text>
                      </InputGroup>
                    </div>
                  </div>
                  <div className="fw-bold text-primary fs-6 mb-2 mt-3">FAT Steps</div>
                  <hr className="my-2" />
                  {fatRuleError && <Alert variant="danger">{fatRuleError}</Alert>}
                  {fatRules.length > 0 && (
                    <Table bordered hover size="sm" className="text-center align-middle mb-3">
                      <thead className="table-light">
                        <tr>
                          <th style={{width: '15%'}}>Step</th>
                          <th style={{width: '25%'}}>From</th>
                          <th style={{width: '25%'}}>To</th>
                          <th style={{width: '25%'}}>Rate</th>
                          <th style={{width: '10%'}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fatRules.map((rule, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? '' : 'table-light'}>
                            <td className="fw-bold bg-light border rounded">{idx + 1}</td>
                            <td>
                              <Form.Control
                                type="text"
                                inputMode="decimal"
                                step="0.1"
                                value={rule.from !== undefined ? rule.from.toString() : ''}
                                className="text-center"
                                onChange={e => {
                                  const val = e.target.value;
                                  if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                    updateFatRuleValue(idx, 'from', val);
                                  }
                                }}
                                onBlur={e => {
                                  updateFatRuleValue(idx, 'from', Number(rule.from).toFixed(1));
                                  const err = validateFatRulesEditing(
                                    fatRules.map((r, i) => i === idx ? { ...r, from: Number(Number(e.target.value).toFixed(1)) } : r),
                                    Number(fatStart),
                                    Number(fatEnd)
                                  );
                                  setFatRuleError(err);
                                }}
                                placeholder=""
                              />
                            </td>
                            <td>
                              <Form.Control
                                type="text"
                                inputMode="decimal"
                                step="0.1"
                                value={rule.to !== undefined ? rule.to.toString() : ''}
                                className="text-center"
                                onChange={e => {
                                  const val = e.target.value;
                                  if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                    updateFatRuleValue(idx, 'to', val);
                                  }
                                }}
                                onBlur={e => {
                                  updateFatRuleValue(idx, 'to', Number(rule.to).toFixed(1));
                                  const err = validateFatRulesEditing(
                                    fatRules.map((r, i) => i === idx ? { ...r, to: Number(Number(e.target.value).toFixed(1)) } : r),
                                    Number(fatStart),
                                    Number(fatEnd)
                                  );
                                  setFatRuleError(err);
                                }}
                                placeholder=""
                              />
                            </td>
                            <td>
                              <Form.Control
                                type="number"
                                step="0.01"
                                value={rule.increment}
                                className="text-center"
                                onChange={e => updateFatRuleValue(idx, 'increment', e.target.value)}
                                onBlur={e => {
                                  const err = validateFatRulesEditing(
                                    fatRules.map((r, i) => i === idx ? { ...r, increment: parseFloat(e.target.value) } : r),
                                    fatStart,
                                    fatEnd
                                  );
                                  setFatRuleError(err);
                                }}
                                placeholder=""
                              />
                            </td>
                            <td>
                              <Button variant="danger" size="sm" onClick={() => handleRemoveFatRule(idx)} title="Remove Step">
                                <FaTrash />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                  <div className="d-flex justify-content-center mb-2">
                    <Button variant="primary" onClick={e => { e.preventDefault(); handleAddFatRule(); }} disabled={!canAddFatRule} className="d-flex align-items-center gap-2">
                      <FaPlus /> Add FAT Step
                    </Button>
                  </div>
                </div>
              </div>
              {/* SNF Section */}
              <div className="col-12 col-md-6 d-flex justify-content-center">
                <div className="border rounded p-4 w-100 bg-white" style={{maxWidth: 600}}>
                  <div className="row mb-2">
                    <div className="col-12">
                      <div className="fw-bold text-primary fs-5 text-center mb-2">{snfOrClrLabel} Limits</div>
                      <hr className="my-2" />
                    </div>
                  </div>
                  <div className="row justify-content-center mb-3">
                    <div className="col-4 mb-3">
                      <Form.Label className="fw-bold text-center w-100">{snfOrClrLabel} Start</Form.Label>
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
                        <InputGroup.Text>%</InputGroup.Text>
                      </InputGroup>
                    </div>
                    <div className="col-4 mb-3">
                      <Form.Label className="fw-bold text-center w-100">{snfOrClrLabel} End</Form.Label>
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
                        <InputGroup.Text>%</InputGroup.Text>
                      </InputGroup>
                    </div>
                  </div>
                  <div className="fw-bold text-primary fs-6 mb-2 mt-3">{snfOrClrLabel} Steps</div>
                  <hr className="my-2" />
                  {snfRuleError && <Alert variant="danger">{snfRuleError}</Alert>}
                  {snfRules.length > 0 && (
                    <Table bordered hover size="sm" className="text-center align-middle mb-3">
                      <thead className="table-light">
                        <tr>
                          <th style={{width: '15%'}}>Step</th>
                          <th style={{width: '25%'}}>From</th>
                          <th style={{width: '25%'}}>To</th>
                          <th style={{width: '25%'}}>Rate</th>
                          <th style={{width: '10%'}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {snfRules.map((rule, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? '' : 'table-light'}>
                            <td className="fw-bold bg-light border rounded">{idx + 1}</td>
                            <td>
                              <Form.Control
                                type="text"
                                inputMode="decimal"
                                step="0.1"
                                value={rule.from !== undefined ? rule.from.toString() : ''}
                                className="text-center"
                                onChange={e => {
                                  const val = e.target.value;
                                  if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                    updateSnfRuleValue(idx, 'from', val);
                                  }
                                }}
                                onBlur={e => {
                                  updateSnfRuleValue(idx, 'from', Number(rule.from).toFixed(1));
                                  const err = validateSnfRulesEditing(
                                    snfRules.map((r, i) => i === idx ? { ...r, from: Number(Number(e.target.value).toFixed(1)) } : r),
                                    Number(snfStart),
                                    Number(snfEnd)
                                  );
                                  setSnfRuleError(err);
                                }}
                                placeholder=" "
                              />
                            </td>
                            <td>
                              <Form.Control
                                type="text"
                                inputMode="decimal"
                                step="0.1"
                                value={rule.to !== undefined ? rule.to.toString() : ''}
                                className="text-center"
                                onChange={e => {
                                  const val = e.target.value;
                                  if (/^\d*(\.\d{0,1})?$/.test(val)) {
                                    updateSnfRuleValue(idx, 'to', val);
                                  }
                                }}
                                onBlur={e => {
                                  updateSnfRuleValue(idx, 'to', Number(rule.to).toFixed(1));
                                  const err = validateSnfRulesEditing(
                                    snfRules.map((r, i) => i === idx ? { ...r, to: Number(Number(e.target.value).toFixed(1)) } : r),
                                    Number(snfStart),
                                    Number(snfEnd)
                                  );
                                  setSnfRuleError(err);
                                }}
                                placeholder=""
                              />
                            </td>
                            <td>
                              <Form.Control
                                type="number"
                                step="0.01"
                                value={rule.increment}
                                className="text-center"
                                onChange={e => updateSnfRuleValue(idx, 'increment', e.target.value)}
                                onBlur={e => {
                                  const err = validateSnfRulesEditing(
                                    snfRules.map((r, i) => i === idx ? { ...r, increment: parseFloat(e.target.value) } : r),
                                    snfStart,
                                    snfEnd
                                  );
                                  setSnfRuleError(err);
                                }}
                                placeholder=""
                              />
                            </td>
                            <td>
                              <Button variant="danger" size="sm" onClick={() => handleRemoveSnfRule(idx)} title="Remove Step">
                                <FaTrash />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                  <div className="d-flex justify-content-center mb-2">
                    <Button variant="primary" onClick={e => { e.preventDefault(); handleAddSnfRule(); }} disabled={!canAddSnfRule} className="d-flex align-items-center gap-2">
                      <FaPlus /> Add {snfOrClrLabel} Step
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
            <div className="row justify-content-center mt-4">
              <div className="col-auto d-flex gap-4">
                <Button variant="success" type="submit" className="fs-5 fw-bold px-4 py-2 d-flex align-items-center gap-2">
                  <FaPlus /> Generate Table
                </Button>
                <Button variant="secondary" type="button" onClick={handleReset} className="fs-5 fw-bold px-4 py-2">Reset</Button>
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>
      {matrixTable.length > 0 && (
        <Card>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <Card.Title>Generated Rate Table</Card.Title>
                <Button variant="success" onClick={handleDownloadCSV}>Download CSV</Button>
            </div>
            <div style={{ maxHeight: 500, overflow: "auto" }}>
              <Table striped bordered hover responsive size="sm">
                <thead className="sticky-header">
                  <tr>
                  
                    {matrixTable[0].map((col, idx) => (
                      <th key={idx}>{
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
                        cidx === 0 ? <td key={cidx}><b>{cell}</b></td> : <td key={cidx}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}
    </>
  );
};

export default PriceTableGenerator; 