import React from "react";
import Button from "react-bootstrap/esm/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileCsv, faFilePdf } from "@fortawesome/free-solid-svg-icons";

const ExportButtonsSection = ({ handleExportCSV, handleExportPDF, isFetching, isExporting }) => (
    <div className="d-flex gap-2 justify-content-end w-100">
        <Button variant="outline-primary" className="export-btn" onClick={handleExportCSV} disabled={isFetching}>
            <FontAwesomeIcon icon={faFileCsv} /> Export CSV
        </Button>
        <Button variant="outline-primary" className="export-btn" onClick={handleExportPDF} disabled={isExporting || isFetching}>
            <FontAwesomeIcon icon={faFilePdf} /> Export PDF
        </Button>
    </div>
);

export default ExportButtonsSection; 