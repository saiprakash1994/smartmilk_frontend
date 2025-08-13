import React, { useState, useEffect } from "react";
import { Container, Form, Button, Row, Col, Alert } from "react-bootstrap";
import { Card } from "react-bootstrap";
import "./Collection.scss";

import {
  useAddRecordMutation,
  useUpdateRecordMutation,
  useGetRecordByCodeDateShiftQuery,
  useGetRecordsByDateShiftQuery,
} from "./recordApiSlice";
import {
  useGetDeviceByCodeQuery,
  useGetDeviceByIdQuery,
} from "../device/store/deviceEndPoint";
import { UserTypeHook } from "../../shared/hooks/userTypeHook";
import { roles } from "../../shared/utils/appRoles";
import { useSelector } from "react-redux";
import { errorToast, successToast } from "../../shared/utils/appToaster";
import { initial } from "lodash";

export default function MilkEntryPage() {
  const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
  const userType = UserTypeHook();
  const isDairy = userType === roles.DAIRY;
  const isDevice = userType === roles.DEVICE;
  const deviceid = userInfo?.deviceid;
  const dairyCode = userInfo?.dairyCode;

  // Fetch devices for Dairy, or single device for Device user
  const { data: dairyDevices = [], isLoading: isDairyLoading } =
    useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy || !dairyCode });
  const { data: deviceData, isLoading: isDeviceLoading } =
    useGetDeviceByIdQuery(deviceid, { skip: !isDevice });
  const deviceList = isDairy ? dairyDevices : deviceData ? [deviceData] : [];

  const [deviceCode, setDeviceCode] = useState("");
  const [commissionRate, setCommissionRate] = useState(0);
  const [sampleDate, setSampleDate] = useState(""); // e.g., "2025-08-07"
  const [sampleShift, setSampleShift] = useState("MORNING"); // or determine dynamically
  const [isEditRecord, setIsEditRecord] = useState(false);

  const initialState = {
    id: "",
    code: "",
    milktype: "",
    fat: "",
    snf: "",
    clr: 0,
    water: 0,
    rate: 0,
    qty: 0,
    incentive: 0,
    amount: 0,
    totalAmount: 0,
  };

  const [form, setForm] = useState(initialState);

  const [addRecord] = useAddRecordMutation();
  const [updateRecord] = useUpdateRecordMutation();

  const { data: shiftData, isSuccess: isShiftSuccess } =
    useGetRecordsByDateShiftQuery(
      {
        devicecode: deviceCode,
        date: sampleDate,
        shift: sampleShift,
      },
      { skip: !(deviceCode && sampleDate && sampleShift) } // skip if no code entered yet
    );

  const [member, setMember] = useState({});

  // Always derive members from deviceList and deviceCode
  const selectedDevice = deviceList.find((dev) => dev.deviceid === deviceCode);
  const members = selectedDevice?.members || [];

  const serverSettings = selectedDevice?.serverSettings || [];

  const fatBufTable = selectedDevice?.fatBufTable || [];
  const fatCowTable = selectedDevice?.fatCowTable || [];

  const snfCowTable = selectedDevice?.snfCowTable || {};
  const snfBufTable = selectedDevice?.snfBufTable || {};

  useEffect(() => {
    if (isDevice && deviceid) setDeviceCode(deviceid);
  }, [isDevice, deviceid]);

  useEffect(() => {
    if (isShiftSuccess && shiftData) {
      console.log("Fetched Shift Data:", shiftData);

      console.log("server settings", serverSettings);
    }
  }, [isShiftSuccess, shiftData]);

  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-GB"); // DD/MM/YYYY format

    setSampleDate(formattedDate); // "YYYY-MM-DD"

    const hours = today.getHours();
    setSampleShift(hours < 12 ? "MORNING" : "EVENING");
  }, []);

  // useEffect(() => {
  //   if (isSuccess && recordData && typeof recordData === "object") {
  //     setForm((prev) => ({
  //       ...prev,
  //       ...recordData,
  //     }));
  //   }
  // }, [isSuccess, recordData]);

  // useEffect(() => {
  //   const { fat, snf, milktype } = form;

  //   if (!fat || !snf || !milktype) {
  //     setForm((prev) => ({ ...prev, rate: "" }));
  //     return;
  //   }

  //   const fatNum = parseFloat(fat);
  //   const snfNum = parseFloat(snf);
  //   if (isNaN(fatNum) || isNaN(snfNum)) {
  //     setForm((prev) => ({ ...prev, rate: "" }));
  //     return;
  //   }

  //   const table = milktype === "C" ? snfCowTable : snfBufTable;

  //   console.log("rate Table:", table);

  //   // Get min/max ranges
  //   const { fatMin, fatMax, snfMin, snfMax } = getFatSnfRange(table);

  //   let lookupFat = fatNum;
  //   let lookupSnf = snfNum;

  //   if (fatNum < fatMin || snfNum < snfMin) {
  //     // Below lower bound → use min values for both
  //     lookupFat = fatMin;
  //     lookupSnf = snfMin;
  //   } else if (fatNum > fatMax) {
  //     // Above upper bound → use max values for both
  //     lookupFat = fatMax;
  //   } else if (snfNum > snfMax) {
  //     // Above upper bound → use max values for both

  //     lookupSnf = snfMax;
  //   }

  //   const rate = getMilkRate(table, lookupFat, lookupSnf);

  //   setForm((prev) => ({
  //     ...prev,
  //     rate: rate !== null ? Number(rate).toFixed(2) : "",
  //   }));
  // }, [form.fat, form.snf, form.milktype]);

  // useEffect(() => {
  //   const { fat, snf, milktype } = form;

  //   if (!fat || !milktype) {
  //     setForm((prev) => ({ ...prev, rate: "" }));
  //     return;
  //   }

  //   const isCow = milktype === "C";
  //   const useSnf = isCow
  //     ? serverSettings?.useCowSnf
  //     : serverSettings?.useBufSnf;

  //   let rate = null;

  //   if (useSnf === "Y") {
  //     const fatNum = parseFloat(fat);
  //     const snfNum = parseFloat(snf);

  //     if (isNaN(fatNum) || isNaN(snfNum)) {
  //       setForm((prev) => ({ ...prev, rate: "" }));
  //       return;
  //     }

  //     const table = isCow ? snfCowTable : snfBufTable;
  //     const { fatMin, fatMax, snfMin, snfMax } = getFatSnfRange(table);

  //     let lookupFat = fatNum;
  //     let lookupSnf = snfNum;

  //     if (fatNum < fatMin || snfNum < snfMin) {
  //       lookupFat = fatMin;
  //       lookupSnf = snfMin;
  //     } else {
  //       if (fatNum > fatMax) lookupFat = fatMax;
  //       if (snfNum > snfMax) lookupSnf = snfMax;
  //     }

  //     rate = getMilkRate(table, lookupFat, lookupSnf);
  //   } else {
  //     const fatNum = parseFloat(fat);

  //     if (isNaN(fatNum)) {
  //       setForm((prev) => ({ ...prev, rate: "" }));
  //       return;
  //     }

  //     const fatTable = isCow ? fatCowTable : fatBufTable;

  //     const fatValues = fatTable.map((row) => row.FAT);
  //     const fatMin = Math.min(...fatValues);
  //     const fatMax = Math.max(...fatValues);

  //     let lookupFat = fatNum;

  //     if (fatNum < fatMin) {
  //       lookupFat = fatMin;
  //     } else if (fatNum > fatMax) {
  //       lookupFat = fatMax;
  //     }

  //     const fatEntry = fatTable.find((row) => row.FAT === lookupFat);
  //     rate = fatEntry ? fatEntry.RATE : null;
  //   }

  //   setForm((prev) => ({
  //     ...prev,
  //     rate: rate !== null ? Number(rate).toFixed(2) : "",
  //   }));
  // }, [form.fat, form.snf, form.milktype]);

  useEffect(() => {
    const fatNum = parseFloat(form.fat);
    const snfNum = parseFloat(form.snf);
    const milktype = form.milktype;

    if (!fatNum || !milktype) {
      setForm((prev) => ({ ...prev, rate: "" }));
      return;
    }

    const isCow = milktype === "C";
    const mixedMilk = serverSettings?.mixedMilk === "Y";
    const useSnf = isCow
      ? serverSettings?.useCowSnf === "Y"
      : serverSettings?.useBufSnf === "Y";

    const cowTable = useSnf ? snfCowTable : fatCowTable;
    const bufTable = useSnf ? snfBufTable : fatBufTable;

    const getRange = (table, isObjectFormat = false) => {
      if (isObjectFormat) {
        // When table is object (used for SNF-based rate charts)
        const { fatMin, fatMax, snfMin, snfMax } = getFatSnfRange(table);
        return { fatMin, fatMax, snfMin, snfMax };
      } else {
        // When table is array (used for FAT-only rate charts)
        const fatList = table.map((r) => r.FAT);
        const snfList = table.map((r) => r.SNF ?? 0);
        return {
          fatMin: Math.min(...fatList),
          fatMax: Math.max(...fatList),
          snfMin: Math.min(...snfList),
          snfMax: Math.max(...snfList),
        };
      }
    };

    const cowRange = getRange(cowTable, useSnf);
    const bufRange = getRange(bufTable, useSnf);

    // Default table and range
    let selectedTable = isCow ? cowTable : bufTable;
    let currentRange = isCow ? cowRange : bufRange;

    let withinRange = false;

    if (useSnf) {
      if (!form.snf || isNaN(snfNum)) {
        setForm((prev) => ({ ...prev, rate: "" }));
        return;
      }

      withinRange =
        fatNum >= currentRange.fatMin &&
        fatNum <= currentRange.fatMax &&
        snfNum >= currentRange.snfMin &&
        snfNum <= currentRange.snfMax;
    } else {
      withinRange =
        fatNum >= currentRange.fatMin && fatNum <= currentRange.fatMax;
    }

    // Mixed milk switching
    if (mixedMilk && !withinRange) {
      selectedTable = isCow ? bufTable : cowTable;
      currentRange = isCow ? bufRange : cowRange;
    }

    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    const getFatOnlyRate = (table, fatVal) => {
      const fatList = table.map((r) => r.FAT);
      const fatMin = Math.min(...fatList);
      const fatMax = Math.max(...fatList);
      const clampedFat = clamp(fatVal, fatMin, fatMax);
      return table.find((r) => r.FAT === clampedFat)?.RATE ?? null;
    };

    const getClampedRate = (table, fatVal, snfVal) => {
      const { fatMin, fatMax, snfMin, snfMax } = getFatSnfRange(table);
      const clampedFat = clamp(fatVal, fatMin, fatMax);
      const clampedSnf = clamp(snfVal, snfMin, snfMax);
      return getMilkRate(table, clampedFat, clampedSnf);
    };

    // Check low/high fat accept flags
    const isLowFatRejected =
      fatNum < currentRange.fatMin && serverSettings?.lowFatAccept !== "Y";
    const isHighFatRejected =
      fatNum > currentRange.fatMax && serverSettings?.highFatAccept !== "Y";
    const isLowSnfRejected =
      useSnf &&
      snfNum < currentRange.snfMin &&
      serverSettings?.lowFatAccept !== "Y";
    const isHighSnfRejected =
      useSnf &&
      snfNum > currentRange.snfMax &&
      serverSettings?.highFatAccept !== "Y";

    if (
      isLowFatRejected ||
      isHighFatRejected ||
      isLowSnfRejected ||
      isHighSnfRejected
    ) {
      setForm((prev) => ({ ...prev, rate: "0.00" }));
      return;
    }

    let finalRate = useSnf
      ? getClampedRate(selectedTable, fatNum, snfNum)
      : getFatOnlyRate(selectedTable, fatNum);

    setForm((prev) => ({
      ...prev,
      rate: finalRate !== null ? Number(finalRate).toFixed(2) : "",
    }));
  }, [form.fat, form.snf, form.milktype]);

  const getFatSnfRange = (table) => {
    const fatKeys = Object.keys(table).map(Number);
    const fatMin = Math.min(...fatKeys);
    const fatMax = Math.max(...fatKeys);

    const sampleSnfArr = table[fatMin.toFixed(1)];
    const snfValues = sampleSnfArr.map((item) =>
      parseFloat(Object.keys(item)[0])
    );
    const snfMin = Math.min(...snfValues);
    const snfMax = Math.max(...snfValues);

    return { fatMin, fatMax, snfMin, snfMax };
  };

  const getMilkRate = (table, fat, snf) => {
    const fatRow = table[fat.toFixed(1)];
    if (!fatRow) return null;

    for (const entry of fatRow) {
      const snfKey = Object.keys(entry)[0];
      if (parseFloat(snfKey) === parseFloat(snf.toFixed(1))) {
        return entry[snfKey];
      }
    }

    return null;
  };

  useEffect(() => {
    if (serverSettings?.commissionType === "Y") {
      if (member.COMMISSIONTYPE === "N") {
        // setCommissionRate(parseFloat(serverSettings?.normalCommission || 0));
        setCommissionRate((prev) =>
          parseFloat(serverSettings?.normalCommission || 0)
        );
      } else {
        const index = parseInt(member.COMMISSIONTYPE) - 1;
        setCommissionRate((prev) =>
          parseFloat(serverSettings?.specialCommission?.[index] || 0)
        );
      }
    } else setCommissionRate(0);
  }, [member]);

  useEffect(() => {
    const { rate, qty } = form;

    const rateNum = parseFloat(rate);
    const qtyNum = parseFloat(qty);
    let incentive = 0;

    if (!isNaN(rateNum) && !isNaN(qtyNum)) {
      const amount = (rateNum * qtyNum).toFixed(2);

      console.log("sudha comm", commissionRate);

      if (qtyNum) {
        incentive = qtyNum * commissionRate;
      }

      setForm((prev) => ({
        ...prev,
        incentive,
        amount,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        amount: "",
      }));
    }
  }, [form.rate, form.qty]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validation logic
    let updatedValue = value;

    if (name === "code") {
      if (!/^\d{0,4}$/.test(value)) return;
    } else if (name === "fat" || name === "snf" || name === "clr") {
      if (!/^\d{0,2}(\.\d{0,1})?$/.test(value)) return;
    } else if (name === "qty") {
      if (!/^\d{0,3}(\.\d{0,2})?$/.test(value)) return;
    }

    // setForm({ ...form, [name]: updatedValue });
    setForm((prev) => ({
      ...prev,
      [name]: updatedValue,
      // Clear name and milktype while typing in "code"
      ...(name === "code" && { name: "", milktype: "" }),
    }));
  };

  const handleDeviceChange = (e) => {
    setDeviceCode(e.target.value);
    setForm(initialState); // reset form on device change
    setMember({});
    setCommissionRate(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let newRecord = {};
    let editRecord = {};

    if (!isEditRecord) {
      const today = new Date();

      const formattedDate = today.toLocaleDateString("en-GB"); // DD/MM/YYYY format

      console.log(formattedDate);

      const now = new Date();

      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");

      const formattedTime = `${hours}:${minutes}:${seconds}`;

      console.log(formattedTime);
      const timePeriod = hours < 12 ? "MORNING" : "EVENING";

      console.log(timePeriod);

      newRecord = {
        DEVICEID: String(deviceCode),
        CODE: parseInt(form.code),
        MILKTYPE: form.milktype,
        FAT: parseFloat(form.fat),
        SNF: parseFloat(form.snf),
        QTY: parseFloat(form.qty),
        RATE: parseFloat(form.rate),
        SAMPLEDATE: formattedDate,
        SAMPLETIME: formattedTime,
        SHIFT: timePeriod,
        RECORDTYPE: "A",
        ANALYZERMODE: "MANUAL",
        WEIGHTMODE: "MANUAL",
        CLR: 0.0, // if needed calculate
        WATER: 0.0,
        ANALYZERSAMPLETIME: formattedTime,
        INCENTIVEAMOUNT: parseFloat(form.incentive),
      };
    } else {
      editRecord = {
        id: form.id,
        CODE: parseInt(form.code),
        MILKTYPE: form.milktype === "C" ? "COW" : "BUF",
        FAT: parseFloat(form.fat),
        SNF: parseFloat(form.snf),
        QTY: parseFloat(form.qty),
        RATE: parseFloat(form.rate),
        RECORDTYPE: "E",
        ANALYZERMODE: "MANUAL",
        WEIGHTMODE: "MANUAL",
        CLR: form.clr, // if needed calculate
        WATER: form.water,
        INCENTIVEAMOUNT: parseFloat(form.incentive),
      };
    }

    try {
      if (isEditRecord) {
        // Update existing record
        console.log(editRecord.id);
        await updateRecord({ id: editRecord.id, ...editRecord }).unwrap();
        successToast("Record updated successfully!");
        setForm(initialState);
        setIsEditRecord(false);
        setMember({});
      } else {
        await addRecord(newRecord).unwrap();
        successToast("Record added successfully!");
        setForm(initialState);
        setMember({});
      }
    } catch (err) {
      errorToast(`Error ${isEditRecord ? "updating" : "adding"} record`);
      setForm(initialState);
      setMember({});
    }

    // alert(`Device: ${deviceCode}\nData: ` + JSON.stringify(form, null, 2));
  };

  const handleEdit = (record) => {
    const editMember = members.find((m) => m.CODE === record.CODE);
    const amount = record.RATE * record.QTY;
    const totalAmount = amount + record.INCENTIVEAMOUNT;

    setIsEditRecord(true);

    setForm((prev) => ({
      ...prev,
      id: record._id,
      code: record.CODE || "",
      name: editMember.MEMBERNAME || "",
      milktype: editMember.MILKTYPE || "",
      fat: record.FAT || "",
      snf: record.SNF || "",
      clr: record.CLR || "",
      rate: record.RATE || "",
      qty: record.QTY || "",
      amount: amount || "",
      incentive: record.INCENTIVEAMOUNT || "",
      totalAmount: totalAmount || "",
    }));
    setMember(editMember);
    console.log("edit Record:", form);
    console.log("server settings", serverSettings);
  };

  const handleReset = () => {
    setIsEditRecord(false);
    setForm(initialState);
  };

  const handleCodeBlur = () => {
    const enteredCode = Number(form.code);

    // Check if this code is already loaded
    if (member?.CODE !== enteredCode) {
      setForm(initialState); // Clear form first if different member code
      setMember({});
    }

    const foundMember = members.find((m) => m.CODE === enteredCode);

    if (foundMember) {
      setForm((prev) => ({
        ...prev,
        code: enteredCode,
        name: foundMember.MEMBERNAME,
        milktype: foundMember.MILKTYPE === "C" ? "COW" : "BUF",
      }));
      setMember(foundMember);
    } else {
      setForm(initialState);
      setMember({});
      errorToast(`Code ${form.code} not found`);
    }
  };

  return (
    <Container className=" device-page m-4">
      <Card className="m-4">
        <Card.Header className="card-header-gradient">
          <h4 className="mb-0">Milk Entry Form</h4>
        </Card.Header>
        <Card.Body>
          <Row className="mb-3 ">
            <Col md={4}>
              <Form.Group controlId="formDevice">
                <Form.Label>Select Device</Form.Label>
                <Form.Select
                  value={deviceCode}
                  onChange={handleDeviceChange}
                  disabled={isDevice}
                >
                  <option value="">Select Device</option>
                  {deviceList.map((dev) => (
                    <option key={dev.deviceid} value={dev.deviceid}>
                      {dev.deviceid}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {members.length === 0 ? (
            <Alert variant="warning">No members added</Alert>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group controlId="formCode">
                    <Form.Label>Code (max 9999)</Form.Label>
                    <Form.Control
                      type="text"
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      disabled={isEditRecord}
                      onBlur={handleCodeBlur}
                      placeholder="e.g. 1234"
                    />
                  </Form.Group>
                </Col>

                {form.name && (
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.name}
                        readOnly
                        plaintext
                      />
                    </Form.Group>
                  </Col>
                )}

                {form.milktype && (
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Milk Type</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.milktype}
                        readOnly
                        plaintext
                      />
                    </Form.Group>
                  </Col>
                )}
              </Row>

              {form.code && form.milktype && (
                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Group controlId="formFat">
                      <Form.Label>FAT</Form.Label>
                      <Form.Control
                        type="text"
                        name="fat"
                        value={form.fat}
                        onChange={handleChange}
                        onBlur={(e) => {
                          const num = parseFloat(e.target.value || 0).toFixed(
                            1
                          );
                          setForm((prev) => ({ ...prev, fat: num }));
                        }}
                        disabled={!deviceCode}
                        placeholder="e.g. 04.5"
                      />
                    </Form.Group>
                  </Col>

                  {((serverSettings?.useBufSnf === "Y" &&
                    member.MILKTYPE === "B") ||
                    (serverSettings?.useCowSnf === "Y" &&
                      member.MILKTYPE === "C")) && (
                    <Col md={4}>
                      <Form.Group controlId="formSnf">
                        <Form.Label>SNF</Form.Label>
                        <Form.Control
                          type="text"
                          name="snf"
                          value={form.snf}
                          onChange={(e) =>
                            setForm({ ...form, snf: e.target.value })
                          }
                          onBlur={(e) => {
                            const num = parseFloat(e.target.value || 0).toFixed(
                              1
                            );
                            setForm((prev) => ({ ...prev, snf: num }));
                          }}
                          placeholder="00.0"
                        />
                      </Form.Group>
                    </Col>
                  )}

                  <Col md={4}>
                    <Form.Group controlId="formRate">
                      <Form.Label>Rate</Form.Label>
                      <Form.Control
                        type="text"
                        name="rate"
                        value={(parseFloat(form.rate) || 0).toFixed(2)}
                        readOnly
                        plaintext
                      />
                    </Form.Group>
                  </Col>
                </Row>
              )}

              {form.code && form.rate && (
                <Row className="align-items-end">
                  <Col md={commissionRate > 0 ? 3 : 4}>
                    <Form.Group controlId="formQty">
                      <Form.Label>Quantity</Form.Label>
                      <Form.Control
                        type="text"
                        name="qty"
                        value={form.qty}
                        onBlur={(e) => {
                          const num = parseFloat(e.target.value || 0).toFixed(
                            2
                          );
                          setForm((prev) => ({ ...prev, qty: num }));
                        }}
                        onChange={handleChange}
                        disabled={!deviceCode}
                        // placeholder="e.g. 123.45"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={commissionRate > 0 ? 3 : 4}>
                    <Form.Group controlId="formAmount">
                      <Form.Label>Amount</Form.Label>
                      <Form.Control
                        type="text"
                        name="amount"
                        value={form.amount}
                        readOnly
                      />
                    </Form.Group>
                  </Col>

                  {serverSettings?.commissionType === "Y" && (
                    <Col md={3}>
                      <Form.Group controlId="formIncentive">
                        <Form.Label>{`Incentive (${commissionRate.toFixed(
                          2
                        )}/Ltr)`}</Form.Label>
                        <Form.Control
                          type="text"
                          name="incentive"
                          value={(parseFloat(form.incentive) || 0).toFixed(2)}
                          readOnly
                          placeholder="0.00"
                        />
                      </Form.Group>
                    </Col>
                  )}

                  {parseFloat(form.incentive) > 0 && (
                    <Col md={3}>
                      <Form.Group controlId="formTotalAmount">
                        <Form.Label>Total Amount</Form.Label>
                        <Form.Control
                          type="text"
                          name="totalAmount"
                          value={(
                            (parseFloat(form.incentive) || 0) +
                            (parseFloat(form.amount) || 0)
                          ).toFixed(2)}
                          readOnly
                          placeholder="0.00"
                        />
                      </Form.Group>
                    </Col>
                  )}
                </Row>
              )}

              <div className="d-flex justify-content-center gap-3 mt-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!form.code || form.amount <= 0}
                >
                  {isEditRecord ? "Edit Record" : "Add Record"}
                </Button>
                <Button type="button" variant="secondary" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </Form>
          )}
        </Card.Body>
      </Card>
      {isShiftSuccess && shiftData && (
        <Card
          className="m-4"
          style={{
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          }}
        >
          <Card.Header className="d-flex justify-content-between align-items-center card-header-gradient">
            <div className="text-start flex-grow-1">
              <strong>Device Code:</strong> {deviceCode}
            </div>
            <div className="text-center" style={{ flex: 1 }}>
              <strong>Date:</strong> {sampleDate}
            </div>
            <div className="text-end" style={{ flex: 1 }}>
              <strong>Shift:</strong> {sampleShift}
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive d-flex justify-content-center m-4">
              <table className="table table-bordered table-hover align-middle text-center">
                <thead className="table-primary">
                  <tr>
                    <th>#</th>
                    <th>CODE</th>
                    <th>MILK</th>
                    <th>FAT %</th>
                    <th>SNF</th>
                    <th>CLR</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Amount</th>
                    <th>Incentive</th>
                    <th>Total Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftData?.map((record, index) => (
                    <tr
                      key={record._id}
                      className={
                        record.RECORDTYPE === "E" ? "table-danger" : ""
                      }
                    >
                      <td>{index + 1}</td>
                      <td>{record.CODE}</td>
                      <td>{record.MILKTYPE}</td>
                      <td>{record.FAT.toFixed(1)}</td>
                      <td>{record.SNF.toFixed(1)}</td>
                      <td>{record.CLR}</td>
                      <td>{record.QTY.toFixed(2)}</td>
                      <td>{record.RATE.toFixed(2)}</td>
                      <td>{(record.QTY * record.RATE).toFixed(2)}</td>
                      <td>{record.INCENTIVEAMOUNT.toFixed(2)}</td>
                      <td>
                        {(
                          record.QTY * record.RATE +
                          record.INCENTIVEAMOUNT
                        ).toFixed(2)}
                      </td>
                      <td className="d-flex align-items-center gap-2">
                        <button
                          onClick={() => handleEdit(record)}
                          disabled={isEditRecord}
                          className="btn btn-sm btn-primary"
                        >
                          Edit
                        </button>
                        <button
                          disabled={isEditRecord}
                          className="btn btn-sm btn-danger"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
