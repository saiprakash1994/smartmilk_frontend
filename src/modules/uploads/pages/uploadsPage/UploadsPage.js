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
import { Card, Container, Row, Col, Nav, Tab } from "react-bootstrap";
import { FaTint, FaTable, FaCloudUploadAlt, FaUser, FaLayerGroup } from "react-icons/fa";

const uploadTabs = [
    {
        key: 'snf-buf',
        title: 'SNF BUF TABLE',
        icon: <FaTint className="me-2" />,
        dateFieldName: 'snfBufEffectiveDate',
        showDate: true,
        toastMsg: 'SNF Buf table uploaded successfully',
    },
    {
        key: 'snf-cow',
        title: 'SNF COW TABLE',
        icon: <FaLayerGroup className="me-2" />,
        dateFieldName: 'snfCowEffectiveDate',
        showDate: true,
        toastMsg: 'SNF Cow table uploaded successfully',
    },
    {
        key: 'fat-buf',
        title: 'FAT BUF TABLE',
        icon: <FaTable className="me-2" />,
        dateFieldName: 'fatBufEffectiveDate',
        showDate: true,
        toastMsg: 'FAT Buf table uploaded successfully',
    },
    {
        key: 'fat-cow',
        title: 'FAT COW TABLE',
        icon: <FaCloudUploadAlt className="me-2" />,
        dateFieldName: 'fatCowEffectiveDate',
        showDate: true,
        toastMsg: 'FAT Cow table uploaded successfully',
    },
    {
        key: 'member',
        title: 'MEMBER TABLE',
        icon: <FaUser className="me-2" />,
        showDate: false,
        toastMsg: 'Member table uploaded successfully',
    },
];

const UploadsPage = () => {
    const [uploadSnfBufTable] = useUploadSnfBufMutation();
    const [uploadSnfCowTable] = useUploadSnfCowMutation();
    const [uploadFatBufTable] = useUploadFatBufMutation();
    const [uploadFatCowTable] = useUploadFatCowMutation();
    const [uploadMemberTable] = useUploadMemberMutation();

    const uploadMutations = {
        'snf-buf': uploadSnfBufTable,
        'snf-cow': uploadSnfCowTable,
        'fat-buf': uploadFatBufTable,
        'fat-cow': uploadFatCowTable,
        'member': uploadMemberTable,
    };

    return (
        <div className="uploads-page-bg">
            <Container fluid className="uploads-container">
                {/* <div className="d-flex justify-content-between pageTitleSpace">
                    <PageTitle name="UPLOADS" pageItems={0} />
                </div> */}
                <Card className="uploads-main-card settings-main-card">
                    <Card.Body className="p-0">
                        <Tab.Container id="uploads-tabs" defaultActiveKey="snf-buf">
                            <Row className="g-0">
                                <Col md={3} className="uploads-sidebar settings-sidebar">
                                    <Nav variant="pills" className="flex-column uploads-nav settings-nav">
                                        {uploadTabs.map(tab => (
                                            <Nav.Item key={tab.key}>
                                                <Nav.Link eventKey={tab.key} className="uploads-nav-link settings-nav-link">
                                                    {tab.icon}
                                                    {tab.title}
                                                </Nav.Link>
                                            </Nav.Item>
                                        ))}
                                    </Nav>
                                </Col>
                                <Col md={9} className="uploads-content settings-content">
                                    <Tab.Content className="uploads-tab-content settings-tab-content">
                                        {uploadTabs.map(tab => (
                                            <Tab.Pane eventKey={tab.key} key={tab.key} className="uploads-tab-pane settings-tab-pane">
                                                <div className="tab-header">
                                                    <h5>{tab.icon}{tab.title}</h5>
                                                    <p>Upload the {tab.title.replace('TABLE', '').trim()} file for your dairy device. Ensure the effective date is set correctly where required.</p>
                                                </div>
                                                <div className="uploads-section settings-section">
                                                    <FileUploadCard
                                                        title={tab.title}
                                                        onUpload={uploadMutations[tab.key]}
                                                        toastMsg={tab.toastMsg}
                                                        showDate={tab.showDate}
                                                        dateFieldName={tab.dateFieldName}
                                                    />
                                                </div>
                                            </Tab.Pane>
                                        ))}
                                    </Tab.Content>
                                </Col>
                            </Row>
                        </Tab.Container>
                    </Card.Body>
                </Card>
                <Card className="uploads-summary-card mt-4 save-settings-card">
                    <Card.Body className="p-4 d-flex align-items-center justify-content-between">
                        <div className="uploads-summary-info save-settings-info">
                            <h6 className="uploads-summary-title save-settings-title mb-2">Upload Instructions</h6>
                            <p className="uploads-summary-desc save-settings-description mb-0">Please upload the latest SNF, FAT, and Member tables as per your device requirements. Ensure the effective date is set correctly for each table. You will receive a confirmation toast on successful upload.</p>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default UploadsPage;
