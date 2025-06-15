import { faFileCsv, faSearch, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Table from "react-bootstrap/esm/Table";
import Card from "react-bootstrap/esm/Card";
import Button from "react-bootstrap/esm/Button";
import Form from "react-bootstrap/esm/Form";
import Spinner from "react-bootstrap/esm/Spinner";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { UserTypeHook } from "../../../../shared/hooks/userTypeHook";
import { useGetDeviceByCodeQuery, useGetAllDevicesQuery } from "../../../device/store/deviceEndPoint";
import { roles } from "../../../../shared/utils/appRoles";
import './DeviceRecords.scss';
import { useLazyGetAllRecordsQuery } from "../../store/recordEndPoint";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons/faFilePdf";

const getToday = () => {
    return new Date().toISOString().split("T")[0];
};
const DeviceRecords = () => {
    const navigate = useNavigate();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const userType = UserTypeHook();

    const isAdmin = userType === roles.ADMIN;
    const isDairy = userType === roles.DAIRY;
    const isDevice = userType === roles.DEVICE;

    const deviceid = userInfo?.deviceid;
    const dairyCode = userInfo?.dairyCode;

    const { data: allDevices = [] } = useGetAllDevicesQuery(undefined, { skip: !isAdmin });
    const { data: dairyDevices = [] } = useGetDeviceByCodeQuery(dairyCode, { skip: !isDairy });
    const [triggerGetRecords, { isLoading: isFetching }] = useLazyGetAllRecordsQuery();

    const deviceList = isAdmin ? allDevices : isDairy ? dairyDevices : [];

    const [deviceCode, setDeviceCode] = useState('');
    const [date, setDate] = useState(getToday());
    const [shift, setShift] = useState('');
    const [milkTypeFilter, setMilkTypeFilter] = useState('ALL');
    const [records, setRecords] = useState([]);
    const [totals, setTotals] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [viewMode, setViewMode] = useState('ALL');

    useEffect(() => {
        if (isDevice && deviceid) {
            setDeviceCode(deviceid);
        }
    }, [isDevice, deviceid]);

    useEffect(() => {
        if (isDevice && deviceCode && date) {
            handleSearch();
        }
    }, [isDevice, deviceCode, date]);

    const handleSearch = async () => {
        if (!deviceCode || !date) {
            errorToast("Please select device code and date");
            return;
        }
        const today = new Date().toISOString().split("T")[0];
        if (date > today) {
            errorToast("Future dates are not allowed.");
            return;
        }

        const formattedDate = date.split("-").reverse().join("/");

        try {
            const result = await triggerGetRecords({
                params: {
                    date: formattedDate,
                    deviceCode,
                    ...(shift && { shift }),
                },
            }).unwrap();

            setHasSearched(true);
            setRecords(result.records || []);
            setTotals(result.totals || []);
            successToast("Data loaded successfully!");
        } catch (err) {
            console.error(err);
            errorToast("Failed to fetch data");
        }
    };

    const filteredRecords = milkTypeFilter === "ALL"
        ? records
        : records.filter(record => record.MILKTYPE === milkTypeFilter);

    const filteredTotals = milkTypeFilter === "ALL"
        ? totals.filter(t => t._id.milkType !== "TOTAL")
        : totals.filter(t => t._id.milkType === milkTypeFilter);

    const handleExportCSV = () => {
        if (!totals?.length && !records?.length) {
            alert("No data available to export.");
            return;
        }

        let combinedCSV = "";

        // Records Section
        if (records?.length) {
            const recordsCSVData = records.map((rec, index) => ({
                "S.No": index + 1,
                "Member Code": rec?.CODE,
                "Milk Type": rec?.MILKTYPE,
                "Shift": rec?.SHIFT,
                "FAT": rec?.FAT?.toFixed(1),
                "SNF": rec?.SNF?.toFixed(1),
                "Qty (L)": rec?.QTY?.toFixed(2) || '0.00',
                "Rate": rec?.RATE?.toFixed(2),
                "Amount": rec?.AMOUNT?.toFixed(2) || '0.00',
                "Incentive": rec?.INCENTIVEAMOUNT?.toFixed(2),
                "Total": rec?.TOTAL?.toFixed(2),
                "Analyzer": rec?.ANALYZERMODE,
                "Weight Mode": rec?.WEIGHTMODE,
                "Device ID": rec?.DEVICEID,
                "Date": date
            }));

            combinedCSV += `Milk Records for ${deviceCode} on ${date}\n`;
            combinedCSV += Papa.unparse(recordsCSVData);
            combinedCSV += "\n\n";
        }

        // Totals Section
        if (totals?.length) {
            const totalsCSVData = totals.map(item => ({
                "Milk Type": item._id?.milkType || '',
                "Total Records": item.totalRecords,
                "Total Quantity": item.totalQuantity?.toFixed(2) || '0.00',
                "Total Amount": item.totalAmount?.toFixed(2) || '0.00',
                "Total Incentive": item.totalIncentive?.toFixed(2) || '0.00',
                "Average FAT": item.averageFat,
                "Average SNF": item.averageSNF,
                "Average Rate": item.averageRate
            }));

            combinedCSV += `Milk Totals for ${deviceCode} on ${date}\n`;
            combinedCSV += Papa.unparse(totalsCSVData);
        }

        const blob = new Blob([combinedCSV], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `Milk_Data_${deviceCode}_${date}.csv`);
    };
    const handleExportPDF = () => {
        if (!totals?.length && !records?.length) {
            alert("No data available to export.");
            return;
        }

        const doc = new jsPDF();
        let currentY = 10;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Milk Data Report - ${deviceCode}`, 14, currentY);
        currentY += 8;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Date: ${date} | Shift: ${shift || 'ALL'} | Milk Type: ${milkTypeFilter}`, 14, currentY);
        currentY += 8;

        // Records Table
        if (records?.length) {
            const recordTable = records.map((rec, i) => [
                i + 1,
                rec?.CODE,
                rec?.MILKTYPE,
                rec?.SHIFT,
                rec?.FAT?.toFixed(1),
                rec?.SNF?.toFixed(1),
                rec?.QTY?.toFixed(2),
                rec?.RATE?.toFixed(2),
                rec?.AMOUNT?.toFixed(2),
                rec?.INCENTIVEAMOUNT?.toFixed(2),
                rec?.TOTAL?.toFixed(2)
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [[
                    "S.No", "Code", "Milk Type", "Shift", "FAT", "SNF", "Qty (L)",
                    "Rate", "Amount", "Incentive", "Total"
                ]],
                body: recordTable,
                styles: { fontSize: 8 },
                theme: "grid"
            });

            currentY = doc.lastAutoTable.finalY + 10;
        }

        // Totals Table
        if (totals?.length) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Milk Totals", 14, currentY);
            currentY += 6;

            const totalsTable = totals.map(total => [
                total?._id?.milkType,
                total?.totalRecords,
                total?.averageFat,
                total?.averageSNF,
                total?.totalQuantity?.toFixed(2),
                total?.averageRate,
                total?.totalAmount?.toFixed(2),
                total?.totalIncentive?.toFixed(2),
                (
                    (Number(total?.totalAmount || 0) + Number(total?.totalIncentive || 0))
                ).toFixed(2)
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [[
                    "Milk Type", "Total Records", "Avg FAT", "Avg SNF", "Total Qty",
                    "Avg Rate", "Total Amount", "Incentive", "Grand Total"
                ]],
                body: totalsTable,
                theme: "striped",
                styles: { fontSize: 9 },
            });
        }

        doc.save(`Milk_Data_${deviceCode}_${date}.pdf`);
    };


    return (
        <>
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="DEVICE RECORDS" pageItems={0} />
            </div>

            <div className="usersPage">
                <Card className="h-100">
                    <div className="filters d-flex gap-3 p-3 ">
                        {(isAdmin || isDairy) && (
                            <Form.Select value={deviceCode} onChange={e => setDeviceCode(e.target.value)}>
                                <option value="">Select Device Code</option>
                                {deviceList?.map((dev) => (
                                    <option key={dev.deviceid} value={dev.deviceid}>
                                        {dev.deviceid}
                                    </option>
                                ))}
                            </Form.Select>
                        )}

                        {isDevice && (
                            <Form.Control type="text" value={deviceCode} readOnly />
                        )}

                        <Form.Control type="date" value={date} max={getToday()} onChange={e => setDate(e.target.value)} />

                        <Form.Select value={shift} onChange={e => setShift(e.target.value)}>
                            <option value="">All Shifts</option>
                            <option value="MORNING">MORNING</option>
                            <option value="EVENING">EVENING</option>
                        </Form.Select>

                        <Form.Select value={milkTypeFilter} onChange={e => setMilkTypeFilter(e.target.value)}>
                            <option value="ALL">All Milk Types</option>
                            <option value="COW">COW</option>
                            <option value="BUF">BUF</option>
                        </Form.Select>
                        <Form.Select value={viewMode} onChange={e => setViewMode(e.target.value)}>
                            <option value="ALL">Show All Records</option>
                            <option value="RECORDS">Only Records Summary</option>
                            <option value="TOTALS">Only Record Totals</option>
                        </Form.Select>

                        <Button variant="outline-primary" onClick={handleSearch} disabled={isFetching}>
                            {isFetching ? <Spinner size="sm" animation="border" /> : <FontAwesomeIcon icon={faSearch} />}
                        </Button>
                    </div>

                    <Card.Body className="cardbodyCss">
                        {!hasSearched ? (
                            <div className="text-center my-5 text-muted">
                                Please apply filters and click <strong>Search</strong> to view records.
                            </div>
                        ) : isFetching ? (
                            <div className="text-center my-5">
                                <Spinner animation="border" variant="primary" />
                            </div>
                        ) : (
                            <>
                                <hr />
                                {viewMode !== "TOTALS" && (
                                    <>
                                        <PageTitle name="Record Summary" />
                                        <Table hover responsive>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Code</th>
                                                    <th>Milk Type</th>
                                                    <th>Shift</th>
                                                    <th>Fat</th>
                                                    <th>SNF</th>
                                                    <th>Qty</th>
                                                    <th>Rate</th>
                                                    <th>Amount</th>
                                                    <th>Incentive</th>
                                                    <th>Total</th>
                                                    <th>AnalyzerMode</th>
                                                    <th>WeightMode</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredRecords?.length > 0 ? (
                                                    filteredRecords.map((record, index) => (
                                                        <tr key={record._id}>
                                                            <td>{index + 1}</td>
                                                            <td>{record?.CODE}</td>
                                                            <td>{record?.MILKTYPE}</td>
                                                            <td>{record?.SHIFT}</td>
                                                            <td>{record?.FAT.toFixed(1)}</td>
                                                            <td>{record?.SNF.toFixed(1)}</td>
                                                            <td>{record?.QTY.toFixed(2)}</td>
                                                            <td>{record?.RATE.toFixed(2)}</td>
                                                            <td>{record?.AMOUNT.toFixed(2)}</td>
                                                            <td>{record?.INCENTIVEAMOUNT.toFixed(2)}</td>
                                                            <td>{record?.TOTAL.toFixed(2)}</td>
                                                            <td>{record?.ANALYZERMODE}</td>
                                                            <td>{record?.WEIGHTMODE}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="12" className="text-center">No records found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>


                                    </>
                                )}

                                {viewMode !== "RECORDS" && (
                                    <>
                                        <PageTitle name="Total Records" />
                                        <Table bordered responsive>
                                            <thead>
                                                <tr>
                                                    <th>Milk Type</th>
                                                    <th>Total Records</th>
                                                    <th>Avg Fat</th>
                                                    <th>Avg SNF</th>
                                                    <th>Total Qty</th>
                                                    <th>Avg Rate</th>
                                                    <th>Total Amount</th>
                                                    <th>Total Incentive</th>
                                                    <th>Grand Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredTotals?.length > 0 ? (
                                                    filteredTotals.map((total, index) => (
                                                        <tr key={index}>
                                                            <td>{total?._id.milkType}</td>
                                                            <td>{total?.totalRecords}</td>
                                                            <td>{total?.averageFat}</td>
                                                            <td>{total?.averageSNF}</td>
                                                            <td>{total?.totalQuantity.toFixed(2)}</td>
                                                            <td>{total?.averageRate}</td>
                                                            <td>{total?.totalAmount.toFixed(2)}</td>
                                                            <td>{total?.totalIncentive.toFixed(2)}</td>
                                                            <td>{(Number(total?.totalIncentive || 0) + Number(total?.totalAmount || 0)).toFixed(2)}</td>


                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="9" className="text-center">No totals available</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </>
                                )}
                                <Button variant="outline-primary" className="mb-3 me-2" onClick={handleExportCSV}>
                                    <FontAwesomeIcon icon={faFileCsv} /> Export CSV

                                </Button>
                                <Button variant="outline-primary" className="mb-3" onClick={handleExportPDF}>
                                    <FontAwesomeIcon icon={faFilePdf} /> Export PDF

                                </Button>
                            </>

                        )}
                    </Card.Body>
                </Card>
            </div>
        </>
    );
};

export default DeviceRecords;
