import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Card, Form, InputGroup, Table, Spinner } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDesktop } from "@fortawesome/free-solid-svg-icons";
import { useGetDeviceByCodeQuery, useGetDeviceByIdQuery } from "../../../device/store/deviceEndPoint";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { roles } from "../../../../shared/utils/appRoles";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExportButtonsSection from "../ExportButtonsSection";
import '../deviceRecords/DeviceRecords.scss';

const MemberList = () => {
  const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
  const userType = UserTypeHook();
  const isDairy = userType === roles.DAIRY;
  const isDevice = userType === roles.DEVICE;
  const deviceid = userInfo?.deviceid;
  const dairyCode = userInfo?.dairyCode;

  // Fetch devices for Dairy, or single device for Device user
  const { data: dairyDevices = [], isLoading: isDairyLoading } = useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy || !dairyCode });
  const { data: deviceData, isLoading: isDeviceLoading } = useGetDeviceByIdQuery(deviceid, { skip: !isDevice });
  const deviceList = isDairy ? dairyDevices : deviceData ? [deviceData] : [];

  const [deviceCode, setDeviceCode] = useState("");
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (isDevice && deviceid) setDeviceCode(deviceid);
  }, [isDevice, deviceid]);

  useEffect(() => {
    const selectedDevice = deviceList.find((dev) => dev.deviceid === deviceCode);
    setMembers(selectedDevice?.members || []);
  }, [deviceCode, deviceList]);

  // Export CSV
  const handleExportCSV = () => {
    if (!deviceCode || members.length === 0) return;
    const csvData = members.map((member) => ({
      CODE: member.CODE,
      MILKTYPE: member.MILKTYPE,
      COMMISSIONTYPE: member.COMMISSIONTYPE,
      MEMBERNAME: member.MEMBERNAME,
      CONTACTNO: member.CONTACTNO,
      STATUS: member.STATUS,
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const filename = `${deviceCode}_Members.csv`;
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!deviceCode || members.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Device: ${deviceCode} - Members List`, 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["CODE", "MILKTYPE", "COMMISSIONTYPE", "MEMBERNAME", "CONTACTNO", "STATUS"]],
      body: members.map((member) => [
        member.CODE,
        member.MILKTYPE,
        member.COMMISSIONTYPE,
        member.MEMBERNAME,
        member.CONTACTNO,
        member.STATUS,
      ]),
      styles: { fontSize: 10 },
      theme: "grid",
    });
    // Add totals as a table below the main table
    let y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 32;
    autoTable(doc, {
      startY: y,
      head: [["Total Cow Members", "Total Buffalo Members", "Total Members"]],
      body: [[cowCount, bufCount, totalCount]],
      styles: { fontSize: 11, fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [102, 126, 234] },
      theme: "striped",
      headStyles: { fillColor: [102, 126, 234] },
      margin: { left: 14, right: 14 },
    });
    doc.save(`${deviceCode}_Members.pdf`);
  };

  // Calculate totals for Cow, Buffalo, and Total
  const cowCount = members.filter(m => m.MILKTYPE === 'C').length;
  const bufCount = members.filter(m => m.MILKTYPE === 'B').length;
  const totalCount = members.length;

  return (
    <div className="device-records-page">
      <div className="records-container">
        <Card className="filters-card mb-4">
          <Card.Body>
            <Form className="row g-3 align-items-end">
              <Form.Group className="col-md-3">
                <Form.Label>Device Code</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faDesktop} />
                  </InputGroup.Text>
                  <Form.Select
                    value={deviceCode}
                    onChange={e => setDeviceCode(e.target.value)}
                    disabled={isDevice}
                  >
                    <option value="">Select Device</option>
                    {deviceList.map((dev) => (
                      <option key={dev.deviceid} value={dev.deviceid}>{dev.deviceid}</option>
                    ))}
                  </Form.Select>
                </InputGroup>
              </Form.Group>
            </Form>
          </Card.Body>
        </Card>
        {/* Export Buttons Section */}
        <div className="mb-3">
          <ExportButtonsSection
            handleExportCSV={handleExportCSV}
            handleExportPDF={handleExportPDF}
            isFetching={false}
            isExporting={false}
          />
        </div>
        <Card>
          <Card.Body>
            {((isDairy && isDairyLoading) || (isDevice && isDeviceLoading)) ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="primary" />
              </div>
            ) : !deviceCode ? (
              <div className="text-center my-5 text-muted">
                Please select a device to view its members.
              </div>
            ) : (
              <>
                {/* Modern Gradient Header Section (copied from AbsentMemberRecords) */}
                <div className="d-flex justify-content-between align-items-center px-3 py-3 mb-4"
                  style={{
                    gap: 16,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.10)'
                  }}>
                  <div className="fw-semibold" style={{ minWidth: 120, fontSize: '1.08rem' }}>
                    Device Code: <span style={{ color: '#fff', fontWeight: 700 }}>{deviceCode}</span>
                  </div>
                  <div className="flex-grow-1 text-center" style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: 1 }}>
                    MEMBERS LIST
                  </div>
                  <div className="fw-semibold text-end" style={{ minWidth: 220, fontSize: '1.08rem' }}>
                    {/* Optionally add date or other info here */}
                  </div>
                </div>
                <div className="table-responsive">
                  <Table className="records-table" hover responsive>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>CODE</th>
                        <th>MILKTYPE</th>
                        <th>MEMBERNAME</th>
                        <th>COMMISSIONTYPE</th>
                        <th>CONTACTNO</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.length > 0 ? (
                        members.map((member, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{member.CODE}</td>
                            <td>{member.MILKTYPE}</td>
                            <td>{member.MEMBERNAME}</td>
                            <td>{member.COMMISSIONTYPE}</td>
                            <td>{member.CONTACTNO}</td>
                            <td>{member.STATUS}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center">No members found for this device.</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                  {/* Totals Row */}
                  {members.length > 0 && (
                    <div className="d-flex justify-content-end mt-2">
                      <div className="fw-semibold" style={{ background: '#f5f7fa', borderRadius: 8, padding: '8px 24px', fontSize: '1.08rem', boxShadow: '0 2px 8px rgba(102,126,234,0.07)' }}>
                        Total Cow Members: <span style={{ color: '#667eea', fontWeight: 700 }}>{cowCount}</span>
                        <span className="mx-3">|</span>
                        Total Buffalo Members: <span style={{ color: '#764ba2', fontWeight: 700 }}>{bufCount}</span>
                        <span className="mx-3">|</span>
                        Total Members: <span style={{ color: '#2c3e50', fontWeight: 700 }}>{totalCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default MemberList; 