import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Row, Col, Container, Button, Spinner, Card, Nav, Tab } from "react-bootstrap";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { successToast, errorToast } from "../../../../shared/utils/appToaster";
import "./SettingsPage.scss";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { useSelector } from "react-redux";
import {
  useGetDeviceByCodeQuery,
  useGetDeviceByIdQuery,
  useEditDeviceMutation,
  useGetAllDevicesQuery,
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
  const isDairy = userType === roles.DAIRY;
  const isDevice = userType === roles.DEVICE;
  const isAdmin = userType === roles.ADMIN;
  const navigate = useNavigate();
  const deviceid = userInfo?.deviceid;
  const dairyCode = userInfo?.dairyCode;

  const [selectedDairyCode, setSelectedDairyCode] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [originalSettings, setOriginalSettings] = useState({});
  const [settings, setSettings] = useState({});

  const idToFetch = isDevice ? deviceid : selectedDeviceId;
  console.log(deviceid);
  const { data: allDevices = [] } = useGetAllDevicesQuery(undefined, {
    skip: !isAdmin,
  });
  console.log(allDevices);
  const { data: dairyDevices = [] } = useGetDeviceByCodeQuery(dairyCode, {
    skip: !isDairy,
  });

  const deviceList = isAdmin ? allDevices : dairyDevices;
  const dairyCodeList = Array.from(
    new Set(allDevices?.map((d) => d.deviceid?.substring(0, 3))) || []
  );
  const filteredDevices = allDevices?.filter((dev) =>
    dev.deviceid?.startsWith(selectedDairyCode)
  );

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
      };

      setSettings(mapped);
      setOriginalSettings(mapped);
    }
  }, [deviceData]);

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

  return (
    <div className="settings-page">
      <div className="d-flex justify-content-between pageTitleSpace">
        <PageTitle name="SETTINGS" pageItems={0} />
      </div>
      
      <Container fluid className="settings-container">
        {/* Device Selection Card */}
        {(isAdmin || isDairy) && (
          <Card className="device-selection-card mb-4">
            <Card.Header className="device-selection-header">
              <FaBuilding className="me-2" />
              <span>Device Selection</span>
            </Card.Header>
            <Card.Body>
              <Row>
                {isAdmin && (
                  <>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="form-label-modern">
                          <FaBuilding className="me-2" />
                          Select Dairy
                        </Form.Label>
                        <Form.Select
                          value={selectedDairyCode}
                          onChange={(e) => {
                            setSelectedDairyCode(e.target.value);
                            setSelectedDeviceId("");
                          }}
                          className="form-select-modern"
                        >
                          <option value="">-- Select Dairy --</option>
                          {dairyCodeList.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    {selectedDairyCode && (
                      <Col md={6}>
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
                            {filteredDevices?.map((dev) => (
                              <option key={dev.deviceid} value={dev.deviceid}>
                                {dev.deviceid}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    )}
                  </>
                )}

                {isDairy && (
                  <Col md={6}>
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
                )}
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
        {!isLoading && deviceData && (
          <Card className="settings-main-card">
            <Card.Header className="settings-header">
              <FaCog className="me-2" />
              <span>Device Configuration</span>
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
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label className="form-label-modern">
                                  <FaWeightHanging className="me-2" />
                                  Weight Mode
                                </Form.Label>
                                <Form.Select
                                  value={settings.weightMode}
                                  onChange={(e) => handleChange("weightMode", e.target.value)}
                                  className="form-select-modern"
                                >
                                  <option>AUTO</option>
                                  <option>MANUAL</option>
                                </Form.Select>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label className="form-label-modern">
                                  <FaTint className="me-2" />
                                  Fat Mode
                                </Form.Label>
                                <Form.Select
                                  value={settings.fatMode}
                                  onChange={(e) => handleChange("fatMode", e.target.value)}
                                  className="form-select-modern"
                                >
                                  <option>AUTO</option>
                                  <option>MANUAL</option>
                                </Form.Select>
                              </Form.Group>
                            </Col>
                          </Row>
                          <Form.Group className="mb-3">
                            <Form.Label className="form-label-modern">
                              <FaChartLine className="me-2" />
                              Analyzer Type
                            </Form.Label>
                            <Form.Select
                              value={settings.analyzer}
                              onChange={(e) => handleChange("analyzer", e.target.value)}
                              className="form-select-modern"
                            >
                              <option>EKO Ultra</option>
                              <option>Ultra Pro</option>
                              <option>Lacto Scan</option>
                              <option>Ksheera</option>
                              <option>Essae</option>
                              <option>Milk Tester</option>
                            </Form.Select>
                          </Form.Group>
                          <Row>
                            <Col md={6}>
                              <SwitchControl
                                label="Use Cow SNF"
                                checked={settings.useCowSnf}
                                onChange={(e) => handleChange("useCowSnf", e.target.checked)}
                                icon={FaTint}
                                description="Enable SNF calculation for cow milk"
                              />
                            </Col>
                            <Col md={6}>
                              <SwitchControl
                                label="Use Buf SNF"
                                checked={settings.useBufSnf}
                                onChange={(e) => handleChange("useBufSnf", e.target.checked)}
                                icon={FaTint}
                                description="Enable SNF calculation for buffalo milk"
                              />
                            </Col>
                          </Row>
                          <Row>
                            <Col md={6}>
                              <SwitchControl
                                label="High Fat Accept"
                                checked={settings.highFatAccept}
                                onChange={(e) => handleChange("highFatAccept", e.target.checked)}
                                icon={FaTint}
                                description="Accept milk with high fat content"
                              />
                            </Col>
                            <Col md={6}>
                              <SwitchControl
                                label="Low Fat Accept"
                                checked={settings.lowFatAccept}
                                onChange={(e) => handleChange("lowFatAccept", e.target.checked)}
                                icon={FaTint}
                                description="Accept milk with low fat content"
                              />
                            </Col>
                           
                          </Row>
                          <Row>
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

        {/* Save Button */}
        {!isLoading && deviceData && (
          <div className="save-button-container">
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
        )}
      </Container>
    </div>
  );
};

export default SettingsPage;
