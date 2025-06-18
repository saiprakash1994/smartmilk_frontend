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
} from "recharts";
import { faChartBar } from "@fortawesome/free-solid-svg-icons";
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

  const isAdmin = userType === roles.ADMIN;
  const isDairy = userType === roles.DAIRY;

  const deviceid = userInfo?.deviceid;
  const dairyCode = userInfo?.dairyCode;

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
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
      return selectedDeviceId || deviceList.map((d) => d.deviceid).join(",");
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
    totals.find((item) => item._id.milkType === "COW")?.totalQuantity || 0;
  const buffaloQuantity =
    totals.find((item) => item._id.milkType === "BUF")?.totalQuantity || 0;

  const pieData = useMemo(
    () => [
      { name: "Cow Milk", value: cowQuantity },
      { name: "Buffalo Milk", value: buffaloQuantity },
    ],
    [cowQuantity, buffaloQuantity]
  );

  const pieColors = ["#1cc88a", "#36b9cc"];

  useEffect(() => {
    if (deviceCodes && formattedDate) {
      refetch();
    }
  }, [deviceCodes, formattedDate, selectedShift, refetch]);

  return (
    <>
      <div className="d-flex justify-content-between pageTitleSpace align-items-center">
        <PageTitle name="DASHBOARD" />
        <div className="filters d-flex gap-3 align-items-center">
          <Form.Group controlId="filterDate">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="date"
              value={selectedDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </Form.Group>

          <Form.Group controlId="filterShift">
            <Form.Label>Shift</Form.Label>
            <Form.Select
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
              <Form.Label>Device</Form.Label>
              <Form.Select
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
        </div>
      </div>

      <div className="usersPage my-3">
        <Card className="h-100 p-4 shadow-sm">
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
          ) : totals.length > 0 ? (
            <>
              <h5 className="mb-4">Summary for {formattedDate}</h5>
              <Row className="g-4 mb-4">
                {totals.map((item, idx) => (
                  <Col md={4} key={idx}>
                    <Card className="p-4 dashboard-summary-card h-100 border-0 shadow rounded-4 bg-white">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="badge bg-primary-subtle text-primary px-3 py-2 fs-6 rounded-pill shadow-sm">
                          {item._id.milkType}
                        </span>
                      </div>

                      <div className="mb-3">
                        <h4 className="fw-bold text-dark mb-1">
                          {item.totalQuantity.toFixed(2)} L
                        </h4>
                        <p className="text-muted mb-0">Total Quantity</p>
                      </div>

                      <div className="mb-4">
                        <h5 className="text-success fw-semibold mb-1">
                          ₹{item.totalAmount.toFixed(2)}
                        </h5>
                        <p className="text-muted mb-0">Total Amount</p>
                      </div>

                      <div className="d-flex justify-content-between border-top pt-3 mt-3 text-muted small">
                        <div>
                          <span>Fat: </span>
                          <strong className="text-dark">{item.averageFat}</strong>
                        </div>
                        <div>
                          <span>SNF: </span>
                          <strong className="text-dark">{item.averageSNF}</strong>
                        </div>
                        <div>
                          <span>Rate: ₹</span>
                          <strong className="text-dark">{item.averageRate}</strong>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>

              <h5 className="mb-3 d-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faChartBar} /> Daily Milk Summary
              </h5>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={totals}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id.milkType" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalQuantity" fill="#8884d8" name="Total Quantity (L)" />
                  <Bar dataKey="totalAmount" fill="#82ca9d" name="Total Amount (₹)" />
                  <Bar dataKey="totalIncentive" fill="#ffc658" name="Total Incentive (₹)" />
                </BarChart>
              </ResponsiveContainer>

              <h5 className="mb-3 mt-5 d-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faChartBar} /> Cow vs Buffalo Milk Quantity
              </h5>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p>No records found for selected filters.</p>
          )}
        </Card>
      </div>
    </>
  );
};

export default DashboardPage;
