import React from "react";
import Card from "react-bootstrap/esm/Card";
import ExportButtonsSection from "./ExportButtonsSection";
import PaginationSection from "./PaginationSection";

const ExportActions = ({
    totalCount,
    recordsPerPage,
    setRecordsPerPage,
    currentPage,
    setCurrentPage,
    handleExportCSV,
    handleExportPDF,
    isFetching = false,
    isExporting = false,
}) => {
    return (
        <div className="d-flex flex-wrap gap-3 mb-3">
            <Card className="export-actions-card" style={{ borderRadius: 14, padding: 16, minWidth: 220, background: 'rgba(255,255,255,0.97)' }}>
                <ExportButtonsSection
                    handleExportCSV={handleExportCSV}
                    handleExportPDF={handleExportPDF}
                    isFetching={isFetching}
                    isExporting={isExporting}
                />
            </Card>
            <Card className="pagination-actions-card" style={{ borderRadius: 14, padding: 16, minWidth: 320, background: 'rgba(255,255,255,0.97)' }}>
                <PaginationSection
                    totalCount={totalCount}
                    recordsPerPage={recordsPerPage}
                    setRecordsPerPage={setRecordsPerPage}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                />
            </Card>
        </div>
    );
};

export default ExportActions; 