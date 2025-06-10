import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Spinner from "react-bootstrap/Spinner";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { roles } from "../../../../shared/utils/appRoles";
import { useGetAllDevicesQuery, useGetDeviceByCodeQuery } from "../../../device/store/deviceEndPoint";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from "recharts";
import { faChartBar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import './DashBoardPage.scss';
import { useGetMultipleRecordsQuery } from "../../../records/store/recordEndPoint";

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
    const isDevice = userType === roles.DEVICE;

    const deviceid = userInfo?.deviceid;
    const dairyCode = userInfo?.dairyCode;

    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().slice(0, 10);
    });
    const [selectedShift, setSelectedShift] = useState("");
    const [selectedDeviceId, setSelectedDeviceId] = useState("");

    const { data: allDevices = [] } = useGetAllDevicesQuery(undefined, { skip: !isAdmin });
    const { data: dairyDevices = [] } = useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy });

    const deviceList = isAdmin
        ? allDevices
        : isDairy
            ? dairyDevices
            : deviceid
                ? [{ deviceid }]
                : [];

    const deviceCodes = isAdmin || isDairy
        ? selectedDeviceId
            ? selectedDeviceId
            : deviceList.map((dev) => dev.deviceid).join(",")
        : deviceid || "";

    const formattedDate = (() => {
        if (!selectedDate) return "";
        const d = new Date(selectedDate);
        return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/${d.getFullYear()}`;
    })();
    const skipFetch = !deviceCodes || !formattedDate;

    const { data, isLoading, isError, error, refetch } = useGetMultipleRecordsQuery(
        { params: { deviceCodes, date: formattedDate, shift: selectedShift } },
        { skip: skipFetch }
    );

    const totals = data?.totals || [];

    // Extract cow and buffalo quantities for pie chart
    const cowQuantity = totals.find(item => item._id.milkType === "COW")?.totalQuantity || 0;
    const buffaloQuantity = totals.find(item => item._id.milkType === "BUF")?.totalQuantity || 0;

    const pieData = [
        { name: "Cow Milk", value: cowQuantity },
        { name: "Buffalo Milk", value: buffaloQuantity },
    ];

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
                    {isLoading ? (
                        <div className="text-center my-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : isError ? (
                        <div className="alert alert-danger" role="alert">
                            Error: {error?.data?.message || error?.error || "Failed to load data"}
                        </div>
                    ) : (
                        <>
                            <h5 className="mb-4">Summary for {formattedDate}</h5>
                            <Row className="g-4 mb-4">
                                {totals.length > 0 ? (
                                    totals.map((item, idx) => (
                                        <Col md={4} key={idx}>
                                            <Card className="p-3 dashboard-summary-card h-100 border-0 shadow-lg rounded-4">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="badge bg-primary px-3 py-2 fs-6 rounded-pill">
                                                        {item._id.milkType}
                                                    </span>
                                                </div>
                                                <h5 className="fw-bold text-dark">
                                                    {item.totalQuantity.toFixed(2)} L
                                                </h5>
                                                <p className="mb-1 text-muted">Total Quantity</p>

                                                <h6 className="text-success fw-semibold">
                                                    ₹{item.totalAmount.toFixed(2)}
                                                </h6>
                                                <p className="mb-1 text-muted">Total Amount</p>

                                                <div className="d-flex justify-content-between text-muted mt-3 small">
                                                    <div>Fat: <strong>{item.averageFat}</strong></div>
                                                    <div>SNF: <strong>{item.averageSNF}</strong></div>
                                                    <div>Rate: ₹<strong>{item.averageRate}</strong></div>
                                                </div>
                                            </Card>
                                        </Col>
                                    ))
                                ) : (
                                    <p>No records found for selected filters.</p>
                                )}
                            </Row>

                            {totals.length > 0 && (
                                <>
                                    <h5 className="mb-3 d-flex align-items-center gap-2">
                                        <FontAwesomeIcon icon={faChartBar} /> Daily Milk Summary
                                    </h5>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <BarChart
                                            data={totals}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="_id.milkType"
                                                tickFormatter={(value) =>
                                                    value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
                                                }
                                            />
                                            <YAxis
                                                label={{ value: "Quantity / Amount", angle: -90, position: "insideLeft" }}
                                            />
                                            <Tooltip
                                                formatter={(value, name) => {
                                                    if (name === "Total Amount" || name === "Total Incentive") {
                                                        return [`₹${value.toFixed(2)}`, name];
                                                    }
                                                    return [value.toFixed(2), name];
                                                }}
                                            />
                                            <Legend verticalAlign="top" height={36} />
                                            <Bar
                                                dataKey="totalQuantity"
                                                fill="#8884d8"
                                                name="Total Quantity (L)"
                                                animationDuration={800}
                                            />
                                            <Bar
                                                dataKey="totalAmount"
                                                fill="#82ca9d"
                                                name="Total Amount (₹)"
                                                animationDuration={800}
                                            />
                                            <Bar
                                                dataKey="totalIncentive"
                                                fill="#ffc658"
                                                name="Total Incentive (₹)"
                                                animationDuration={800}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>


                                    {/* Pie Chart for Cow vs Buffalo */}
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
                            )}
                        </>
                    )}

                </Card>
            </div>
        </>
    );
};

export default DashboardPage;
