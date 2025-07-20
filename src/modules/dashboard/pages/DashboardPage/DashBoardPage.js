import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { roles } from "../../../../shared/utils/appRoles";
import {
  useGetAllDevicesQuery,
  useGetDeviceByCodeQuery,
} from "../../../device/store/deviceEndPoint";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { useGetMultipleRecordsQuery } from "../../../records/store/recordEndPoint";
import "./DashBoardPage.scss";
import SkeletonHome from "../../../../shared/utils/skeleton/SkeletonHome";
import {
  FaChartBar,
  FaChartPie,
  FaChartLine,
  FaCalendarAlt,
  FaClock,
  FaDesktop,
  FaTint,
  FaServer,
  FaRupeeSign,
  FaUsers,
  FaIndustry,
  FaArrowUp,
  FaArrowDown,
  FaEquals,
  FaSearch
} from "react-icons/fa";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import { faDesktop } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import debounce from "lodash/debounce";

const shifts = [
  { value: "", label: "All Shifts", icon: FaClock },
  { value: "MORNING", label: "Morning", icon: FaClock },
  { value: "EVENING", label: "Evening", icon: FaClock },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
  const userType = userInfo?.role;

  const isDairy = userType === roles?.DAIRY;
  const isDevice = userType === roles.DEVICE;

  const deviceid = userInfo?.deviceid;
  const dairyCode = userInfo?.dairyCode;

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today?.toISOString()?.slice(0, 10);
  });
  const [selectedShift, setSelectedShift] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState('');


  const { data: dairyDevices = [] } = useGetDeviceByCodeQuery(dairyCode, {
    skip: !isDairy || !dairyCode,
    refetchOnMountOrArgChange: false, // Prevent unnecessary refetches
    refetchOnFocus: false, // Prevent refetch on window focus
  });

  const deviceList = useMemo(() => {
    if (isDairy) return dairyDevices;
    return deviceid ? [{ deviceid }] : [];
  }, [isDairy, dairyDevices, deviceid]);

  const deviceCodes = useMemo(() => {
    if (isDairy) {
      return selectedDeviceId || deviceList?.map((d) => d?.deviceid)?.join(",");
    }
    return deviceid || "";
  }, [isDairy, selectedDeviceId, deviceList, deviceid]);

  const formattedDate = useMemo(() => {
    if (!selectedDate) return "";
    const d = new Date(selectedDate);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  }, [selectedDate]);

  // IMPORTANT: Track if fetch should be skipped
  const skipFetch = !deviceCodes || !formattedDate;

  // Track if fetch has started, to control when to show no records message
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!skipFetch) {
      setHasFetched(true);
    } else {
      setHasFetched(false);
    }
  }, [skipFetch]);

  const queryParams = useMemo(() => ({
    params: { deviceCodes, date: formattedDate, shift: selectedShift }
  }), [deviceCodes, formattedDate, selectedShift]);

  const { data, isLoading, isError, error, refetch } = useGetMultipleRecordsQuery(
    queryParams,
    {
      skip: skipFetch,
      refetchOnMountOrArgChange: false, // Prevent unnecessary refetches
      refetchOnFocus: false, // Prevent refetch on window focus
    }
  );

  const totals = data?.totals || [];

  const cowQuantity =
    totals?.find((item) => item?._id?.milkType === "COW")?.totalQuantity || 0;
  const buffaloQuantity =
    totals?.find((item) => item?._id?.milkType === "BUF")?.totalQuantity || 0;

  const pieData = useMemo(
    () => [
      { name: "Cow Milk", value: cowQuantity, color: "#1cc88a" },
      { name: "Buffalo Milk", value: buffaloQuantity, color: "#36b9cc" },
    ],
    [cowQuantity, buffaloQuantity]
  );

  const pieColors = ["#1cc88a", "#36b9cc"];

  // Calculate total metrics
  // const totalQuantity = cowQuantity + buffaloQuantity;
  // const totalAmount = totals.reduce((sum, item) => sum + Number(item?.totalAmount || 0), 0);
  // const totalIncentive = totals.reduce((sum, item) => sum + Number(item?.totalIncentive || 0), 0);
  // const grandTotal = totalAmount + totalIncentive;

  const totalQuantity = cowQuantity + buffaloQuantity;

  const validMilkTypes = ["COW", "BUF"];

  const filteredTotals = totals.filter(
    (item) => validMilkTypes.includes(item?._id?.milkType)
  );

  const totalAmount = filteredTotals.reduce(
    (sum, item) => sum + Number(item?.totalAmount || 0),
    0
  );

  const totalIncentive = filteredTotals.reduce(
    (sum, item) => sum + Number(item?.totalIncentive || 0),
    0
  );

  const grandTotal = totalAmount + totalIncentive;


  useEffect(() => {
    if (deviceCodes && formattedDate) {
      // Debounce refetch to avoid too many API calls
      const debouncedRefetch = debounce(() => {
        refetch();
      }, 1000); // Increased to 1000ms debounce
      debouncedRefetch();
      return () => {
        debouncedRefetch.cancel();
      };
    }
    // No-op cleanup if fetch is skipped
    return () => { };
  }, [deviceCodes, formattedDate, selectedShift]); // Removed refetch from dependencies

  const getMilkTypeIcon = (milkType) => {
    return milkType === "COW" ? FaServer : FaTint;
  };

  const getMilkTypeColor = (milkType) => {
    return milkType === "COW" ? "primary" : "info";
  };
  console.log(deviceCodes, 'sai')
  return (
    <div className="dashboard-page">
      <Container fluid className="dashboard-container">
        {/* Filters Section */}
        <Card className="filters-card mb-4">
          <Card.Body className="p-4">
            <Form className="row g-3 align-items-end">
              <Col md={3}>
                <Form.Group controlId="filterDate">
                  <Form.Label className="form-label-modern">
                    Date
                  </Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaCalendarAlt /></InputGroup.Text>
                    <Form.Control
                      type="date"
                      value={selectedDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="form-control-modern select-date"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="filterShift">
                  <Form.Label className="form-label-modern">
                    Shift
                  </Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaClock /></InputGroup.Text>
                    <Form.Select
                      value={selectedShift}
                      onChange={e => setSelectedShift(e.target.value)}
                      className="form-select-modern select-shift"
                    >
                      {shifts.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Form.Select>
                  </InputGroup>
                </Form.Group>
              </Col>
              {(isDairy || isDevice) && (
                <Col md={3}>
                  {isDairy && (
                    <Form.Group controlId="filterDevice">
                      <Form.Label className="form-label-modern">
                        Device
                      </Form.Label>
                      <InputGroup>
                        <InputGroup.Text><FaDesktop /></InputGroup.Text>
                        <Form.Select
                          value={selectedDeviceId}
                          onChange={e => setSelectedDeviceId(e.target.value)}
                          className="form-select-modern select-device"
                        >
                          <option value="">All Devices</option>
                          {deviceList?.map((dev) => (
                            <option key={dev.deviceid} value={dev.deviceid}>{dev.deviceid}</option>
                          ))}
                        </Form.Select>
                      </InputGroup>
                    </Form.Group>
                  )}
                  {isDevice && (
                    <Form.Group controlId="deviceCode">
                      <Form.Label className="form-label-modern">Device Code</Form.Label>
                      <InputGroup>
                        <InputGroup.Text><FaDesktop /></InputGroup.Text>
                        <Form.Control className="form-control-modern select-device" type="text" value={deviceCodes} readOnly />
                      </InputGroup>
                    </Form.Group>
                  )}
                </Col>
              )}
              <Col md={3} className="ms-auto d-flex align-items-end justify-content-end">
                <Button className="w-100 export-btn search-btn" variant="primary" onClick={refetch} type="button">
                  <FaSearch /> Search
                </Button>
              </Col>
            </Form>
          </Card.Body>
        </Card>

        {/* Loading and Error States */}
        {(!hasFetched || isLoading) ? (
          <Row className="g-4 mb-4">
            <SkeletonHome />
            <SkeletonHome />
            <SkeletonHome />
          </Row>
        ) : isError ? (
          <Card className="error-card">
            <Card.Body className="text-center py-5">
              <div className="text-danger">
                <FaIndustry className="mb-3" style={{ fontSize: '3rem' }} />
                <h5>Error Loading Data</h5>
                <p>{error?.data?.message || error?.error || "Failed to load dashboard data"}</p>
              </div>
            </Card.Body>
          </Card>
        ) : totals?.length > 0 ? (
          <>
            {/* Summary Cards */}
            <Row className="g-4 mb-4 justify-content-center">
              <Col lg={3} md={6}>
                <Card className="summary-card total-quantity">
                  <Card.Body className="p-4">
                    <div className="summary-flex">
                      <div className="summary-icon">
                        <FaTint />
                      </div>
                      <div className="summary-content">
                        <h3 className="summary-value" title={totalQuantity.toFixed(2) + ' L'}>{totalQuantity.toFixed(2)} L</h3>
                        <p className="summary-label">Total Quantity</p>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={3} md={6}>
                <Card className="summary-card total-amount">
                  <Card.Body className="p-4">
                    <div className="summary-flex">
                      <div className="summary-icon">
                        <FaRupeeSign />
                      </div>
                      <div className="summary-content">
                        <h3 className="summary-value" title={`₹${totalAmount.toFixed(2)}`}>₹{totalAmount.toFixed(2)}</h3>
                        <p className="summary-label">Total Amount</p>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={3} md={6}>
                <Card className="summary-card total-incentive">
                  <Card.Body className="p-4">
                    <div className="summary-flex">
                      <div className="summary-icon">
                        <FaArrowUp />
                      </div>
                      <div className="summary-content">
                        <h3 className="summary-value" title={`₹${totalIncentive.toFixed(2)}`}>₹{totalIncentive.toFixed(2)}</h3>
                        <p className="summary-label">Total Incentive</p>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={3} md={6}>
                <Card className="summary-card grand-total">
                  <Card.Body className="p-4">
                    <div className="summary-flex">
                      <div className="summary-icon">
                        <FaEquals />
                      </div>
                      <div className="summary-content">
                        <h3 className="summary-value" title={`₹${grandTotal.toFixed(2)}`}>₹{grandTotal.toFixed(2)}</h3>
                        <p className="summary-label">Grand Total</p>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Milk Type Cards */}
            <Row className="g-4 mb-4">
              {totals?.map((item, idx) => (
                <Col lg={4} key={idx}>
                  <Card className="milk-type-card">
                    <Card.Body className="p-4">
                      <div className="milk-type-header">
                        <div className="milk-type-icon">
                          {React.createElement(getMilkTypeIcon(item?._id.milkType))}
                        </div>
                        <div className="milk-type-info">
                          <h4 className="milk-type-title">{item?._id.milkType} Milk</h4>
                          <p className="milk-type-subtitle">Summary for {formattedDate}</p>
                        </div>
                      </div>

                      <Row className="mt-4">
                        <Col md={4}>
                          <div className="metric-item">
                            <div className="metric-value" title={item?.totalQuantity.toFixed(2) + ' L'}>{item?.totalQuantity.toFixed(2)} L</div>
                            <div className="metric-label">Quantity</div>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="metric-item">
                            <div className="metric-value" title={`₹${item?.totalAmount.toFixed(2)}`}>₹{item?.totalAmount.toFixed(2)}</div>
                            <div className="metric-label">Amount</div>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="metric-item">
                            <div className="metric-value" title={`₹${item?.totalIncentive.toFixed(2)}`}>₹{item?.totalIncentive.toFixed(2)}</div>
                            <div className="metric-label">Incentive</div>
                          </div>
                        </Col>
                      </Row>

                      <div className="milk-quality-metrics mt-4">
                        <Row>
                          <Col md={3}>
                            <div className="quality-item">
                              <span className="quality-label">Fat:</span>
                              <span className="quality-value">{item?.averageFat}</span>
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="quality-item">
                              <span className="quality-label">SNF:</span>
                              <span className="quality-value">{item?.averageSNF}</span>
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="quality-item">
                              <span className="quality-label">CLR:</span>
                              <span className="quality-value">{item?.averageCLR}</span>
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="quality-item">
                              <span className="quality-label">Rate:</span>
                              <span className="quality-value">₹{item?.averageRate}</span>
                            </div>
                          </Col>
                        </Row>
                      </div>
                      <div className="milk-grand-total mt-3">
                        <strong>Grand Total: ₹{(Number(item?.totalAmount || 0) + Number(item?.totalIncentive || 0)).toFixed(2)}</strong>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Charts Section */}
            <Row className="g-4">
              <Col lg={8}>
                <Card className="dairy-summary-card">
                  <Card.Header className="chart-header">
                    <h5 className="chart-title">
                      <FaChartBar className="me-2" />
                      Daily Milk Summary
                    </h5>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={totals.map(item => ({
                        ...item,
                        baseAmount: Number(item?.totalAmount || 0) - Number(item?.totalIncentive || 0),
                        grandTotal: Number(item?.totalAmount || 0)
                      }))} barCategoryGap={24}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="_id.milkType" stroke="#2b50a1" tick={{fontWeight: 600, fontSize: 14}} />
                        <YAxis stroke="#2b50a1" tick={{fontWeight: 500, fontSize: 13}} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '10px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value, name) => ['₹' + value, name]}
                        />
                        <Legend verticalAlign="bottom" iconType="circle" height={36} wrapperStyle={{fontWeight: 500, color: '#2b50a1'}} />
                        <Bar dataKey="totalIncentive" name="Incentive (₹)" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={48}
                          fill="#b3c6f7"
                          isAnimationActive={false}
                          >
                          {totals.map((item, idx) => {
                            let color = '#b3c6f7';
                            if (item?._id?.milkType === 'COW') color = '#2b50a1';
                            if (item?._id?.milkType === 'BUF') color = '#4f8fe8';
                            if (item?._id?.milkType === 'TOTAL') color = '#b3c6f7';
                            return <Cell key={idx} fill={color} />;
                          })}
                        </Bar>
                        <Bar dataKey="baseAmount" name="Base Amount (₹)" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={48}
                          isAnimationActive={false}
                          >
                          {totals.map((item, idx) => {
                            let color = '#b3c6f7';
                            if (item?._id?.milkType === 'COW') color = '#2b50a1';
                            if (item?._id?.milkType === 'BUF') color = '#4f8fe8';
                            if (item?._id?.milkType === 'TOTAL') color = '#b3c6f7';
                            return <Cell key={idx} fill={color} />;
                          })}
                          {/* Grand Total label on top of the bar */}
                          {totals.map((item, idx) => {
                            const baseAmount = Number(item?.totalAmount || 0) - Number(item?.totalIncentive || 0);
                            const grandTotal = Number(item?.totalAmount || 0);
                            return (
                              <text
                                key={idx}
                                x={60 + idx * 120}
                                y={60}
                                textAnchor="middle"
                                fontWeight="700"
                                fontSize="15"
                                fill="#2b50a1"
                              >
                                ₹{grandTotal.toFixed(2)}
                              </text>
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={4}>
                <Card className="milk-distribution-card">
                  <Card.Header className="chart-header">
                    <h5 className="chart-title">
                      <FaChartPie className="me-2" />
                      Milk Distribution
                    </h5>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData.map((d, i) => ({...d, color: i === 0 ? '#2b50a1' : '#4f8fe8'}))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }) => (
                            <tspan style={{ fontWeight: 700, fontSize: 16, fill: '#2b50a1' }}>{name} {(percent * 100).toFixed(0)}%</tspan>
                          )}
                          labelLine={false}
                        >
                          {pieData?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#2b50a1' : '#4f8fe8'} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '10px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="milk-distribution-legend mt-4 d-flex justify-content-center gap-4">
                      <div className="legend-item d-flex align-items-center gap-2">
                        <span className="legend-dot" style={{ background: '#2b50a1' }}></span>
                        <span className="legend-label">Cow Milk</span>
                      </div>
                      <div className="legend-item d-flex align-items-center gap-2">
                        <span className="legend-dot" style={{ background: '#4f8fe8' }}></span>
                        <span className="legend-label">Buffalo Milk</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        ) : (
          <Card className="no-data-card">
            <Card.Body className="text-center py-5">
              <FaIndustry className="mb-3" style={{ fontSize: '3rem', color: '#6c757d' }} />
              <h5>No Data Available</h5>
              <p className="text-muted">No records found for the selected filters.</p>
            </Card.Body>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default DashboardPage;
