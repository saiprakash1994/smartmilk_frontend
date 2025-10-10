import React, { useState, useEffect } from "react";
import {
  Container,
  Form,
  Button,
  Row,
  Col,
  Alert,
  InputGroup,
  Card,
} from "react-bootstrap";
import { GiCow, GiBison } from "react-icons/gi";
import "./Collection.scss";

import {
  FaRupeeSign,
  FaGift,
  FaKeyboard,
  FaTint,
  FaUser,
  FaPercent,
} from "react-icons/fa";
import { FaBottleDroplet } from "react-icons/fa6"; // if using FA6

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
    clr: "",
    water: "",
    rate: "",
    qty: "",
    incentive: "",
    amount: "",
    totalAmount: "",
  };

  const [form, setForm] = useState(initialState);

  const [addRecord] = useAddRecordMutation();
  const [updateRecord] = useUpdateRecordMutation();

  const {
    data: shiftData,
    isSuccess: isShiftSuccess,
    isFetching: isShiftFetching, // <-- Add this
  } = useGetRecordsByDateShiftQuery(
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

    if (!cowTable || !bufTable) {
      setForm((prev) => ({ ...prev, rate: "" }));
      return;
    }

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
    if (!table || Object.keys(table).length === 0) {
      return { fatMin: 0, fatMax: 0, snfMin: 0, snfMax: 0 };
    }
    const fatKeys = Object.keys(table).map(Number);
    const fatMin = Math.min(...fatKeys);
    const fatMax = Math.max(...fatKeys);

    const sampleSnfArr = table[fatMin.toFixed(1)];
    if (!sampleSnfArr || sampleSnfArr.length === 0) {
      return { fatMin, fatMax, snfMin: 0, snfMax: 0 };
    }
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
        incentive: incentive.toFixed(2),
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
    const newDeviceCode = e.target.value;
    setDeviceCode(newDeviceCode); // Set device code first
    setForm(initialState); // Then reset form
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
      fat: record.FAT?.toFixed(1) || "",
      snf: record.SNF?.toFixed(1) || "",
      clr: record.CLR?.toFixed(1) || "",
      rate: record.RATE?.toFixed(2) || "",
      qty: record.QTY?.toFixed(2) || "",
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
    if (!form.code) return; // <-- Add this line
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
    <Container className=" device-page ">
      <Card className="mx-4  card-header-gradient">
        <Card.Header className="card-header-gradient">
          <h4 className="mb-0">Milk Entry Form</h4>
        </Card.Header>
        <Card.Body
          style={{
            backgroundColor: "#f9f9f9",
          }}
        >
          {isDairy && (
            <div
              className="d-flex flex-row align-items-center gap-2 mb-3"
              style={{ maxWidth: 400, margin: "0 auto" }}
            >
              <Form.Label
                className="fw-bold mb-0"
                style={{ color: "black", minWidth: 70 }}
              >
                Device
              </Form.Label>
              <Form.Select
                value={deviceCode}
                onChange={isDairy && handleDeviceChange}
                disabled={isDairyLoading}
                style={{ flex: 1 }}
              >
                <option value="">All Devices</option>
                {deviceList.map((dev) => (
                  <option key={dev.deviceid} value={dev.deviceid}>
                    {dev.deviceid}
                  </option>
                ))}
                ))}
              </Form.Select>
              {isDairyLoading && (
                <div className="text-center text-secondary mt-2">
                  Loading devices...
                </div>
              )}
            </div>
          )}
          {!deviceCode ? (
            <Alert variant="info">
              Please select a device to do milk collection
            </Alert>
          ) : members?.length === 0 ? (
            <Alert variant="warning">No members added for this device.</Alert>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Card
                className="mb-4"
                style={{
                  borderRadius: 14,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                }}
              >
                <Card.Body>
                  <Row className="mb-3 g-4">
                    <Col
                      md={3}
                      className="d-flex flex-column align-items-center"
                    >
                      <Form.Group>
                        <Form.Label className="mb-1 fw-bold text-center d-block">
                          Code
                        </Form.Label>
                        <InputGroup className="code-group w-auto">
                          <InputGroup.Text className="fs-6 code-toggle-color">
                            <FaUser />
                          </InputGroup.Text>
                          <Form.Control
                            className="base-code-input base-code-input-sm"
                            type="text"
                            name="code"
                            value={form.code}
                            onChange={handleChange}
                            disabled={isEditRecord}
                            onBlur={() => {
                              if (form.code) handleCodeBlur();
                            }}
                            required
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    {form.milktype && (
                      <Col
                        md={3}
                        className="d-flex flex-column align-items-center"
                      >
                        <Form.Group className="w-100 text-center">
                          <Form.Label className="mb-1 fw-bold d-block">
                            Milk Type
                          </Form.Label>

                          <InputGroup className="code-group justify-content-center w-auto">
                            <InputGroup.Text className="fs-6 code-toggle-color">
                              <FaTint />
                            </InputGroup.Text>
                            <Form.Control
                              className="base-code-input base-code-input-sm text-muted"
                              type="text"
                              name="milktype"
                              value={form.milktype}
                              readOnly
                              disabled
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>
                    )}
                    {form.name && (
                      <Col md={3}>
                        <Form.Group>
                          <Form.Label className="mb-1 fw-bold text-center d-block">
                            Member Name
                          </Form.Label>

                          <InputGroup className="code-group w-auto">
                            <InputGroup.Text className="  fs-6 code-toggle-color">
                              <FaUser />
                            </InputGroup.Text>
                            <Form.Control
                              className=" base-code-input text-muted"
                              type="text"
                              name="name"
                              value={form.name}
                              readOnly
                              disabled
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>
                    )}
                  </Row>

                  {form.code && form.milktype && (
                    <Row className="mb-4 g-4">
                      <Col
                        md={3}
                        className="d-flex flex-column align-items-center"
                      >
                        <Form.Group>
                          <Form.Label className="mb-1 fw-bold text-center d-block">
                            FAT
                          </Form.Label>
                          <InputGroup className="code-group w-auto">
                            <Form.Control
                              className="base-fat-input base-code-input-sm"
                              type="text"
                              name="fat"
                              value={form.fat}
                              onChange={handleChange}
                              onBlur={(e) => {
                                const num = parseFloat(
                                  e.target.value || 0
                                ).toFixed(1);
                                setForm((prev) => ({ ...prev, fat: num }));
                              }}
                              disabled={!deviceCode}
                              // placeholder="e.g. 04.5"
                            />
                            <InputGroup.Text className="fs-6 code-toggle-color">
                              <FaPercent />
                            </InputGroup.Text>
                          </InputGroup>
                        </Form.Group>
                      </Col>
                      {((serverSettings?.useBufSnf === "Y" &&
                        member.MILKTYPE === "B") ||
                        (serverSettings?.useCowSnf === "Y" &&
                          member.MILKTYPE === "C")) && (
                        <Col
                          md={3}
                          className="d-flex flex-column align-items-center"
                        >
                          <Form.Group>
                            <Form.Label className="mb-1 fw-bold text-center d-block">
                              SNF
                            </Form.Label>
                            <InputGroup className="code-group w-auto">
                              <Form.Control
                                className="base-fat-input base-code-input-sm"
                                type="text"
                                name="snf"
                                value={form.snf}
                                onChange={handleChange}
                                onBlur={(e) => {
                                  const num = parseFloat(
                                    e.target.value || 0
                                  ).toFixed(1);
                                  setForm((prev) => ({ ...prev, snf: num }));
                                }}
                                disabled={!deviceCode}
                                // placeholder="e.g. 04.5"
                              />
                              <InputGroup.Text className="fs-6 code-toggle-color">
                                <FaPercent />
                              </InputGroup.Text>
                            </InputGroup>
                          </Form.Group>
                        </Col>
                      )}
                      {form.clr && (
                        <Col
                          md={3}
                          className="d-flex flex-column align-items-center"
                        >
                          <Form.Group>
                            <Form.Label className="mb-1 fw-bold text-center d-block">
                              CLR
                            </Form.Label>
                            <InputGroup className="code-group w-auto">
                              <Form.Control
                                className="base-fat-input base-code-input-sm"
                                type="text"
                                name="clr"
                                value={form.clr}
                                readOnly
                                // plaintext
                              />
                              <InputGroup.Text className="fs-6 code-toggle-color">
                                %
                              </InputGroup.Text>
                            </InputGroup>
                          </Form.Group>
                        </Col>
                      )}
                      {form.fat && form.rate && (
                        <Col
                          md={3}
                          className="d-flex flex-column align-items-center"
                        >
                          <Form.Group>
                            <Form.Label className="mb-1 fw-bold text-center d-block">
                              RATE
                            </Form.Label>
                            <InputGroup className="code-group w-auto">
                              <InputGroup.Text className="fs-6 code-toggle-color">
                                <FaRupeeSign />
                              </InputGroup.Text>
                              <Form.Control
                                className="base-code-input base-code-input-sm"
                                type="text"
                                name="rate"
                                value={form.rate}
                                readOnly
                                disabled
                                // plaintext
                              />
                            </InputGroup>
                          </Form.Group>
                        </Col>
                      )}
                    </Row>
                  )}

                  {form.code && form.rate && (
                    <Row className="align-items-end mb-4 g-4">
                      <Col
                        md={commissionRate > 0 ? 3 : 4}
                        className="d-flex flex-column align-items-center"
                      >
                        <Form.Group>
                          <Form.Label className="mb-1 fw-bold text-center d-block">
                            QTY
                          </Form.Label>
                          <InputGroup className="code-group w-auto">
                            <InputGroup.Text className="fs-6 code-toggle-color">
                              <FaBottleDroplet />
                            </InputGroup.Text>
                            <Form.Control
                              className="base-code-input base-code-input-sm"
                              type="text"
                              name="qty"
                              value={form.qty}
                              onBlur={(e) => {
                                const num = parseFloat(
                                  e.target.value || 0
                                ).toFixed(2);

                                setForm((prev) => ({ ...prev, qty: num }));
                              }}
                              onChange={handleChange}
                              disabled={!deviceCode}
                              // placeholder="e.g. 123.45"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      {form.qty && (
                        <Col
                          md={3}
                          className="d-flex flex-column align-items-center"
                        >
                          <Form.Group controlId="formAmount">
                            <Form.Label className="mb-1 fw-bold text-center d-block">
                              AMOUNT
                            </Form.Label>
                            <InputGroup className="code-group w-auto">
                              <InputGroup.Text className="fs-6 code-toggle-color">
                                <FaRupeeSign />
                              </InputGroup.Text>
                              <Form.Control
                                className="base-code-input base-code-input-sm text-muted  "
                                type="text"
                                name="amount"
                                value={form.amount}
                                readOnly
                                disabled
                              />
                            </InputGroup>
                          </Form.Group>
                        </Col>
                      )}

                      {serverSettings?.commissionType === "Y" && form.qty && (
                        <Col
                          md={3}
                          className="d-flex flex-column align-items-center"
                        >
                          <Form.Group controlId="formAmount">
                            <Form.Label className="mb-1 fw-bold text-center d-block">
                              {`Incentive (${commissionRate.toFixed(2)}/Ltr)`}
                            </Form.Label>
                            <InputGroup className="code-group w-auto">
                              <InputGroup.Text className="fs-6 code-toggle-color">
                                <FaGift />
                              </InputGroup.Text>
                              <Form.Control
                                className="base-code-input base-code-input-sm text-muted  "
                                type="text"
                                name="incentive"
                                value={form.incentive}
                                readOnly
                                disabled
                              />
                            </InputGroup>
                          </Form.Group>
                        </Col>
                      )}

                      {parseFloat(form.incentive) > 0 && (
                        <Col
                          md={3}
                          className="d-flex flex-column align-items-center"
                        >
                          <Form.Group controlId="formAmount">
                            <Form.Label className="mb-1 fw-bold text-center d-block">
                              Grand Total
                            </Form.Label>
                            <InputGroup className="code-group w-auto">
                              <InputGroup.Text className="fs-6 code-toggle-color">
                                <FaRupeeSign />
                              </InputGroup.Text>
                              <Form.Control
                                className="base-code-input base-code-input-sm text-muted  "
                                type="text"
                                name="totalAmount"
                                value={(
                                  (parseFloat(form.incentive) || 0) +
                                  (parseFloat(form.amount) || 0)
                                ).toFixed(2)}
                                readOnly
                                disabled
                              />
                            </InputGroup>
                          </Form.Group>
                        </Col>
                      )}
                    </Row>
                  )}
                </Card.Body>
                <Card.Footer>
                  {/* <div className="d-flex justify-content-center gap-3 mt-4"> */}
                  <div className="d-flex justify-content-center gap-3 mt-2">
                    <Button
                      style={{
                        background:
                          "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                        color: "whitesmoke",
                        fontWeight: "500",
                        border: "none",
                        borderRadius: 8,
                        boxShadow: "0 2px 8px rgba(40,167,69,0.08)",
                      }}
                      type="submit"
                      variant="primary"
                      disabled={!form.code || form.amount <= 0}
                    >
                      {isEditRecord ? "Edit Record" : "Add Record"}
                    </Button>
                    <Button
                      type="button"
                      style={{
                        background:
                          "linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)",
                        color: "whitesmoke",
                        fontSize: "1.0em",
                        fontWeight: "500",
                      }}
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                  </div>
                  {/* </div> */}
                </Card.Footer>
              </Card>
            </Form>
          )}
        </Card.Body>
      </Card>
      {deviceCode && isShiftFetching && (
        <div className="text-center m-4">
          <span className="spinner-border spinner-border-sm me-2" />
          Loading collections...
        </div>
      )}

      {deviceCode &&
        !isShiftFetching &&
        isShiftSuccess &&
        shiftData?.length > 0 && (
          <Card
            className="m-4"
            style={{
              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              borderRadius: 18,
            }}
          >
            <Card.Header className="card-header-gradient d-flex flex-column flex-md-row justify-content-between align-items-md-center align-items-start gap-2">
              <div className="text-center text-md-start flex-grow-1 w-100 w-md-auto">
                <strong>Device Code:</strong> {deviceCode}
              </div>
              <div className="d-flex flex-row justify-content-between w-100 w-md-auto">
                <div className="text-center me-2">
                  <strong>Date:</strong> {sampleDate}
                </div>
                <div className="text-end">
                  <strong>Shift:</strong> {sampleShift}
                </div>
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

      {deviceCode &&
        !isShiftFetching &&
        isShiftSuccess &&
        shiftData?.length === 0 && (
          <Alert variant="info" className="m-4">
            No collections done for this device, date, and shift.
          </Alert>
        )}
    </Container>
  );
}
