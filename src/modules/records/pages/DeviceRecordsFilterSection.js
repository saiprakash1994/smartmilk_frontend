import React from "react";
import Form from "react-bootstrap/esm/Form";
import Button from "react-bootstrap/esm/Button";
import Spinner from "react-bootstrap/esm/Spinner";
import InputGroup from "react-bootstrap/esm/InputGroup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDesktop, faMicrochip, faCalendarDays, faClock, faTint, faEye, faSearch } from "@fortawesome/free-solid-svg-icons";

const getToday = () => new Date().toISOString().split("T")[0];

const DeviceRecordsFilterSection = ({
    isAdmin,
    isDairy,
    isDevice,
    isAdminLoading,
    isDairyLoading,
    isDeviceLoading,
    deviceList,
    filterDeviceCode,
    setFilterDeviceCode,
    deviceCode,
    filterDate,
    setFilterDate,
    filterShift,
    setFilterShift,
    filterMilkTypeFilter,
    setFilterMilkTypeFilter,
    filterViewMode,
    setFilterViewMode,
    handleSearch,
    isFetching
}) => (
    <Form className="row g-3 align-items-end">
        {(isAdmin || isDairy) && (
            <Form.Group className="col-md-2">
                <Form.Label className="form-label-modern">Device Code</Form.Label>
                <InputGroup>
                    <InputGroup.Text><FontAwesomeIcon icon={faDesktop} /></InputGroup.Text>
                    <Form.Select className="form-select-modern" value={filterDeviceCode} onChange={e => setFilterDeviceCode(e.target.value)}>
                        <option value="">Select Device Code</option>
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
                    <InputGroup.Text><FontAwesomeIcon icon={faMicrochip} /></InputGroup.Text>
                    <Form.Control className="form-control-modern" type="text" value={deviceCode} readOnly />
                </InputGroup>
            </Form.Group>
        )}
        <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">Date</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faCalendarDays} /></InputGroup.Text>
                <Form.Control className="form-control-modern" type="date" value={filterDate} max={getToday()} onChange={e => setFilterDate(e.target.value)} />
            </InputGroup>
        </Form.Group>
        <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">Shift</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faClock} /></InputGroup.Text>
                <Form.Select className="form-select-modern" value={filterShift} onChange={e => setFilterShift(e.target.value)}>
                    <option value="">All Shifts</option>
                    <option value="MORNING">MORNING</option>
                    <option value="EVENING">EVENING</option>
                </Form.Select>
            </InputGroup>
        </Form.Group>
        <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">Milk Type</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faTint} /></InputGroup.Text>
                <Form.Select className="form-select-modern" value={filterMilkTypeFilter} onChange={e => setFilterMilkTypeFilter(e.target.value)}>
                    <option value="ALL">All Milk Types</option>
                    <option value="COW">COW</option>
                    <option value="BUF">BUF</option>
                </Form.Select>
            </InputGroup>
        </Form.Group>
        <Form.Group className="col-md-2">
            <Form.Label className="form-label-modern">View Mode</Form.Label>
            <InputGroup>
                <InputGroup.Text><FontAwesomeIcon icon={faEye} /></InputGroup.Text>
                <Form.Select className="form-select-modern" value={filterViewMode} onChange={e => setFilterViewMode(e.target.value)}>
                    <option value="ALL">Show All</option>
                    <option value="RECORDS">Only Records</option>
                    <option value="TOTALS">Only Totals</option>
                </Form.Select>
            </InputGroup>
        </Form.Group>
        <Form.Group className="col-md-2 ms-auto d-flex align-items-end justify-content-end">
            <Button className="export-btn w-100" onClick={handleSearch} disabled={isFetching} type="button">
                {isFetching ? <Spinner size="sm" animation="border" /> : <FontAwesomeIcon icon={faSearch} />} Search
            </Button>
        </Form.Group>
    </Form>
);

export default DeviceRecordsFilterSection; 