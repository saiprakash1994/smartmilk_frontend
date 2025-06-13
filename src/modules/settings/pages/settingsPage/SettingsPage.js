import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Row, Col, Container, Button, Spinner } from 'react-bootstrap';
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { successToast, errorToast } from "../../../../shared/utils/appToaster";
import './SettingsPage.scss';
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { useSelector } from "react-redux";
import {
    useGetDeviceByCodeQuery,
    useGetDeviceByIdQuery,
    useEditDeviceMutation,
    useGetAllDevicesQuery
} from "../../../device/store/deviceEndPoint";
import { roles } from "../../../../shared/utils/appRoles";

const SettingsPage = () => {
    const userType = UserTypeHook();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const isDairy = userType === roles.DAIRY;
    const isDevice = userType === roles.DEVICE;
    const isAdmin = userType === roles.ADMIN;
    const navigate = useNavigate();
    const deviceid = userInfo?.deviceid;
    const dairyCode = userInfo?.dairyCode;

    const [selectedDairyCode, setSelectedDairyCode] = useState('');
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [originalSettings, setOriginalSettings] = useState({});
    const [settings, setSettings] = useState({});

    const idToFetch = isDevice ? deviceid : selectedDeviceId;
    console.log(deviceid)
    const { data: allDevices = [] } = useGetAllDevicesQuery(undefined, {
        skip: !isAdmin,
    });
    console.log(allDevices)
    const { data: dairyDevices = [] } = useGetDeviceByCodeQuery(dairyCode, {
        skip: !isDairy,
    });

    const deviceList = isAdmin ? allDevices : dairyDevices;
    const dairyCodeList = Array.from(new Set(allDevices?.map((d) => d.deviceid?.substring(0, 3))) || []);
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

    const isValidCommission = (value) => /^\d{1,2}(\.\d{0,2})?$/.test(value) && parseFloat(value) <= 99.99;

    const formatCommission = (value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0 || num > 99.99) return '00.00';
        return num.toFixed(2).padStart(5, '0');
    };

    useEffect(() => {
        if (deviceData && deviceData.serverSettings) {
            const server = deviceData.serverSettings;
            const mapped = {
                serverControl: server.serverControl === 'Y',
                weightMode: server.weightMode === '1' ? 'AUTO' : 'MANUAL',
                fatMode: server.fatMode === '1' ? 'AUTO' : 'MANUAL',
                analyzer:
                    server.analyzer === 'P' ? 'EKO Ultra' :
                        server.analyzer === 'U' ? 'Ultra Pro' :
                            'Lactoscan',
                useCowSN: server.useCowSnf === 'Y',
                useBufSN: server.useBufSnf === 'Y',
                highFatAccept: server.highFatAccept === 'Y',
                lowFatAccept: server.lowFatAccept === 'Y',
                dpuMemberList: server.dpuMemberList === 'Y',
                dpuRateTables: server.dpuRateTables === 'Y',
                dpuCollectionModeControl: server.dpuCollectionModeControl === 'Y',
                autoTransfer: server.autoTransfer === 'Y',
                autoShiftClose: server.autoShiftClose === 'Y',
                mixedMilk: server.mixedMilk === 'Y',
                machineLock: server.machineLock === 'Y',
                normalCommission: server.normalCommission || '00.00',
                specialCommission: Array.isArray(server.specialCommission)
                    ? server.specialCommission
                    : [server.specialCommission || '00.00'],
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
        const hasInvalidSpecial = settings.specialCommission.some(val => !isValidCommission(val));
        if (!isValidCommission(settings.normalCommission) || hasInvalidSpecial) {
            return errorToast("Please enter valid commission values (00.00 to 99.99)");
        }

        const payload = {
            serverSettings: {
                serverControl: settings.serverControl ? 'Y' : 'N',
                weightMode: settings.weightMode === 'AUTO' ? '1' : '0',
                fatMode: settings.fatMode === 'AUTO' ? '1' : '0',
                analyzer: settings.analyzer === 'EKO Ultra' ? 'P' :
                    settings.analyzer === 'Ultra Pro' ? 'U' : 'L',
                useCowSnf: settings.useCowSN ? 'Y' : 'N',
                useBufSnf: settings.useBufSN ? 'Y' : 'N',
                highFatAccept: settings.highFatAccept ? 'Y' : 'N',
                lowFatAccept: settings.lowFatAccept ? 'Y' : 'N',
                dpuMemberList: settings.dpuMemberList ? 'Y' : 'N',
                dpuRateTables: settings.dpuRateTables ? 'Y' : 'N',
                dpuCollectionModeControl: settings.dpuCollectionModeControl ? 'Y' : 'N',
                autoTransfer: settings.autoTransfer ? 'Y' : 'N',
                autoShiftClose: settings.autoShiftClose ? 'Y' : 'N',
                mixedMilk: settings.mixedMilk ? 'Y' : 'N',
                machineLock: settings.machineLock ? 'Y' : 'N',
                commissionType: 'Y',
                normalCommission: formatCommission(settings.normalCommission),
                specialCommission: settings.specialCommission
                    .filter(val => val.trim() !== '')
                    .map(formatCommission),
            }
        };

        try {
            await editDevice({ id: idToFetch, ...payload }).unwrap();
            successToast("Settings saved successfully!");
            navigate('/dashboard');
            refetch();
        } catch (err) {
            console.error("Error saving settings:", err);
        }
    };

    return (
        <>
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="SETTINGS" pageItems={0} />
            </div>
            <Container className="settings-form">
                {(isAdmin || isDairy) && (
                    <>
                        {isAdmin && (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label>Select Dairy</Form.Label>
                                    <Form.Select
                                        value={selectedDairyCode}
                                        onChange={(e) => {
                                            setSelectedDairyCode(e.target.value);
                                            setSelectedDeviceId("");
                                        }}
                                    >
                                        <option value="">-- Select Dairy --</option>
                                        {dairyCodeList.map((code) => (
                                            <option key={code} value={code}>
                                                {code}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>

                                {selectedDairyCode && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Select Device</Form.Label>
                                        <Form.Select
                                            value={selectedDeviceId}
                                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                                        >
                                            <option value="">-- Select Device --</option>
                                            {filteredDevices?.map((dev) => (
                                                <option key={dev.deviceid} value={dev.deviceid}>
                                                    {dev.deviceid}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                )}
                            </>
                        )}

                        {isDairy && (
                            <Form.Group className="mb-3">
                                <Form.Label>Select Device</Form.Label>
                                <Form.Select
                                    value={selectedDeviceId}
                                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                                >
                                    <option value="">-- Select Device --</option>
                                    {deviceList?.map((dev) => (
                                        <option key={dev.deviceid} value={dev.deviceid}>
                                            {dev.deviceid}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        )}
                    </>
                )}

                {isLoading && (
                    <div className="text-center my-4">
                        <Spinner animation="border" variant="primary" />
                        <div>Loading settings...</div>
                    </div>
                )}

                {isError && <div>Error loading settings.</div>}

                {!isLoading && deviceData && (
                    <Form>
                        <Row>
                            <Col md={4}>
                                <Form.Check type="switch" label="Server Control" checked={settings.serverControl} onChange={(e) => handleChange('serverControl', e.target.checked)} />
                                <Form.Check type="switch" label="Use Cow SN" checked={settings.useCowSN} onChange={(e) => handleChange('useCowSN', e.target.checked)} />
                                <Form.Check type="switch" label="Use Buf SN" checked={settings.useBufSN} onChange={(e) => handleChange('useBufSN', e.target.checked)} />
                                <Form.Check type="switch" label="High Fat Accept" checked={settings.highFatAccept} onChange={(e) => handleChange('highFatAccept', e.target.checked)} />
                                <Form.Check type="switch" label="Low Fat Accept" checked={settings.lowFatAccept} onChange={(e) => handleChange('lowFatAccept', e.target.checked)} />
                                <Form.Check type="switch" label="DPU Member List" checked={settings.dpuMemberList} onChange={(e) => handleChange('dpuMemberList', e.target.checked)} />
                                <Form.Check type="switch" label="DPU Rate Tables" checked={settings.dpuRateTables} onChange={(e) => handleChange('dpuRateTables', e.target.checked)} />
                                <Form.Check type="switch" label="DPU Collection Mode Control" checked={settings.dpuCollectionModeControl} onChange={(e) => handleChange('dpuCollectionModeControl', e.target.checked)} />
                                <Form.Check type="switch" label="Auto Transfer" checked={settings.autoTransfer} onChange={(e) => handleChange('autoTransfer', e.target.checked)} />
                                <Form.Check type="switch" label="Auto Shift Close" checked={settings.autoShiftClose} onChange={(e) => handleChange('autoShiftClose', e.target.checked)} />
                                <Form.Check type="switch" label="Mixed Milk" checked={settings.mixedMilk} onChange={(e) => handleChange('mixedMilk', e.target.checked)} />
                                <Form.Check type="switch" label="Machine Lock" checked={settings.machineLock} onChange={(e) => handleChange('machineLock', e.target.checked)} />
                            </Col>

                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Weight Mode</Form.Label>
                                    <Form.Select value={settings.weightMode} onChange={(e) => handleChange('weightMode', e.target.value)}>
                                        <option>AUTO</option>
                                        <option>MANUAL</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group>
                                    <Form.Label>Fat Mode</Form.Label>
                                    <Form.Select value={settings.fatMode} onChange={(e) => handleChange('fatMode', e.target.value)}>
                                        <option>AUTO</option>
                                        <option>MANUAL</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group>
                                    <Form.Label>Analyzer</Form.Label>
                                    <Form.Select value={settings.analyzer} onChange={(e) => handleChange('analyzer', e.target.value)}>
                                        <option>EKO Ultra</option>
                                        <option>Ultra Pro</option>
                                        <option>Lactoscan</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group>
                                    <Form.Label>Normal Commission</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="00.00"
                                        value={settings.normalCommission}
                                        onChange={(e) => handleChange('normalCommission', e.target.value)}
                                        onBlur={(e) => handleChange('normalCommission', formatCommission(e.target.value))}
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={4}>
                                <Form.Label>Special Commissions</Form.Label>
                                {[...Array(9)].map((_, i) => (
                                    <Form.Control
                                        key={i}
                                        className="mb-2"
                                        type="text"
                                        placeholder="00.00"
                                        value={settings.specialCommission?.[i] || ''}
                                        onChange={(e) => handleSpecialCommissionChange(i, e.target.value)}
                                        onBlur={(e) => handleSpecialCommissionChange(i, formatCommission(e.target.value))}
                                    />
                                ))}
                            </Col>
                        </Row>

                        <div className="mt-4 text-center">
                            <Button
                                variant="outline-primary"
                                onClick={handleSave}
                                disabled={areSettingsEqual(settings, originalSettings)}
                            >
                                Save Settings
                            </Button>
                        </div>
                    </Form>
                )}
            </Container>
        </>
    );
};

export default SettingsPage;
