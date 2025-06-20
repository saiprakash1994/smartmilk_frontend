import React from "react";
import Button from "react-bootstrap/esm/Button";
import Form from "react-bootstrap/esm/Form";
import { Card } from "react-bootstrap";

const modernBtnStyle = {
    borderRadius: '999px',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.10)',
    padding: '8px 22px',
    fontSize: '1rem',
    transition: 'background 0.2s, box-shadow 0.2s',
};

const PaginationSection = ({
    totalCount,
    recordsPerPage,
    setRecordsPerPage,
    currentPage,
    setCurrentPage,
}) => (
    <Card className="pagination-actions-card" style={{ borderRadius: 14, padding: 10, minWidth: 320, background: 'rgba(255,255,255,0.97)' }}>

    <div className="d-flex w-100" style={{ minWidth: 0 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span className="text-muted align-self-center me-2">Rows per page:</span>
            <Form.Select
                size="sm"
                value={recordsPerPage}
                onChange={(e) => {
                    const value = e.target.value;
                    setRecordsPerPage(parseInt(value));
                    setCurrentPage(1);
                }}
                style={{ width: "auto" }}
            >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
            </Form.Select>
        </div>
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <span className="fw-semibold">
                Page {currentPage} of {Math.ceil(totalCount / recordsPerPage)}
            </span>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
                className="modern-pagination-btn ms-2"
                style={modernBtnStyle}
            >
                « Prev
            </Button>
            <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage >= Math.ceil(totalCount / recordsPerPage)}
                className="modern-pagination-btn ms-2"
                style={modernBtnStyle}
            >
                Next »
            </Button>
        </div>
    </div>
    </Card>
);

export default PaginationSection; 