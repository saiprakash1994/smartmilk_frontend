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
    FaEquals
} from "react-icons/fa";

const shifts = [
  { value: "", label: "All Shifts", icon: FaClock },
  { value: "MORNING", label: "Morning", icon: FaClock },
  { value: "EVENING", label: "Evening", icon: FaClock },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
  const userType = userInfo?.role;

  const isAdmin = userType === roles?.ADMIN;
  const isDairy = userType === roles?.DAIRY;

  const deviceid = userInfo?.deviceid;
  const dairyCode = userInfo?.dairyCode;

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today?.toISOString()?.slice(0, 10);
  });
  const [selectedShift, setSelectedShift] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const { data: allDevices = [] } = useGetAllDevicesQuery(undefined, {
    skip: !isAdmin,
  });
  const { data: dairyDevices = [] } = useGetDeviceByCodeQuery(dairyCode, {
    skip: !isDairy,
  });

  const deviceList = useMemo(() => {
    if (isAdmin) return allDevices;
    if (isDairy) return dairyDevices;
    return deviceid ? [{ deviceid }] : [];
  }, [isAdmin, isDairy, allDevices, dairyDevices, deviceid]);

  const deviceCodes = useMemo(() => {
    if (isAdmin || isDairy) {
      return selectedDeviceId || deviceList?.map((d) => d?.deviceid)?.join(",");
    }
    return deviceid || "";
  }, [isAdmin, isDairy, selectedDeviceId, deviceList, deviceid]);

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

  const { data, isLoading, isError, error, refetch } = useGetMultipleRecordsQuery(
    { params: { deviceCodes, date: formattedDate, shift: selectedShift } },
    { skip: skipFetch }
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
  const totalQuantity = cowQuantity + buffaloQuantity;
  const totalAmount = totals.reduce((sum, item) => sum + Number(item?.totalAmount || 0), 0);
  const totalIncentive = totals.reduce((sum, item) => sum + Number(item?.totalIncentive || 0), 0);
  const grandTotal = totalAmount + totalIncentive;

  useEffect(() => {
    if (deviceCodes && formattedDate) {
      refetch();
    }
  }, [deviceCodes, formattedDate, selectedShift, refetch]);

  const getMilkTypeIcon = (milkType) => {
    return milkType === "COW" ? FaServer : FaTint;
  };

  const getMilkTypeColor = (milkType) => {
    return milkType === "COW" ? "primary" : "info";
  };

  return (
    <div className="dashboard-page">
      <Container fluid className="dashboard-container">
        {/* Filters Section */}
        <Card className="filters-card mb-4">
          <Card.Body className="p-4">
            <div className="filters-header mb-3">
              <h6 className="filters-title">
                <FaCalendarAlt className="me-2" />
                Filter Options
              </h6>
            </div>
            <Row className="g-3">
              <Col md={3}>
                <Form.Group controlId="filterDate">
                  <Form.Label className="filter-label">
                    <FaCalendarAlt className="me-2" />
                    Date
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={selectedDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="filter-control"
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group controlId="filterShift">
                  <Form.Label className="filter-label">
                    <FaClock className="me-2" />
                    Shift
                  </Form.Label>
                  <Form.Select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                    className="filter-control"
                  >
                    {shifts.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              {(isAdmin || isDairy) && (
                <Col md={3}>
                  <Form.Group controlId="filterDevice">
                    <Form.Label className="filter-label">
                      <FaDesktop className="me-2" />
                      Device
                    </Form.Label>
                    <Form.Select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="filter-control"
                    >
                      <option value="">All Devices</option>
                      {deviceList.map((dev) => (
                        <option key={dev.deviceid} value={dev.deviceid}>
                          {dev.deviceid}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}

              <Col md={3}>
                <div className="d-flex align-items-end h-100">
                  <Badge 
                    bg="light" 
                    text="dark" 
                    className="filter-badge"
                  >
                    {formattedDate} {selectedShift && `• ${selectedShift}`}
                  </Badge>
                </div>
              </Col>
            </Row>
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
            <Row className="g-4 mb-4">
              <Col lg={3} md={6}>
                <Card className="summary-card total-quantity">
                  <Card.Body className="p-4">
                    <div className="summary-icon">
                      <FaTint />
                    </div>
                    <div className="summary-content">
                      <h3 className="summary-value">{totalQuantity.toFixed(2)} L</h3>
                      <p className="summary-label">Total Quantity</p>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={3} md={6}>
                <Card className="summary-card total-amount">
                  <Card.Body className="p-4">
                    <div className="summary-icon">
                      <FaRupeeSign />
                    </div>
                    <div className="summary-content">
                      <h3 className="summary-value">₹{totalAmount.toFixed(2)}</h3>
                      <p className="summary-label">Total Amount</p>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={3} md={6}>
                <Card className="summary-card total-incentive">
                  <Card.Body className="p-4">
                    <div className="summary-icon">
                      <FaArrowUp />
                    </div>
                    <div className="summary-content">
                      <h3 className="summary-value">₹{totalIncentive.toFixed(2)}</h3>
                      <p className="summary-label">Total Incentive</p>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={3} md={6}>
                <Card className="summary-card grand-total">
                  <Card.Body className="p-4">
                    <div className="summary-icon">
                      <FaEquals />
                    </div>
                    <div className="summary-content">
                      <h3 className="summary-value">₹{grandTotal.toFixed(2)}</h3>
                      <p className="summary-label">Grand Total</p>
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
                        <Badge 
                          bg={getMilkTypeColor(item?._id.milkType)} 
                          className="milk-type-badge"
                        >
                          {item?._id.milkType}
                        </Badge>
                      </div>

                      <Row className="mt-4">
                        <Col md={4}>
                          <div className="metric-item">
                            <div className="metric-value">{item?.totalQuantity.toFixed(2)} L</div>
                            <div className="metric-label">Quantity</div>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="metric-item">
                            <div className="metric-value">₹{item?.totalAmount.toFixed(2)}</div>
                            <div className="metric-label">Amount</div>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="metric-item">
                            <div className="metric-value">₹{item?.totalIncentive.toFixed(2)}</div>
                            <div className="metric-label">Incentive</div>
                          </div>
                        </Col>
                      </Row>

                      <div className="milk-quality-metrics mt-4">
                        <Row>
                          <Col md={4}>
                            <div className="quality-item">
                              <span className="quality-label">Fat:</span>
                              <span className="quality-value">{item?.averageFat}</span>
                            </div>
                          </Col>
                          <Col md={4}>
                            <div className="quality-item">
                              <span className="quality-label">SNF:</span>
                              <span className="quality-value">{item?.averageSNF}</span>
                            </div>
                          </Col>
                          <Col md={4}>
                            <div className="quality-item">
                              <span className="quality-label">Rate:</span>
                              <span className="quality-value">₹{item?.averageRate}</span>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Charts Section */}
            <Row className="g-4">
              <Col lg={8}>
                <Card className="chart-card">
                  <Card.Header className="chart-header">
                    <h5 className="chart-title">
                      <FaChartBar className="me-2" />
                      Daily Milk Summary
                    </h5>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={totals}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="_id.milkType" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '10px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="totalQuantity" fill="#667eea" name="Quantity (L)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="totalAmount" fill="#764ba2" name="Amount (₹)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="totalIncentive" fill="#f093fb" name="Incentive (₹)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={4}>
                <Card className="chart-card">
                  <Card.Header className="chart-header">
                    <h5 className="chart-title">
                      <FaChartPie className="me-2" />
                      Milk Distribution
                    </h5>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieData?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
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
