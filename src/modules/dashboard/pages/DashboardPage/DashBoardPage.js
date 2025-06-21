import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
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
  LabelList
} from "recharts";
import { faChartBar, faSyncAlt, faCalendarAlt, faClock, faMicrochip, faTint, faGauge } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useGetMultipleRecordsQuery } from "../../../records/store/recordEndPoint";
import "./DashBoardPage.scss";
import SkeletonHome from "../../../../shared/utils/skeleton/SkeletonHome";

const shifts = [
  { value: "", label: "All Shifts" },
  { value: "MORNING", label: "Morning" },
  { value: "EVENING", label: "Evening" },
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
      { name: "Cow Milk", value: cowQuantity },
      { name: "Buffalo Milk", value: buffaloQuantity },
    ],
    [cowQuantity, buffaloQuantity]
  );

  const barColors = ["#6366f1", "#22c55e", "#f59e42"];
  const pieColors = ["#6366f1", "#f59e42"];

  useEffect(() => {
    if (deviceCodes && formattedDate) {
      refetch();
    }
  }, [deviceCodes, formattedDate, selectedShift, refetch]);

  return (
    <>
      <div className="d-flex justify-content-between pageTitleSpace align-items-center">
        <PageTitle name="DASHBOARD" icon={<FontAwesomeIcon icon={faGauge} className="text-primary" />} />
      </div>

      <div className="dashboard-bg-gradient min-vh-100 py-3">
        <div className="usersPage my-3 font-modern">
          <div className="dashboard-filters-card p-3 mb-4">
            <div className="filters d-flex flex-wrap gap-3 align-items-end">
              <Form.Group controlId="filterDate">
                <Form.Label><FontAwesomeIcon icon={faCalendarAlt} className="me-1 text-primary" /> Date</Form.Label>
                <Form.Control
                  type="date"
                  size="lg"
                  value={selectedDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </Form.Group>
              <Form.Group controlId="filterShift">
                <Form.Label><FontAwesomeIcon icon={faClock} className="me-1 text-primary" /> Shift</Form.Label>
                <Form.Select
                  size="lg"
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                >
                  {shifts.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              {(isAdmin || isDairy) && (
                <Form.Group controlId="filterDevice">
                  <Form.Label><FontAwesomeIcon icon={faMicrochip} className="me-1 text-primary" /> Device</Form.Label>
                  <Form.Select
                    size="lg"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                  >
                    <option value="">All Devices</option>
                    {deviceList.map((dev) => (
                      <option key={dev.deviceid} value={dev.deviceid}>
                        {dev.deviceid}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}
              <button className="btn btn-outline-primary ms-2 d-flex align-items-center" type="button" onClick={() => { setSelectedDate(new Date().toISOString().slice(0, 10)); setSelectedShift(""); setSelectedDeviceId(""); }}>
                <FontAwesomeIcon icon={faSyncAlt} className="me-1" /> Reset Filters
              </button>
            </div>
          </div>
          <Card className="h-100 p-4 shadow-sm">
            {/* Loading Spinner Overlay */}
            {isLoading && (
              <div className="dashboard-loading-overlay">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            {/* SHOW SKELETON LOADER WHEN FETCH NOT STARTED OR LOADING */}
            {(!hasFetched || isLoading) ? (
              <Row className="g-4 mb-4">
                <SkeletonHome />
                <SkeletonHome />
                <SkeletonHome />
              </Row>
            ) : isError ? (
              <div className="alert alert-danger" role="alert">
                Error: {error?.data?.message || error?.error || "Failed to load data"}
              </div>
            ) : totals?.length > 0 ? (
              <>
                <h5 className="mb-4 dashboard-section-title">Summary for {formattedDate}</h5>
                <div className="dashboard-cards-row mb-4">
                  {totals?.map((item, idx) => (
                    <Card
                      className={`p-4 dashboard-summary-card h-100 border-0 shadow rounded-4 bg-white position-relative overflow-hidden mb-3 dashboard-summary-card--${item?._id.milkType.toLowerCase()}`}
                      key={idx}
                      style={{
                        borderLeft: `6px solid ${item?._id.milkType === "COW" ? "#2563eb" : "#36b9cc"}`,
                        transition: "box-shadow 0.2s",
                        cursor: "pointer"
                      }}
                      title={`Click for more details about ${item?._id.milkType} milk`}
                    >
                      <div className="dashboard-card-icon-bg mb-2">
                        <FontAwesomeIcon
                          icon={faTint}
                          className={item?._id.milkType === "COW" ? "text-primary" : "text-info"}
                          size="2x"
                          spin
                        />
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className={`badge px-3 py-2 fs-6 rounded-pill shadow-sm ${item?._id.milkType === "COW" ? "bg-primary-subtle text-primary" : "bg-info-subtle text-info"}`}>
                          {item?._id.milkType}
                        </span>
                      </div>
                      <div className="mb-2">
                        <h2 className="fw-bold text-dark mb-1" style={{ fontSize: "2.5rem" }}>
                          {item?.totalQuantity.toFixed(2)} <span className="fs-5 text-muted">L</span>
                        </h2>
                        <p className="text-muted mb-0">Total Quantity</p>
                      </div>
                      <div className="mb-3">
                        <h5 className="text-success fw-semibold mb-1" title={`Amount: ₹${item?.totalAmount.toFixed(2)} + Incentive: ₹${item?.totalIncentive.toFixed(2)}`}>
                          ₹{(Number(item?.totalAmount) + Number(item?.totalIncentive)).toFixed(2)}
                        </h5>
                        <p className="text-muted mb-0">Total Amount <FontAwesomeIcon icon={faChartBar} className="ms-1" /></p>
                      </div>
                      <div className="row border-top pt-3 mt-3 text-muted small gx-2">
                        <div className="col">
                          <span>Fat: </span>
                          <strong className="text-dark">{item?.averageFat}</strong>
                        </div>
                        <div className="col">
                          <span>SNF: </span>
                          <strong className="text-dark">{item?.averageSNF}</strong>
                        </div>
                        <div className="col">
                          <span>Rate: ₹</span>
                          <strong className="text-dark">{item?.averageRate}</strong>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="dashboard-section-card mb-4 mt-3">
                  <div className="d-flex align-items-center mb-2 gap-2 dashboard-section-title">
                    <FontAwesomeIcon icon={faChartBar} className="text-primary" />
                    <span className="fw-semibold">Daily Milk Summary</span>
                  </div>
                  <p className="text-muted mb-3">Bar chart showing total quantity, amount, and incentive for each milk type.</p>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={totals}
                      barSize={38}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                      aria-label="Daily Milk Summary Bar Chart"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id.milkType" tick={{ fontWeight: 700, fontSize: 16 }} />
                      <YAxis tick={{ fontWeight: 700, fontSize: 14 }} />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload && payload.length ? (
                            <div style={{ background: '#fff', border: '1px solid #6366f1', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px #6366f133' }}>
                              <strong style={{ color: '#6366f1' }}>{label}</strong>
                              {payload.map((entry, idx) => (
                                <div key={idx} style={{ color: entry.color, marginTop: 4 }}>
                                  {entry.name}: <b>{
                                    entry.dataKey === 'totalAmount' || entry.dataKey === 'totalIncentive'
                                      ? `₹${Number(entry.value).toFixed(2)}`
                                      : entry.dataKey === 'totalQuantity'
                                        ? `${entry.value}L`
                                        : entry.value
                                  }</b>
                                </div>
                              ))}
                            </div>
                          ) : null
                        }
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontWeight: 600 }} />
                      <Bar dataKey="totalQuantity" fill={barColors[0]} name="Total Quantity (L)" radius={[8, 8, 0, 0]} isAnimationActive>
                        <LabelList dataKey="totalQuantity" position="top" formatter={(v) => `${v}L`} style={{ fontWeight: 700, fill: barColors[0] }} />
                      </Bar>
                      <Bar dataKey="totalAmount" fill={barColors[1]} name="Total Amount (₹)" radius={[8, 8, 0, 0]} isAnimationActive>
                        <LabelList dataKey="totalAmount" position="top" formatter={(v) => `₹${Number(v).toFixed(2)}`} style={{ fontWeight: 700, fill: barColors[1] }} />
                      </Bar>
                      <Bar dataKey="totalIncentive" fill={barColors[2]} name="Total Incentive (₹)" radius={[8, 8, 0, 0]} isAnimationActive>
                        <LabelList dataKey="totalIncentive" position="top" formatter={(v) => `₹${Number(v).toFixed(2)}`} style={{ fontWeight: 700, fill: barColors[2] }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="dashboard-section-card mb-4">
                  <div className="d-flex align-items-center mb-2 gap-2 dashboard-section-title">
                    <FontAwesomeIcon icon={faChartBar} className="text-primary" />
                    <span className="fw-semibold">Cow vs Buffalo Milk Quantity</span>
                  </div>
                  <p className="text-muted mb-3">Pie chart comparing cow and buffalo milk quantities.</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart aria-label="Cow vs Buffalo Milk Quantity Pie Chart">
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent, value }) => `${name}: ${value}L (${(percent * 100).toFixed(1)}%)`}
                        isAnimationActive
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {pieData?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors?.length]} />
                        ))}
                        <LabelList dataKey="value" position="outside" formatter={(v) => `${v}L`} style={{ fontWeight: 700 }} />
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload && payload.length ? (
                            <div style={{ background: '#fff', border: '1px solid #6366f1', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px #6366f133' }}>
                              <strong style={{ color: '#6366f1' }}>{payload[0].name}</strong>
                              <div style={{ color: payload[0].color, marginTop: 4 }}>
                                Quantity: <b>{payload[0].value}L</b>
                              </div>
                            </div>
                          ) : null
                        }
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontWeight: 600 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p>No records found for selected filters.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
