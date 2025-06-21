import './FileUploadCard.scss';
import { useState, useEffect, useRef } from "react";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faUpload, faFileAlt } from "@fortawesome/free-solid-svg-icons";
import { errorToast, successToast } from "../../../shared/utils/appToaster";

const FileUploadCard = ({
    title,
    onUpload,
    toastMsg = "Upload successful",
    showDate = false,
    dateFieldName = "effectiveDate"
}) => {
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");

    useEffect(() => {
        if (showDate) {
            const today = new Date().toISOString().slice(0, 10);
            setSelectedDate(today);
        }
    }, [showDate]);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            errorToast("Please select a file.");
            return;
        }

        if (showDate && !selectedDate) {
            errorToast("Please select an effective date.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        if (showDate) {
            formData.append(dateFieldName, selectedDate);
        }

        try {
            setUploading(true);
            await onUpload({ formData }).unwrap();
            successToast(toastMsg);
            setSelectedFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            if (showDate) {
                const today = new Date().toISOString().slice(0, 10);
                setSelectedDate(today);
            }
        } catch (error) {
            console.error("Upload failed:", error);
            errorToast("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card className="file-upload-card mb-4 shadow-sm border-0">
            <Card.Body>
                <h5 className="mb-4 d-flex align-items-center gap-2 profileName">
                    <FontAwesomeIcon icon={faUpload} />
                    {title}
                </h5>

                <Form.Group controlId="formFile" className="mb-3">
                    <Form.Label><strong>Select a file</strong></Form.Label>
                    <Form.Control
                        type="file"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                    />
                </Form.Group>

                {showDate && (
                    <Form.Group controlId="effectiveDate" className="mb-3">
                        <Form.Label><strong>Effective Date</strong></Form.Label>
                        <Form.Control
                            type="date"
                            value={selectedDate}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </Form.Group>
                )}

                {selectedFile && (
                    <div className="mb-3 text-muted d-flex align-items-center gap-2">
                        <FontAwesomeIcon icon={faFileAlt} />
                        <small>{selectedFile.name}</small>
                    </div>
                )}

                <Button
                    variant="outline-primary"
                    className="file-upload-btn"
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile}
                >
                    {uploading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Uploading…
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faSave} className="me-2" />
                            Upload
                        </>
                    )}
                </Button>
            </Card.Body>
        </Card>
    );
};

export default FileUploadCard;

