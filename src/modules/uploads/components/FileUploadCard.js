import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useNavigate } from 'react-router-dom';
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

const FileUploadCard = forwardRef(({
    title,
    onUpload,
    toastMsg = "Upload successful",
    showDate = false,
    dateFieldName = "effectiveDate",
    icon: Icon,
    description,
    categoryColor = "primary",
    disabled = false,
    disableFileInput = false,
    suppressNoFileError = false,
    autoRedirectAfterUpload = false,
    hideFileInputArea = false
}, ref) => {
    const navigate = useNavigate();
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

    useImperativeHandle(ref, () => ({
        setSelectedFileFromParent: (file) => {
            setSelectedFile(file);
        },
        autoUploadFromParent: (file) => {
            setSelectedFile(file);
            setTimeout(() => {
                handleUpload();
            }, 0);
        }
    }));

    const handleFileChange = (event) => {
        if (!disableFileInput) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleDrag = (e) => {
        if (disableFileInput) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        if (disableFileInput) return;
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            if (!suppressNoFileError) {
                errorToast("Please select a file.");
            }
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

            if (autoRedirectAfterUpload) {
                setTimeout(() => {
                    navigate('/ratetable'); // Change this route if your rate table generator is at a different path
                }, 1000); // Give a short delay for the toast to show
            }
        } catch (error) {
            console.error("Upload failed:", error);
            let errorMessage = "Upload failed";
            
            if (error?.data?.message) {
                errorMessage = error.data.message;
            } else if (error?.error) {
                errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
            } else if (error?.message) {
                errorMessage = error.message;
            } else if (error?.status) {
                errorMessage = `Upload failed with status: ${error.status}`;
            }
            
            errorToast(errorMessage);
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
                {!hideFileInputArea && (
                  <div 
                      className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${disableFileInput ? 'disabled' : ''}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      style={disableFileInput ? { pointerEvents: 'none', opacity: 0.5 } : {}}
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
                              accept=".csv"
                              disabled={disableFileInput}
                          />
                      </div>
                  </div>
                )}

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
                        disabled={uploading || !selectedFile || disabled}
                        className="upload-button"
                        size="lg"
                    >
                        {uploading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Uploading...
                            </>
                        ) : disabled ? (
                            <>
                                <FaCloudUploadAlt className="me-2" />
                                Select Device First
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
});

export default FileUploadCard;

