import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Form, Row, Col, Container, Button, Spinner, Card, Nav, Tab, Badge, ButtonGroup, ToggleButton } from "react-bootstrap";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { successToast, errorToast } from "../../../../shared/utils/appToaster";
import "./SettingsPage.scss";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { useSelector } from "react-redux";
import {
  useGetDeviceByCodeQuery,
  useGetDeviceByIdQuery,
  useEditDeviceMutation,
} from "../../../device/store/deviceEndPoint";
import { roles } from "../../../../shared/utils/appRoles";
import {
  FaServer,
  FaCog,
  FaCalculator,
  FaShieldAlt,
  FaSync,
  FaLock,
  FaTint,
  FaWeightHanging,
  FaChartLine,
  FaUsers,
  FaTable,
  FaExchangeAlt,
  FaClock,
  FaLayerGroup,
  FaSave,
  FaBuilding,
  FaDesktop
} from "react-icons/fa";

const SettingsPage = () => {
  const userType = UserTypeHook();
  const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
  const location = useLocation();
  const isDairy = userType === roles.DAIRY;
  const isDevice = userType === roles.DEVICE;
  const navigate = useNavigate();
  const deviceid = userInfo?.deviceid;
  const dairyCode = userInfo?.dairyCode;

  // Get pre-selected device from navigation state
  const preSelectedDevice = location.state?.selectedDeviceId;
  // Remove preSelectedDairy logic, always use dairyCode for Dairy users

  const [selectedDairyCode, setSelectedDairyCode] = useState(isDairy ? dairyCode : "");
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    preSelectedDevice || (isDevice ? deviceid : "")
  );
  const [originalSettings, setOriginalSettings] = useState({});
  const [settings, setSettings] = useState({});
  const [analyzerMode, setAnalyzerMode] = useState("AUTO");

  const idToFetch = isDevice ? deviceid : selectedDeviceId;
  const { data: dairyDevices = [] } = useGetDeviceByCodeQuery(dairyCode, {
    skip: !isDairy || !dairyCode,
  });

  const deviceList = isDairy ? dairyDevices : [];

  const {
    data: deviceData,
    isLoading,
    isError,
    refetch,
  } = useGetDeviceByIdQuery(idToFetch, {
    skip: !idToFetch,
  });

  const [editDevice] = useEditDeviceMutation();

  const isValidCommission = (value) =>
    /^\d{1,2}(\.\d{0,2})?$/.test(value) && parseFloat(value) <= 99.99;

  const formatCommission = (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 99.99) return "00.00";
    return num.toFixed(2).padStart(5, "0");
  };

  useEffect(() => {
    if (deviceData && deviceData.serverSettings) {
      const server = deviceData.serverSettings;
      const mapped = {
        serverControl: server.serverControl === "Y",
        weightMode: server.weightMode === "1" ? "AUTO" : "MANUAL",
        fatMode: server.fatMode === "1" ? "AUTO" : "MANUAL",
        analyzer:
          server.analyzer === "U"
            ? "EKO Ultra"
            : server.analyzer === "P"
              ? "Ultra Pro"
              : server.analyzer === "L"
                ? "Lacto Scan"
                : server.analyzer === "K"
                  ? "Ksheera"
                  : server.analyzer === "E"
                    ? "Essae"
                    : "Milk Tester",
        useCowSnf: server.useCowSnf === "Y",
        useBufSnf: server.useBufSnf === "Y",
        highFatAccept: server.highFatAccept === "Y",
        lowFatAccept: server.lowFatAccept === "Y",
        dpuMemberList: server.dpuMemberList === "Y",
        dpuRateTables: server.dpuRateTables === "Y",
        dpuCollectionModeControl: server.dpuCollectionModeControl === "Y",
        autoTransfer: server.autoTransfer === "Y",
        autoShiftClose: server.autoShiftClose === "Y",
        mixedMilk: server.mixedMilk === "Y",
        machineLock: server.machineLock === "Y",
        commissionType: server.commissionType === "Y",
        normalCommission: server.normalCommission || "00.00",
        specialCommission: Array.isArray(server.specialCommission)
          ? [...server.specialCommission, ...Array(9).fill("00.00")].slice(0, 9)
          : Array(9).fill(server.specialCommission || "00.00"),
        clrBasedTable: server.clrBasedTable === "Y",
      };
      console.log("sudha2", server.clrBasedTable)
      setSettings(mapped);
      setOriginalSettings(mapped);
      setAnalyzerMode("AUTO"); // default to AUTO on load
    }
  }, [deviceData]);

  // Handle pre-selected device from devices page
  useEffect(() => {
    if (preSelectedDevice) {
      // Show success message when coming from devices page
      successToast(`Device ${preSelectedDevice} selected for configuration`);
    }
  }, [preSelectedDevice]);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSpecialCommissionChange = (index, value) => {
    setSettings((prev) => {
      const updated = [...(prev.specialCommission || [])];
      updated[index] = value;
      return { ...prev, specialCommission: updated };
    });
  };

  const areSettingsEqual = (a, b) => {
    return JSON.stringify(a) === JSON.stringify(b);
  };

  const handleSave = async () => {
    const hasInvalidSpecial = settings.specialCommission.some(
      (val) => !isValidCommission(val)
    );
    if (!isValidCommission(settings.normalCommission) || hasInvalidSpecial) {
      return errorToast(
        "Please enter valid commission values (00.00 to 99.99)"
      );
    }
    console.log("sudha", settings.clrBasedTable)

    const payload = {
      serverSettings: {
        serverControl: settings.serverControl ? "Y" : "N",
        weightMode: settings.weightMode === "AUTO" ? "1" : "0",
        fatMode: settings.fatMode === "AUTO" ? "1" : "0",
        analyzer:
          settings.analyzer === "EKO Ultra"
            ? "U"
            : settings.analyzer === "Ultra Pro"
              ? "P"
              : settings.analyzer === "Lacto Scan"
                ? "L"
                : settings.analyzer === "Ksheera"
                  ? "K"
                  : settings.analyzer === "Essae"
                    ? "E"
                    : "M",
        useCowSnf: settings.useCowSnf ? "Y" : "N",
        useBufSnf: settings.useBufSnf ? "Y" : "N",
        highFatAccept: settings.highFatAccept ? "Y" : "N",
        lowFatAccept: settings.lowFatAccept ? "Y" : "N",
        dpuMemberList: settings.dpuMemberList ? "Y" : "N",
        dpuRateTables: settings.dpuRateTables ? "Y" : "N",
        dpuCollectionModeControl: settings.dpuCollectionModeControl ? "Y" : "N",
        autoTransfer: settings.autoTransfer ? "Y" : "N",
        autoShiftClose: settings.autoShiftClose ? "Y" : "N",
        mixedMilk: settings.mixedMilk ? "Y" : "N",
        machineLock: settings.machineLock ? "Y" : "N",
        commissionType: settings.commissionType ? "Y" : "N",
        normalCommission: formatCommission(settings.normalCommission),
        specialCommission: settings.specialCommission
          .filter((val) => val.trim() !== "")
          .map(formatCommission),
        clrBasedTable: settings.clrBasedTable ? "Y" : "N",
      },
    };

    try {
      await editDevice({ id: idToFetch, ...payload }).unwrap();
      successToast("Settings saved successfully!");
      navigate("/dashboard");
      refetch();
    } catch (err) {
      console.error("Error saving settings:", err);
    }
  };

  const SwitchControl = ({ label, checked, onChange, icon: Icon, description }) => (
    <div className="setting-switch-item">
      <div className="setting-switch-content">
        <div className="setting-switch-icon">
          <Icon />
        </div>
        <div className="setting-switch-text">
          <div className="setting-switch-label">{label}</div>
          {description && <div className="setting-switch-description">{description}</div>}
        </div>
      </div>
      <Form.Check
        type="switch"
        checked={checked}
        onChange={onChange}
        className="setting-switch"
      />
    </div>
  );

  useEffect(() => {
    if (isDevice && deviceid) {
      setSelectedDeviceId(deviceid);
    }
  }, [isDevice, deviceid]);

  return (
    <div className="settings-page">
      <Container fluid className="settings-container">
        {/* Device Selection Card - Only show when no device is selected */}
        {isDairy && !selectedDeviceId && (
          <Card className="device-selection-card mb-4">
            <Card.Header className="device-selection-header">
              <FaDesktop className="me-2" />
              <span>Device Selection</span>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      <FaDesktop className="me-2" />
                      Select Device
                    </Form.Label>
                    <Form.Select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="form-select-modern"
                    >
                      <option value="">-- Select Device --</option>
                      {deviceList?.map((dev) => (
                        <option key={dev.deviceid} value={dev.deviceid}>
                          {dev.deviceid}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Loading and Error States */}
        {isLoading && (
          <Card className="loading-card">
            <Card.Body className="text-center py-5">
              <Spinner animation="border" variant="primary" size="lg" />
              <div className="mt-3">Loading settings...</div>
            </Card.Body>
          </Card>
        )}

        {isError && (
          <Card className="error-card">
            <Card.Body className="text-center py-5">
              <div className="text-danger">Error loading settings.</div>
            </Card.Body>
          </Card>
        )}

        {/* Settings Tabs */}
        {!isLoading && deviceData && selectedDeviceId && (
          <Card className="settings-main-card">
            <Card.Header className="settings-header">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <FaCog className="me-2" />
                  <span>Device Configuration</span>
                </div>
                <div className="d-flex align-items-center">
                  {selectedDeviceId && (
                    <Badge bg="primary" className="me-3 device-id-badge">
                      {selectedDeviceId}
                    </Badge>
                  )}
                  {selectedDeviceId && (
                    <span
                      className="device-id-badge change-device-badge"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedDeviceId("")}
                    >
                      <FaDesktop className="me-1" />
                      Change Device
                    </span>
                  )}
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <Tab.Container id="settings-tabs" defaultActiveKey="general">
                <Row className="g-0">
                  <Col md={3} className="settings-sidebar">
                    <Nav variant="pills" className="flex-column settings-nav">
                      <Nav.Item>
                        <Nav.Link eventKey="general" className="settings-nav-link">
                          <FaCog className="me-2" />
                          General Settings
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="milk-analysis" className="settings-nav-link">
                          <FaTint className="me-2" />
                          Milk Analysis
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="dpu" className="settings-nav-link">
                          <FaUsers className="me-2" />
                          DPU Settings
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="automation" className="settings-nav-link">
                          <FaSync className="me-2" />
                          Automation
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="commission" className="settings-nav-link">
                          <FaCalculator className="me-2" />
                          Commission
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="security" className="settings-nav-link">
                          <FaShieldAlt className="me-2" />
                          Security
                        </Nav.Link>
                      </Nav.Item>
                    </Nav>
                  </Col>

                  <Col md={9} className="settings-content">
                    <Tab.Content className="settings-tab-content">
                      {/* General Settings Tab */}
                      <Tab.Pane eventKey="general" className="settings-tab-pane">
                        <div className="tab-header">
                          <h5><FaCog className="me-2" />General Settings</h5>
                          <p>Configure basic device settings and controls</p>
                        </div>
                        <div className="settings-section">
                          <SwitchControl
                            label="Server Control"
                            checked={settings.serverControl}
                            onChange={(e) => handleChange("serverControl", e.target.checked)}
                            icon={FaServer}
                            description="Enable server-based control for this device"
                          />
                          <SwitchControl
                            label="Machine Lock"
                            checked={settings.machineLock}
                            onChange={(e) => handleChange("machineLock", e.target.checked)}
                            icon={FaLock}
                            description="Lock the machine to prevent unauthorized access"
                          />
                          {/* <SwitchControl
                            label="Mixed Milk"
                            checked={settings.mixedMilk}
                            onChange={(e) => handleChange("mixedMilk", e.target.checked)}
                            icon={FaLayerGroup}
                            description="Allow processing of mixed milk types"
                          /> */}
                        </div>
                      </Tab.Pane>

                      {/* Milk Analysis Tab */}
                      <Tab.Pane eventKey="milk-analysis" className="settings-tab-pane">
                        <div className="tab-header">
                          <h5><FaTint className="me-2" />Milk Analysis Settings</h5>
                          <p>Configure milk analysis parameters and modes</p>
                        </div>
                        <div className="settings-section">
                          {/* 1. Milk Analyzer - Card UI */}
                          <Card className="milk-analyzer-card mb-4">
                            <Card.Header className="d-flex align-items-center">
                              <FaChartLine className="me-2" />
                              <span>Milk Analyzer</span>
                            </Card.Header>
                            <Card.Body>
                              <ButtonGroup className="w-100">
                                {[
                                  { value: "EKO Ultra", label: "EKO Ultra", icon: <FaChartLine /> },
                                  { value: "Ultra Pro", label: "Ultra Pro", icon: <FaChartLine /> },
                                  { value: "Lacto Scan", label: "Lacto Scan", icon: <FaChartLine /> },
                                  { value: "Ksheera", label: "Ksheera", icon: <FaChartLine /> },
                                  { value: "Essae", label: "Essae", icon: <FaChartLine /> },
                                  { value: "Milk Tester", label: "Milk Tester", icon: <FaChartLine /> },
                                ].map((analyzer, idx) => (
                                  <ToggleButton
                                    key={analyzer.value}
                                    id={`milk-analyzer-${idx}`}
                                    type="radio"
                                    variant={settings.analyzer === analyzer.value ? "primary" : "outline-primary"}
                                    name="milk-analyzer"
                                    value={analyzer.value}
                                    checked={settings.analyzer === analyzer.value}
                                    onChange={() => handleChange("analyzer", analyzer.value)}
                                    className="milk-analyzer-btn"
                                  >
                                    {analyzer.icon} {analyzer.label}
                                  </ToggleButton>
                                ))}
                              </ButtonGroup>
                            </Card.Body>
                          </Card>
                          {/* 2. Weight Mode & Analyzer Mode (side by side) */}
                          <Row>
                            <Col md={6}>
                              <SwitchControl
                                label={`Weight Mode (${settings.weightMode === "AUTO" ? "AUTO" : "MANUAL"})`}
                                checked={settings.weightMode === "AUTO"}
                                onChange={(e) => handleChange("weightMode", e.target.checked ? "AUTO" : "MANUAL")}
                                icon={FaWeightHanging}
                                description="Toggle between AUTO and MANUAL weight mode"
                              />
                            </Col>
                            <Col md={6}>
                              <SwitchControl
                                label={`Analyzer Mode (${settings.fatMode === "AUTO" ? "AUTO" : "MANUAL"})`}
                                checked={settings.fatMode === "AUTO"}
                                onChange={(e) => handleChange("fatMode", e.target.checked ? "AUTO" : "MANUAL")}
                                icon={FaChartLine}
                                description="Toggle between AUTO and MANUAL analyzer mode"
                              />
                            </Col>
                          </Row>
                          {/* 3. CLR Based Table & Mixed Milk (side by side) */}
                          <Row>
                            <Col md={6}>
                              <SwitchControl
                                label="CLR Based Table"
                                checked={settings.clrBasedTable}
                                onChange={(e) => handleChange("clrBasedTable", e.target.checked)}
                                icon={FaTable}
                                description="Enable CLR based rate table for milk analysis"
                              />
                            </Col>
                            <Col md={6}>
                              <SwitchControl
                                label="Mixed Milk"
                                checked={settings.mixedMilk}
                                onChange={(e) => handleChange("mixedMilk", e.target.checked)}
                                icon={FaLayerGroup}
                                description="Allow processing of mixed milk types"
                              />
                            </Col>
                          </Row>
                          <Row>
                            <Col md={6}>
                              <SwitchControl
                                label={settings.clrBasedTable ? "Use Cow CLR" : "Use Cow SNF"}
                                checked={settings.useCowSnf}
                                onChange={(e) => handleChange("useCowSnf", e.target.checked)}
                                icon={FaTint}
                                description={settings.clrBasedTable ? "Enable CLR calculation for cow milk" : "Enable SNF calculation for cow milk"}
                              />
                            </Col>
                            <Col md={6}>
                              <SwitchControl
                                label={settings.clrBasedTable ? "Use Buf CLR" : "Use Buf SNF"}
                                checked={settings.useBufSnf}
                                onChange={(e) => handleChange("useBufSnf", e.target.checked)}
                                icon={FaTint}
                                description={settings.clrBasedTable ? "Enable CLR calculation for buffalo milk" : "Enable SNF calculation for buffalo milk"}
                              />
                            </Col>
                          </Row>
                          <Row>
                            <Col md={6}>
                              <SwitchControl
                                label="High FAT Accept"
                                checked={settings.highFatAccept}
                                onChange={(e) => handleChange("highFatAccept", e.target.checked)}
                                icon={FaTint}
                                description="Accept milk with high fat content"
                              />
                            </Col>
                            <Col md={6}>
                              <SwitchControl
                                label="Low FAT Accept"
                                checked={settings.lowFatAccept}
                                onChange={(e) => handleChange("lowFatAccept", e.target.checked)}
                                icon={FaTint}
                                description="Accept milk with low fat content"
                              />
                            </Col>

                          </Row>
                        </div>
                      </Tab.Pane>

                      {/* DPU Settings Tab */}
                      <Tab.Pane eventKey="dpu" className="settings-tab-pane">
                        <div className="tab-header">
                          <h5><FaUsers className="me-2" />DPU Settings</h5>
                          <p>Configure Dairy Processing Unit settings</p>
                        </div>
                        <div className="settings-section">
                          <SwitchControl
                            label="DPU Member List"
                            checked={settings.dpuMemberList}
                            onChange={(e) => handleChange("dpuMemberList", e.target.checked)}
                            icon={FaUsers}
                            description="Enable DPU member list functionality"
                          />
                          <SwitchControl
                            label="DPU Rate Tables"
                            checked={settings.dpuRateTables}
                            onChange={(e) => handleChange("dpuRateTables", e.target.checked)}
                            icon={FaTable}
                            description="Enable DPU rate table management"
                          />
                          <SwitchControl
                            label="DPU Collection Mode Control"
                            checked={settings.dpuCollectionModeControl}
                            onChange={(e) => handleChange("dpuCollectionModeControl", e.target.checked)}
                            icon={FaUsers}
                            description="Enable DPU collection mode control"
                          />
                        </div>
                      </Tab.Pane>

                      {/* Automation Tab */}
                      <Tab.Pane eventKey="automation" className="settings-tab-pane">
                        <div className="tab-header">
                          <h5><FaSync className="me-2" />Automation Settings</h5>
                          <p>Configure automated processes and transfers</p>
                        </div>
                        <div className="settings-section">
                          <SwitchControl
                            label="Auto Transfer"
                            checked={settings.autoTransfer}
                            onChange={(e) => handleChange("autoTransfer", e.target.checked)}
                            icon={FaExchangeAlt}
                            description="Enable automatic data transfer"
                          />
                          <SwitchControl
                            label="Auto Shift Close"
                            checked={settings.autoShiftClose}
                            onChange={(e) => handleChange("autoShiftClose", e.target.checked)}
                            icon={FaClock}
                            description="Automatically close shifts at scheduled times"
                          />
                        </div>
                      </Tab.Pane>

                      {/* Commission Tab */}
                      <Tab.Pane eventKey="commission" className="settings-tab-pane">
                        <div className="tab-header">
                          <h5><FaCalculator className="me-2" />Commission Settings</h5>
                          <p>Configure commission rates and calculations</p>
                        </div>
                        <div className="settings-section">
                          <SwitchControl
                            label="Commission Type"
                            checked={settings.commissionType}
                            onChange={(e) => handleChange("commissionType", e.target.checked)}
                            icon={FaCalculator}
                            description="Enable or disable commission calculations"
                          />

                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label className="form-label-modern">
                                  <FaCalculator className="me-2" />
                                  Normal Commission
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  placeholder="00.00"
                                  value={settings.normalCommission}
                                  onChange={(e) =>
                                    handleChange("normalCommission", e.target.value)
                                  }
                                  onBlur={(e) =>
                                    handleChange(
                                      "normalCommission",
                                      formatCommission(e.target.value)
                                    )
                                  }
                                  className="form-control-modern"
                                  disabled={!settings.commissionType}
                                />
                              </Form.Group>
                            </Col>
                          </Row>
                          <div className={`special-commission-section ${!settings.commissionType ? 'disabled-section' : ''}`}>
                            <Form.Label className="form-label-modern">
                              <FaCalculator className="me-2" />
                              Special Commissions
                            </Form.Label>
                            <Row>
                              {[...Array(9)].map((_, i) => (
                                <Col md={4} key={i} className="mb-2">
                                  <Form.Control
                                    type="text"
                                    placeholder="00.00"
                                    value={settings.specialCommission?.[i] || ""}
                                    onChange={(e) =>
                                      handleSpecialCommissionChange(i, e.target.value)
                                    }
                                    onBlur={(e) =>
                                      handleSpecialCommissionChange(
                                        i,
                                        formatCommission(e.target.value)
                                      )
                                    }
                                    className="form-control-modern"
                                    disabled={!settings.commissionType}
                                  />
                                </Col>
                              ))}
                            </Row>
                          </div>

                          {!settings.commissionType && (
                            <div className="commission-disabled-message">
                              <div className="alert alert-info" role="alert">
                                <FaCalculator className="me-2" />
                                Commission calculations are currently disabled. Enable "Commission Type" to configure commission rates.
                              </div>
                            </div>
                          )}
                        </div>
                      </Tab.Pane>

                      {/* Security Tab */}
                      <Tab.Pane eventKey="security" className="settings-tab-pane">
                        <div className="tab-header">
                          <h5><FaShieldAlt className="me-2" />Security Settings</h5>
                          <p>Configure security and access control settings</p>
                        </div>
                        <div className="settings-section">
                          <SwitchControl
                            label="Machine Lock"
                            checked={settings.machineLock}
                            onChange={(e) => handleChange("machineLock", e.target.checked)}
                            icon={FaLock}
                            description="Lock the machine to prevent unauthorized access"
                          />
                        </div>
                      </Tab.Pane>
                    </Tab.Content>
                  </Col>
                </Row>
              </Tab.Container>
            </Card.Body>
          </Card>
        )}

        {/* Save Settings Card */}
        {!isLoading && deviceData && selectedDeviceId && (
          <Card className="save-settings-card mt-4">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center justify-content-between">
                <div className="save-settings-info">
                  <h6 className="save-settings-title">
                    <FaSave className="me-2" />
                    Save Configuration
                  </h6>
                  <p className="save-settings-description">
                    {areSettingsEqual(settings, originalSettings)
                      ? "No changes detected. Settings are up to date."
                      : "You have unsaved changes. Click save to apply your configuration."
                    }
                  </p>
                </div>
                <div className="save-settings-actions">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSave}
                    disabled={areSettingsEqual(settings, originalSettings)}
                    className="save-button"
                  >
                    <FaSave className="me-2" />
                    Save Settings
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default SettingsPage;
