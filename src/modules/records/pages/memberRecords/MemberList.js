import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Card, Form, InputGroup, Table, Spinner, Button, Modal, ToastContainer, Toast } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDesktop } from "@fortawesome/free-solid-svg-icons";
import { useGetDeviceByCodeQuery, useGetDeviceByIdQuery, useAddMemberMutation, useEditMemberMutation, useDeleteMemberMutation } from "../../../device/store/deviceEndPoint";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { roles } from "../../../../shared/utils/appRoles";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExportButtonsSection from "../ExportButtonsSection";
import '../deviceRecords/DeviceRecords.scss';
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";

const API_BASE = "/api/device";

const initialMemberState = {
  CODE: "",
  MILKTYPE: "C",
  COMMISSIONTYPE: "N",
  MEMBERNAME: "",
  CONTACTNO: "",
  STATUS: "A"
};

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
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [memberForm, setMemberForm] = useState(initialMemberState);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [addMember, { isLoading: isAdding }] = useAddMemberMutation();
  const [editMember, { isLoading: isEditing }] = useEditMemberMutation();
  const [deleteMember, { isLoading: isDeleting }] = useDeleteMemberMutation();

  useEffect(() => {
    if (isDevice && deviceid) setDeviceCode(deviceid);
  }, [isDevice, deviceid]);

  useEffect(() => {
    const selectedDevice = deviceList.find((dev) => dev.deviceid === deviceCode);
    setMembers(selectedDevice?.members || []);
  }, [deviceCode, deviceList]);

  // Add/Edit Modal Handlers
  const openAddModal = () => {
    setIsEdit(false);
    setMemberForm(initialMemberState);
    setShowAddEditModal(true);
  };
  const openEditModal = (member) => {
    setIsEdit(true);
    setMemberForm({ ...member });
    setShowAddEditModal(true);
  };
  const closeAddEditModal = () => {
    setShowAddEditModal(false);
    setMemberForm(initialMemberState);
  };
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setMemberForm((prev) => ({
      ...prev,
      [name]: value, // This should be "A" or "D"
    }));
  };
  const handleAddEditSubmit = async (e) => {
    e.preventDefault();
    // Validate CODE is a number from 1 to 9999
    const codeNum = Number(memberForm.CODE);
    if (!/^[0-9]{1,4}$/.test(memberForm.CODE) || isNaN(codeNum) || codeNum < 1 || codeNum > 9999) {
      errorToast("Member Code must be a number from 1 to 9999");
      return;
    }
    // Only validate if CONTACTNO is not empty
    if (memberForm.CONTACTNO && !/^\d{10}$/.test(memberForm.CONTACTNO)) {
      errorToast("Contact No must be exactly 10 digits if provided.");
      return;
    }
    setFormLoading(true);
    try {
      const payload = { deviceid: deviceCode, ...memberForm, CODE: codeNum };
      console.log("Sending to API:", payload);
      if (isEdit) {
        await editMember(payload).unwrap();
        successToast("Member updated");
      } else {
        await addMember(payload).unwrap();
        successToast("Member added");
      }
      closeAddEditModal();
      // Refresh members
      const selectedDevice = deviceList.find((dev) => dev.deviceid === deviceCode);
      setMembers(selectedDevice?.members || []);
    } catch (err) {
      errorToast(err?.data?.error || err.message || "Error saving member");
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Handlers
  const handleDelete = (member) => setDeleteTarget(member);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const payload = { deviceid: deviceCode, CODE: deleteTarget.CODE };
      await deleteMember(payload).unwrap();
      successToast("Member deleted");
      setDeleteTarget(null);
      // Refresh members
      const selectedDevice = deviceList.find((dev) => dev.deviceid === deviceCode);
      setMembers(selectedDevice?.members || []);
    } catch (err) {
      errorToast(err?.data?.error || err.message || "Error deleting member");
    } finally {
      setDeleteLoading(false);
    }
  };
  const cancelDelete = () => setDeleteTarget(null);

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
        {/* Add Member Button */}
        <div className="d-flex justify-content-end mb-3">
          <Button variant="primary" onClick={openAddModal} disabled={!deviceCode}>
            <FaPlus className="me-2" /> Add Member
          </Button>
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
                        <th>Actions</th>
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
                            <td>
                              <Button size="sm" variant="outline-info" className="me-2" onClick={() => openEditModal(member)}><FaEdit /></Button>
                              <Button size="sm" variant="outline-danger" onClick={() => handleDelete(member)}><FaTrash /></Button>
                            </td>
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
      {/* Add/Edit Member Modal */}
      <Modal show={showAddEditModal} onHide={closeAddEditModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? "Edit Member" : "Add Member"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddEditSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Member Code</Form.Label>
              <Form.Control
                name="CODE"
                type="number"
                value={memberForm.CODE}
                onChange={handleFormChange}
                required
                disabled={isEdit}
                min={1}
                max={9999}
                maxLength={4}
                placeholder="1-4 digit code"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Milk Type</Form.Label>
              <Form.Select name="MILKTYPE" value={memberForm.MILKTYPE} onChange={handleFormChange} required>
                <option value="C">Cow</option>
                <option value="B">Buffalo</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Commission Type</Form.Label>
              <Form.Select name="COMMISSIONTYPE" value={memberForm.COMMISSIONTYPE} onChange={handleFormChange} required>
                <option value="N">N</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Member Name</Form.Label>
              <Form.Control name="MEMBERNAME" value={memberForm.MEMBERNAME} onChange={handleFormChange} required maxLength={20} placeholder="Max 20 characters" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contact No</Form.Label>
              <Form.Control
                type="text"
                name="CONTACTNO"
                value={memberForm.CONTACTNO}
                maxLength={10}
                inputMode="numeric"
                pattern="\d*"
                onChange={e => {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, '');
                  setMemberForm(prev => ({ ...prev, CONTACTNO: value }));
                }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select name="STATUS" value={memberForm.STATUS} onChange={handleFormChange} required>
                <option value="A">Active</option>
                <option value="D">Deactive</option>
              </Form.Select>
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={closeAddEditModal} className="me-2">Cancel</Button>
              <Button variant="primary" type="submit" disabled={formLoading || isAdding || isEditing}>
                {(formLoading || isAdding || isEditing) ? "Saving..." : isEdit ? "Update" : "Add"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal show={!!deleteTarget} onHide={cancelDelete} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Member</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete member <b>{deleteTarget?.CODE}</b>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelDelete}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleteLoading || isDeleting}>
            {(deleteLoading || isDeleting) ? "Deleting..." : "Delete"}
          </Button>
        </Modal.Footer>
      </Modal>
      <ToastContainer position="top-end" className="p-3" />
    </div>
  );
};

export default MemberList; 