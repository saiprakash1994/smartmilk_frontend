import React from "react";
import Table from "react-bootstrap/esm/Table";

const SummaryTotalsSection = ({ milktypeStats, showHeader = true }) => (
    <div className="totals-table-wrapper">
        {/* <strong>Summary Totals:</strong> */}
        {/* <Table size="sm" className="mt-1 mb-2 section-totals-table" style={{ background: '#f9fafb' }}> */}
        <Table className="records-table" bordered responsive>
            <thead>
                {showHeader && (
                  <tr className="table-group-header">
                      <td colSpan="9">
                          <div className="group-header-card d-flex justify-content-between align-items-center">
                              <span className="group-header-title">Summary Totals:</span>
                          </div>
                      </td>
                  </tr>
                )}
                <tr>
                    <th>Milk Type</th>
                    <th>Samples</th>
                    <th>Avg FAT</th>
                    <th>Avg SNF</th>
                    <th>Avg Rate</th>
                    <th>Total Qty</th>
                    <th>Total Amount</th>
                    <th>Incentive</th>
                    <th>Grand Total</th>
                </tr>
            </thead>
            <tbody>
                {milktypeStats.map((stat, idx) => (
                    <tr key={idx}>
                        <td>{stat?.milktype}</td>
                        <td>{stat?.totalSamples}</td>
                        <td>{stat?.avgFat?.toFixed(2)}</td>
                        <td>{stat?.avgSnf?.toFixed(2)}</td>
                        <td>{stat?.avgRate?.toFixed(2)}</td>
                        <td>{stat?.totalQty?.toFixed(2)}</td>
                        <td>₹{stat?.totalAmount?.toFixed(2)}</td>
                        <td>₹{stat?.totalIncentive?.toFixed(2)}</td>
                        <td>₹{stat?.grandTotal?.toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    </div>
);

export default SummaryTotalsSection; 