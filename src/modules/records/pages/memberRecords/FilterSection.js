import React from "react";
import Form from "react-bootstrap/esm/Form";
import Button from "react-bootstrap/esm/Button";
import Spinner from "react-bootstrap/esm/Spinner";
import InputGroup from "react-bootstrap/esm/InputGroup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDesktop, faUser, faClock, faSearch, faCalendarDays } from "@fortawesome/free-solid-svg-icons";

const getToday = () => new Date().toISOString().split("T")[0];

const FilterSection = ({
    isAdmin,
    isDairy,
    isDevice,
    isAdminLoading,
    isDairyLoading,
    isDeviceLoading,
    deviceList,
    deviceCode,
    setDeviceCode,
    fromCode,
    setFromCode,
    toCode,
    setToCode,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    shift,
    setShift,
    memberCodes,
    handleSearch,
    isFetching
}) => (
    <Form className="row g-3 align-items-end">
        {(isAdmin || isDairy) && (
            <Form.Group className="col-md-2">
                <Form.Label className="form-label-modern">Device Code</Form.Label>
                <InputGroup>
                    <InputGroup.Text><FontAwesomeIcon icon={faDesktop} /></InputGroup.Text>
                    <Form.Select className="form-select-modern select-device" value={deviceCode} onChange={e => setDeviceCode(e.target.value)}>
                        <option value="">Select Device</option>
                        {deviceList?.map((dev) => (
                            <option key={dev.deviceid} value={dev.deviceid}>{dev.deviceid}</option>
                        ))}
                    </Form.Select>
                </InputGroup>
            </Form.Group>
        )}
        {isDevice && (
            <Form.Group className="col-md-2">
                <Form.Label className="form-label-modern">Device Code</Form.Label>
                <InputGroup>
                    <InputGroup.Text><FontAwesomeIcon icon={faDesktop} /></InputGroup.Text>
                    <Form.Control className="form-control-modern select-device" type="text" value={deviceCode} readOnly />
                </InputGroup>
            </Form.Group>
        )}
        <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">Start Member</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faUser} /></InputGroup.Text>
                <Form.Select className="form-select-modern select-member" value={fromCode} onChange={e => setFromCode(e.target.value)}>
                    <option value="">Start Member Code</option>
                    {memberCodes?.map((code, idx) => (
                        <option key={idx} value={code.CODE}>{code.CODE} - {code.MEMBERNAME}</option>
                    ))}
                </Form.Select>
            </InputGroup>
        </Form.Group>
        <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">End Member</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faUser} /></InputGroup.Text>
                <Form.Select className="form-select-modern select-member" value={toCode} onChange={e => setToCode(e.target.value)}>
                    <option value="">End Member Code</option>
                    {memberCodes?.map((code, idx) => (
                        <option key={idx} value={code.CODE}>{code.CODE} - {code.MEMBERNAME}</option>
                    ))}
                </Form.Select>
            </InputGroup>
        </Form.Group>
        <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">From Date</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faCalendarDays} /></InputGroup.Text>
                <Form.Control className="form-control-modern select-date" type="date" value={fromDate} max={getToday()} onChange={e => setFromDate(e.target.value)} />
            </InputGroup>
        </Form.Group>
        <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">To Date</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faCalendarDays} /></InputGroup.Text>
                <Form.Control className="form-control-modern select-date" type="date" value={toDate} max={getToday()} onChange={e => setToDate(e.target.value)} />
            </InputGroup>
        </Form.Group>
        <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">Shift</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faClock} /></InputGroup.Text>
                <Form.Select className="form-select-modern select-shift" value={shift} onChange={e => setShift(e.target.value)}>
                    <option value="BOTH">ALL</option>
                    <option value="MORNING">MORNING</option>
                    <option value="EVENING">EVENING</option>
                </Form.Select>
            </InputGroup>
        </Form.Group>
        <Form.Group className="col-md-2 ms-auto d-flex align-items-end justify-content-end">
            <Button className="w-100 export-btn" variant="primary" onClick={handleSearch} disabled={isFetching} type="button">
                {isFetching ? <Spinner size="sm" animation="border" /> : <FontAwesomeIcon icon={faSearch} />} Search
            </Button>
        </Form.Group>
    </Form>
);

export default FilterSection; 