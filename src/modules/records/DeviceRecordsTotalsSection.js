import React from "react";
import Table from "react-bootstrap/esm/Table";

const DeviceRecordsTotalsSection = ({ filteredTotals }) => {
    if (!filteredTotals?.length) {
        return <div className="text-center text-muted py-4">No totals found</div>;
    }
    const totalAmountSum = filteredTotals.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);
    const grandTotalSum = filteredTotals.reduce((sum, t) => sum + (Number(t.totalAmount || 0) + Number(t.totalIncentive || 0)), 0);
    const totalQtySum = filteredTotals.reduce((sum, t) => sum + (Number(t.totalQuantity) || 0), 0);
    return (
        <>
            <div className="mb-2 fw-semibold text-end">
                Total Qty: <span className="text-info">{totalQtySum.toFixed(2)} L</span> &nbsp;|&nbsp; Total Amount: <span className="text-primary">₹{totalAmountSum.toFixed(2)}</span> &nbsp;|&nbsp; Grand Total: <span className="text-success">₹{grandTotalSum.toFixed(2)}</span>
            </div>
            <div className="table-responsive">
                <Table className="records-table" bordered responsive>
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
                        {filteredTotals.map((total, index) => (
                            <tr key={index}>
                                <td>{total?._id.milkType}</td>
                                <td>{total?.totalRecords}</td>
                                <td>{total?.averageFat}</td>
                                <td>{total?.averageSNF}</td>
                                <td>{Number(total?.totalQuantity || 0).toFixed(2)}</td>
                                <td>₹{Number(total?.averageRate || 0).toFixed(2)}</td>
                                <td>₹{Number(total?.totalAmount || 0).toFixed(2)}</td>
                                <td>₹{Number(total?.totalIncentive || 0).toFixed(2)}</td>
                                <td>₹{(Number(total?.totalIncentive || 0) + Number(total?.totalAmount || 0)).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </>
    );
};

export default DeviceRecordsTotalsSection; 