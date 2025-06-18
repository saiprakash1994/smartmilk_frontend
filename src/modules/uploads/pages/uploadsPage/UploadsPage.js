import './UploadsPage.scss';
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import {
    useUploadFatBufMutation,
    useUploadFatCowMutation,
    useUploadMemberMutation,
    useUploadSnfBufMutation,
    useUploadSnfCowMutation
} from "../../store/uploadEndPoint";
import FileUploadCard from "../../components/FileUploadCard";
import { Container, Row, Col, Card } from "react-bootstrap";
import { 
    FaCloudUploadAlt, 
    FaFileAlt, 
    FaDatabase, 
    FaUsers, 
    FaChartLine,
    FaTint,
    FaServer
} from "react-icons/fa";

const UploadsPage = () => {
    const [uploadSnfBufTable] = useUploadSnfBufMutation();
    const [uploadSnfCowTable] = useUploadSnfCowMutation();
    const [uploadFatBufTable] = useUploadFatBufMutation();
    const [uploadFatCowTable] = useUploadFatCowMutation();
    const [uploadMemberTable] = useUploadMemberMutation();

    const uploadCategories = [
        {
            title: "SNF Tables",
            description: "Upload SNF (Solid Not Fat) rate tables for different milk types",
            icon: FaChartLine,
            color: "primary",
            items: [
                {
                    title: "SNF BUF TABLE",
                    onUpload: uploadSnfBufTable,
                    toastMsg: "SNF Buf table uploaded successfully",
                    showDate: true,
                    dateFieldName: "snfBufEffectiveDate",
                    icon: FaTint,
                    description: "Buffalo milk SNF rates"
                },
                {
                    title: "SNF COW TABLE",
                    onUpload: uploadSnfCowTable,
                    toastMsg: "SNF Cow table uploaded successfully",
                    showDate: true,
                    dateFieldName: "snfCowEffectiveDate",
                    icon: FaServer,
                    description: "Cow milk SNF rates"
                }
            ]
        },
        {
            title: "FAT Tables",
            description: "Upload FAT rate tables for different milk types",
            icon: FaTint,
            color: "success",
            items: [
                {
                    title: "FAT BUF TABLE",
                    onUpload: uploadFatBufTable,
                    toastMsg: "FAT Buf table uploaded successfully",
                    showDate: true,
                    dateFieldName: "fatBufEffectiveDate",
                    icon: FaTint,
                    description: "Buffalo milk FAT rates"
                },
                {
                    title: "FAT COW TABLE",
                    onUpload: uploadFatCowTable,
                    toastMsg: "FAT COW table uploaded successfully",
                    showDate: true,
                    dateFieldName: "fatCowEffectiveDate",
                    icon: FaServer,
                    description: "Cow milk FAT rates"
                }
            ]
        },
        {
            title: "Member Management",
            description: "Upload member information and data",
            icon: FaUsers,
            color: "info",
            items: [
                {
                    title: "MEMBER TABLE",
                    onUpload: uploadMemberTable,
                    toastMsg: "Member table uploaded successfully",
                    showDate: false,
                    icon: FaUsers,
                    description: "Member information and details"
                }
            ]
        }
    ];

    return (
        <div className="uploads-page">
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="UPLOADS" pageItems={0} />
            </div>

            <Container fluid className="uploads-container">
                {/* Header Section */}
                <Card className="uploads-header-card mb-4">
                    <Card.Body className="text-center py-5">
                        <div className="uploads-header-icon">
                            <FaCloudUploadAlt />
                        </div>
                        <h2 className="uploads-title">File Upload Center</h2>
                        <p className="uploads-subtitle">
                            Upload and manage your data tables, rate configurations, and member information
                        </p>
                    </Card.Body>
                </Card>

                {/* Upload Categories */}
                {uploadCategories.map((category, categoryIndex) => (
                    <Card key={categoryIndex} className="upload-category-card mb-4">
                        <Card.Header className="category-header">
                            <div className="category-header-content">
                                <div className="category-icon">
                                    <category.icon />
                                </div>
                                <div className="category-info">
                                    <h4 className="category-title">{category.title}</h4>
                                    <p className="category-description">{category.description}</p>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                {category.items.map((item, itemIndex) => (
                                    <Col key={itemIndex} lg={6} className="mb-3">
                                        <FileUploadCard
                                            title={item.title}
                                            onUpload={item.onUpload}
                                            toastMsg={item.toastMsg}
                                            showDate={item.showDate}
                                            dateFieldName={item.dateFieldName}
                                            icon={item.icon}
                                            description={item.description}
                                            categoryColor={category.color}
                                        />
                                    </Col>
                                ))}
                            </Row>
                        </Card.Body>
                    </Card>
                ))}

                {/* Upload Guidelines */}
                <Card className="upload-guidelines-card">
                    <Card.Header className="guidelines-header">
                        <FaFileAlt className="me-2" />
                        <span>Upload Guidelines</span>
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            <Col md={4}>
                                <div className="guideline-item">
                                    <div className="guideline-icon">
                                        <FaFileAlt />
                                    </div>
                                    <h6>File Format</h6>
                                    <p>Ensure your files are in the correct format (CSV,  etc.) as specified for each upload type.</p>
                                </div>
                            </Col>
                            <Col md={4}>
                                <div className="guideline-item">
                                    <div className="guideline-icon">
                                        <FaDatabase />
                                    </div>
                                    <h6>Data Validation</h6>
                                    <p>Verify that your data meets the required validation criteria before uploading.</p>
                                </div>
                            </Col>
                            <Col md={4}>
                                <div className="guideline-item">
                                    <div className="guideline-icon">
                                        <FaCloudUploadAlt />
                                    </div>
                                    <h6>Effective Dates</h6>
                                    <p>Set appropriate effective dates for rate tables to ensure proper data management.</p>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default UploadsPage;
