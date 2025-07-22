import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Card, Form, InputGroup, Spinner, Button, Modal, ToastContainer } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDesktop, faUser } from "@fortawesome/free-solid-svg-icons";
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
import {  FaUsers} from "react-icons/fa";
import cowImg from '../../../../assets/cow.png';
import buffaloImg from '../../../../assets/buf.png';

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
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [memberForm, setMemberForm] = useState(initialMemberState);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [addMember, { isLoading: isAdding }] = useAddMemberMutation();
  const [editMember, { isLoading: isEditing }] = useEditMemberMutation();
  const [deleteMember, { isLoading: isDeleting }] = useDeleteMemberMutation();

  // Always derive members from deviceList and deviceCode
  const selectedDevice = deviceList.find((dev) => dev.deviceid === deviceCode);
  const members = selectedDevice?.members || [];

  useEffect(() => {
    if (isDevice && deviceid) setDeviceCode(deviceid);
  }, [isDevice, deviceid]);

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
      // setMembers(selectedDevice?.members || []); // This line is removed
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
      // setMembers(selectedDevice?.members || []); // This line is removed
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
    <div className="device-records-page" style={{ fontFamily: "'Roboto', 'Segoe UI', 'Arial', sans-serif", background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '20px 0' }}>
      <div className="records-container">
        {/* Filter Section: Only for Dairy users, no Card wrapper */}
        {isDairy && (
          <Form className="row g-3 align-items-end mb-1">
            <Form.Group className="col-md-3">
              <Form.Label>Device Code</Form.Label>
              <InputGroup>
                <InputGroup.Text
                  style={{ background: '#2b50a1', color: 'whitesmoke', border: 'none' }}
                >
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
        )}
        {/* Export Buttons Section and Add Member Button: inline, right-aligned */}
        <div className="d-flex justify-content-end align-items-center mb-3" style={{ gap: 12 }}>
          <ExportButtonsSection
            handleExportCSV={handleExportCSV}
            handleExportPDF={handleExportPDF}
            isFetching={false}
            isExporting={false}
          />
          {/* The Add Member button is now moved into the header */}
        </div>
        <Card style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', border: 'none', borderRadius: 18, boxShadow: '0 8px 32px rgba(43,80,161,0.10)' }}>
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
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4"
                  style={{ background: '#2b50a1', color: 'whitesmoke', borderRadius: 12, padding: '12px' }}
                  >
                  <div className="fw-semibold mb-2 mb-md-0" style={{ minWidth: 120, fontSize: '1.08rem' }}>
                    Device Code: <span style={{ color: 'whitesmoke', fontWeight: 700 }}>{deviceCode}</span>
                  </div>
                  <div className="flex-grow-1 text-center mb-2 mb-md-0" style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: 1 }}>
                    MEMBERS LIST
                  </div>
                  <div className="d-flex align-items-center justify-content-end ms-auto text-end" style={{ minWidth: 220, fontSize: '1rem' }}>
                    <Button 
                      style={{
                        borderRadius: '25px',
                        background: 'whitesmoke',
                        color: '#2b50a1',
                        border: 'none',
                        fontWeight: 600,
                        padding: '8px 18px',
                        fontSize: '1rem',
                        boxShadow: '0 2px 8px rgba(43, 80, 161, 0.08)'
                      }}
                      onClick={openAddModal} 
                      disabled={!deviceCode}
                    >
                      <FaPlus className="me-2" /> Add
                    </Button>
                  </div>
                </div>
                {/* Totals Cards Row */}
                {members.length > 0 && (
                  <div className="row g-4 mb-4 justify-content-center align-items-center" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="col-12 col-md-4 col-lg-3 d-flex justify-content-center">
                      <Card style={{ border: 'none', borderRadius: 15, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', height: '100%' }}>
                        <Card.Body className="d-flex align-items-center p-4">
                          <div className="summary-flex" style={{ background: '#2b50a1', borderRadius: 16, width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 24 }}>
                            <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img src={cowImg} alt="Cow" style={{ width: 38, height: 38, objectFit: 'contain' }} />
                            </div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '2rem', color: 'black', lineHeight: 1, textAlign: 'center', width: '100%' }}>{cowCount}</div>
                            <div style={{ color: 'black', fontSize: '1.1rem', fontWeight: 500, textAlign: 'center', width: '100%' }}>Total Cow Members</div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                    <div className="col-12 col-md-4 col-lg-3 d-flex justify-content-center">
                      <Card style={{ border: 'none', borderRadius: 15, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', height: '100%' }}>
                        <Card.Body className="d-flex align-items-center p-4">
                          <div className="summary-flex" style={{ background: '#764ba2', borderRadius: 16, width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 24 }}>
                            <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img src={buffaloImg} alt="Buffalo" style={{ width: 38, height: 38, objectFit: 'contain' }} />
                            </div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '2rem', color: 'black', lineHeight: 1, textAlign: 'center', width: '100%' }}>{bufCount}</div>
                            <div style={{ color: 'black', fontSize: '1.1rem', fontWeight: 500, textAlign: 'center', width: '100%' }}>Total Buffalo Members</div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                    <div className="col-12 col-md-4 col-lg-3 d-flex justify-content-center">
                      <Card style={{ border: 'none', borderRadius: 15, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', height: '100%' }}>
                        <Card.Body className="d-flex align-items-center p-4">
                          <div className="summary-flex" style={{ background: '#20c997', borderRadius: 16, width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 24 }}>
                            <FaUsers style={{ color: 'white', fontSize: 28 }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '2rem', color: 'black', lineHeight: 1, textAlign: 'center', width: '100%' }}>{totalCount}</div>
                            <div style={{ color: 'black', fontSize: '1.1rem', fontWeight: 500, textAlign: 'center', width: '100%' }}>Total Members</div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  </div>
                )}
                <div>
                  <div className="row g-4">
                    {members.length > 0 ? (
                      members.map((member, idx) => (
                        <div className="col-12 col-md-6 col-lg-3" key={idx}>
                          <Card className="h-100 shadow-sm member-card" style={{ borderRadius: 16, border: '1.5px solid #eaf1fb', background: '#fff', fontFamily: "'Roboto', 'Segoe UI', 'Arial', sans-serif", color: '#111' }}>
                            <Card.Body>
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="badge" style={{
                                  background: '#2b50a1',
                                  color: 'whitesmoke',
                                  fontSize: '1rem',
                                  borderRadius: 8,
                                  padding: '6px 14px',
                                  letterSpacing: 1
                                }}>
                                  #{member.CODE}
                                </span>
                                <span className="badge bg-secondary text-uppercase" style={{ fontSize: '0.95rem', borderRadius: 8 }}>{member.MILKTYPE === 'C' ? 'Cow' : 'Buffalo'}</span>
                              </div>
                              <div className="fw-bold mb-1" style={{ fontSize: '1.15rem', color: '#111' }}>{member.MEMBERNAME}</div>
                              <div className="mb-2" style={{ fontSize: '0.98rem', color: '#111' }}>Commission: <b>{member.COMMISSIONTYPE}</b></div>
                              <div className="mb-2" style={{ fontSize: '0.98rem', color: '#111' }}>Contact: <span>{member.CONTACTNO ? member.CONTACTNO : <span className="text-muted">N/A</span>}</span></div>
                              <div className="mb-2" style={{ color: '#111' }}>Status: <span style={member.STATUS === 'A' ? { color: '#2b50a1', fontWeight: 700 } : { color: '#dc3545', fontWeight: 700 }}>{member.STATUS === 'A' ? 'Active' : 'Deactive'}</span></div>
                              <div className="d-flex justify-content-end gap-2 mt-3">
                                <Button size="sm" variant="outline-info" className="rounded-pill" onClick={() => openEditModal(member)}><FaEdit /></Button>
                                <Button size="sm" variant="outline-danger" className="rounded-pill" onClick={() => handleDelete(member)}><FaTrash /></Button>
                              </div>
                            </Card.Body>
                          </Card>
                        </div>
                      ))
                    ) : (
                      <div className="col-12">
                        <div className="text-center text-muted py-4">No members found for this device.</div>
                      </div>
                    )}
                  </div>
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
            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Label>Member Code</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUser} />
                  </InputGroup.Text>
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
                </InputGroup>
                <Form.Text muted>1-4 digit code</Form.Text>
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Milk Type</Form.Label>
                <Form.Select name="MILKTYPE" value={memberForm.MILKTYPE} onChange={handleFormChange} required>
                  <option value="C">Cow</option>
                  <option value="B">Buffalo</option>
                </Form.Select>
              </div>
              <div className="col-md-6 mb-3">
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
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select name="STATUS" value={memberForm.STATUS} onChange={handleFormChange} required>
                  <option value="A">Active</option>
                  <option value="D">Deactive</option>
                </Form.Select>
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Member Name</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUser} />
                  </InputGroup.Text>
                  <Form.Control
                    name="MEMBERNAME"
                    value={memberForm.MEMBERNAME}
                    onChange={handleFormChange}
                    required
                    maxLength={20}
                    placeholder="Max 20 characters"
                  />
                </InputGroup>
                <Form.Text muted>Max 20 characters</Form.Text>
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Contact No</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUser} />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    name="CONTACTNO"
                    value={memberForm.CONTACTNO}
                    maxLength={10}
                    inputMode="numeric"
                    pattern="\d*"
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '');
                      setMemberForm(prev => ({ ...prev, CONTACTNO: value }));
                    }}
                    placeholder="10-digit number"
                  />
                </InputGroup>
                <Form.Text muted>Optional, 10 digits</Form.Text>
              </div>
            </div>
            <div className="d-flex justify-content-end mt-3">
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