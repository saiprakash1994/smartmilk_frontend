import { useState, useEffect, useRef } from "react";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { errorToast, successToast } from "../../../shared/utils/appToaster";
import { 
    FaCloudUploadAlt, 
    FaFileAlt, 
    FaCalendarAlt, 
    FaCheckCircle,
    FaTimesCircle
} from "react-icons/fa";

const FileUploadCard = ({
    title,
    onUpload,
    toastMsg = "Upload successful",
    showDate = false,
    dateFieldName = "effectiveDate",
    icon: Icon,
    description,
    categoryColor = "primary"
}) => {
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        if (showDate) {
            const today = new Date().toISOString().slice(0, 10);
            setSelectedDate(today);
        }
    }, [showDate]);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
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

    const getFileIcon = (fileName) => {
        if (!fileName) return FaFileAlt;
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'csv':
                return FaFileAlt;
            case 'xlsx':
            case 'xls':
                return FaFileAlt;
            case 'pdf':
                return FaFileAlt;
            default:
                return FaFileAlt;
        }
    };

    const FileIcon = getFileIcon(selectedFile?.name);

    return (
        <Card className={`file-upload-card ${dragActive ? 'drag-active' : ''}`}>
            <Card.Body className="p-4">
                {/* Header */}
                <div className="upload-card-header mb-4">
                    <div className="upload-card-icon">
                        {Icon && <Icon />}
                    </div>
                    <div className="upload-card-info">
                        <h5 className="upload-card-title">{title}</h5>
                        {description && (
                            <p className="upload-card-description">{description}</p>
                        )}
                    </div>
                </div>

                {/* File Upload Area */}
                <div 
                    className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="file-upload-content">
                        <div className="file-upload-icon">
                            <FaCloudUploadAlt />
                        </div>
                        <h6 className="file-upload-title">Drop your file here</h6>
                        <p className="file-upload-subtitle">or click to browse</p>
                        <Form.Control
                            type="file"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="file-input"
                            accept=".csv,.xlsx,.xls,.pdf"
                        />
                    </div>
                </div>

                {/* Selected File Display */}
                {selectedFile && (
                    <div className="selected-file-display">
                        <div className="file-info">
                            <div className="file-icon">
                                <FileIcon />
                            </div>
                            <div className="file-details">
                                <div className="file-name">{selectedFile.name}</div>
                                <div className="file-size">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                            </div>
                            <div className="file-status">
                                <FaCheckCircle className="text-success" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Date Selection */}
                {showDate && (
                    <div className="date-selection-section">
                        <Form.Group controlId="effectiveDate">
                            <Form.Label className="date-label">
                                <FaCalendarAlt className="me-2" />
                                Effective Date
                            </Form.Label>
                            <Form.Control
                                type="date"
                                value={selectedDate}
                                min={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="date-input"
                            />
                        </Form.Group>
                    </div>
                )}

                {/* Upload Button */}
                <div className="upload-button-section">
                    <Button
                        variant={categoryColor}
                        onClick={handleUpload}
                        disabled={uploading || !selectedFile}
                        className="upload-button"
                        size="lg"
                    >
                        {uploading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <FaCloudUploadAlt className="me-2" />
                                Upload {title}
                            </>
                        )}
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default FileUploadCard;

