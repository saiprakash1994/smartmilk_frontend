import React from "react";
import Table from "react-bootstrap/esm/Table";

const SummaryTotalsSection = ({ milktypeStats, showHeader = true }) => (
    <>
        {/* <strong>Summary Totals:</strong> */}
        {/* <Table size="sm" className="mt-1 mb-2 section-totals-table" style={{ background: '#f9fafb' }}> */}
        {showHeader && (
  <div style={{ background: '#2b50a1', fontWeight:"bold", color: 'whitesmoke', fontSize: '1.2rem', borderRadius: 8, padding: '8px 10px', marginBottom:'10px',fontFamily: 'Roboto, Segoe UI, Arial, sans-serif' }}>
    <span>Summary Totals:</span>
  </div>
)}
        <Table className="records-table summary-totals-table" responsive>
  <thead>
    <tr >
      <th>Milk Type</th>
      <th>Samples</th>
      <th>Avg FAT</th>
      <th>Avg SNF</th>
      <th>Avg CLR</th>
      <th>Avg Rate</th>
      <th>Total Qty</th>
      <th>Total Amount</th>
      <th>Incentive</th>
      <th>Grand Total</th>
    </tr>
  </thead>
  <tbody>
    {milktypeStats.map((stat, idx) => {
      let rowClass = '';
      if (stat?.milktype === 'ALL') {
        rowClass = 'row-all';
      } else if (stat?.milktype?.toUpperCase() === 'COW') {
        rowClass = 'row-cow';
      } else if (stat?.milktype?.toUpperCase() === 'BUF') {
        rowClass = 'row-buf';
      }
      return (
        <tr key={idx} className={rowClass}>
          <td>{stat?.milktype}</td>
          <td>{stat?.totalSamples}</td>
          <td>{stat?.avgFat?.toFixed(1)}</td>
          <td>{stat?.avgSnf?.toFixed(1)}</td>
          <td>{stat?.avgClr?.toFixed(1)}</td>
          <td>{stat?.avgRate?.toFixed(2)}</td>
          <td>{stat?.totalQty?.toFixed(2)}</td>
          <td>₹{stat?.totalAmount?.toFixed(2)}</td>
          <td>₹{stat?.totalIncentive?.toFixed(2)}</td>
          <td>₹{stat?.grandTotal?.toFixed(2)}</td>
        </tr>
      );
    })}
  </tbody>
</Table>

        
        
    
    </>

    
);

export default SummaryTotalsSection; 