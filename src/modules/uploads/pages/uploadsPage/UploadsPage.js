import './UploadsPage.scss';
import "../../../settings/pages/settingsPage/SettingsPage.scss";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import {
    useUploadFatBufMutation,
    useUploadFatCowMutation,
    useUploadSnfBufMutation,
    useUploadSnfCowMutation,
    useUploadMemberMutation,
    useUploadClrBufMutation,
    useUploadClrCowMutation
} from "../../store/uploadEndPoint";
import FileUploadCard from "../../components/FileUploadCard";
import { Container, Row, Col, Card, Button, Nav, Tab } from "react-bootstrap";
import {
    FaCloudUploadAlt,
    FaFileAlt,
    FaDatabase,
    FaChartLine,
    FaTint,
    FaServer,
    FaUsers
} from "react-icons/fa";
import { useSelector } from "react-redux";
import { useGetDeviceByIdQuery } from "../../../device/store/deviceEndPoint";
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { roles } from "../../../../shared/utils/appRoles";

const UploadsPage = () => {
    // All hooks at the top!
    const navigate = useNavigate();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const location = useLocation();
    const { csv, filename, deviceId } = location.state || {};
    const deviceid = deviceId || userInfo?.deviceid;
    const { data: deviceData } = useGetDeviceByIdQuery(deviceid, { skip: !deviceid });
    const isDeviceUser = !!deviceId || userInfo?.role === roles.DEVICE;
    const isDairyUser = !isDeviceUser && userInfo?.role === roles.DAIRY;

    const [uploadSnfBufTable] = useUploadSnfBufMutation();
    const [uploadSnfCowTable] = useUploadSnfCowMutation();
    const [uploadFatBufTable] = useUploadFatBufMutation();
    const [uploadFatCowTable] = useUploadFatCowMutation();
    const [uploadMemberTable] = useUploadMemberMutation();
    const [uploadClrBufTable] = useUploadClrBufMutation();
    const [uploadClrCowTable] = useUploadClrCowMutation();

    const snfBufRef = useRef();
    const snfCowRef = useRef();
    const fatBufRef = useRef();
    const fatCowRef = useRef();
    const clrBufRef = useRef();
    const clrCowRef = useRef();
    const memberRef = useRef();

    // console.log("Generated",deviceData?.serverSettings?.clrBasedTable,isDeviceUser,isDairyUser)

    const uploadCategories = [
      {
        key: 'fat-buf',
        title: 'FAT BUF TABLE',
        icon: FaTint,
        ref: fatBufRef,
        onUpload: uploadFatBufTable,
        toastMsg: 'FAT Buf table uploaded successfully',
        showDate: true,
        dateFieldName: 'fatBufEffectiveDate',
        description: 'Buffalo milk FAT rates',
        categoryColor: 'success',
      },
      {
        key: 'fat-cow',
        title: 'FAT COW TABLE',
        icon: FaTint,
        ref: fatCowRef,
        onUpload: uploadFatCowTable,
        toastMsg: 'FAT Cow table uploaded successfully',
        showDate: true,
        dateFieldName: 'fatCowEffectiveDate',
        description: 'Cow milk FAT rates',
        categoryColor: 'success',
      },
      {
        key: 'snf-buf',
        title: 'SNF BUF TABLE',
        icon: FaChartLine,
        ref: snfBufRef,
        onUpload: uploadSnfBufTable,
        toastMsg: 'SNF Buf table uploaded successfully',
        showDate: true,
        dateFieldName: 'snfBufEffectiveDate',
        description: 'Buffalo milk SNF rates',
        categoryColor: 'primary',
      },
      {
        key: 'snf-cow',
        title: 'SNF COW TABLE',
        icon: FaChartLine,
        ref: snfCowRef,
        onUpload: uploadSnfCowTable,
        toastMsg: 'SNF Cow table uploaded successfully',
        showDate: true,
        dateFieldName: 'snfCowEffectiveDate',
        description: 'Cow milk SNF rates',
        categoryColor: 'primary',
      },
      // Add CLR tables for dairy user only
    
        {
          key: 'clr-buf',
          title: 'CLR BUF TABLE',
          icon: FaChartLine,
          ref: clrBufRef, // reuse CLR BUF ref for upload
          onUpload: uploadClrBufTable, // reuse SNF BUF upload
          toastMsg: 'CLR Buf table uploaded successfully',
          showDate: true,
          dateFieldName: 'clrBufEffectiveDate',
          description: 'Buffalo milk CLR rates',
          categoryColor: 'info',
        },
        {
          key: 'clr-cow',
          title: 'CLR COW TABLE',
          icon: FaChartLine,
          ref: clrCowRef, // reuse CLR COW ref for upload
          onUpload: uploadClrCowTable, // reuse SNF COW upload
          toastMsg: 'CLR Cow table uploaded successfully',
          showDate: true,
          dateFieldName: 'clrCowEffectiveDate',
          description: 'Cow milk CLR rates',
          categoryColor: 'info',
        },
    
      // Add Member Management if device user
      ...(isDeviceUser ? [{
        key: 'member',
        title: 'MEMBER TABLE',
        icon: FaUsers,
        ref: memberRef,
        onUpload: uploadMemberTable,
        toastMsg: 'Member table uploaded successfully',
        showDate: false,
        description: 'Member information and details',
        categoryColor: 'info',
      }] : []),
    ];
    const preferredUploadTab = location.state?.preferredUploadTab;
    const [activeKey, setActiveKey] = useState(preferredUploadTab && uploadCategories.some(cat => cat.key === preferredUploadTab) ? preferredUploadTab : uploadCategories[0]?.key);

    useEffect(() => {
      if (csv && filename) {
        const file = new File([csv], filename, { type: 'text/csv' });
        if (filename.includes('SNF_BUF')) {
          snfBufRef.current?.autoUploadFromParent(file);
        }  else if (filename.includes('SNF_COW')) {
          snfCowRef.current?.autoUploadFromParent(file);          
        } else if (filename.includes('CLR_BUF')) {
          clrBufRef.current?.autoUploadFromParent(file);
        }else if (filename.includes('CLR_COW')) {
          clrCowRef.current?.autoUploadFromParent(file);
        } else if (filename.includes('FAT_BUF')) {
          fatBufRef.current?.autoUploadFromParent(file);
        } else if (filename.includes('FAT_COW')) {
          fatCowRef.current?.autoUploadFromParent(file);
        } else if (filename.includes('MEMBER')) {
          memberRef.current?.autoUploadFromParent(file);
        }
      }
    }, [csv, filename]);

    // If auto-uploading, skip sidebar and show only relevant card
    if (csv && filename) {
      let cardProps = null;
      if (filename.includes('FAT_BUF')) {
        cardProps = uploadCategories[0];
      } else if (filename.includes('FAT_COW')) {
        cardProps = uploadCategories[1];
      } else if (filename.includes('SNF_BUF')) {
        cardProps = uploadCategories[2];
      } else if (filename.includes('SNF_COW')) {
        cardProps = uploadCategories[3];
      } else if (filename.includes('CLR_BUF')) {
        cardProps = uploadCategories[4];
        //cardProps = uploadCategories.find(cat => cat.key === 'clr-buf');
      } else if (filename.includes('CLR_COW')) {
        cardProps = uploadCategories[5];
        //cardProps = uploadCategories.find(cat => cat.key === 'clr-cow');
      } else if (filename.includes('MEMBER')) {
        cardProps = uploadCategories[uploadCategories.length - 1];
      }
      // If cardProps is not found, show error message
      if (!cardProps) {
        return (
          <div className="uploads-page">
            <Container fluid className="uploads-container">
              <Card className="upload-category-card mb-4">
                <Card.Body>
                  <h4>Invalid upload type</h4>
                  <p>The selected upload type is not available for your user role.</p>
                  <Button variant="primary" onClick={() => navigate('/uploads')}>Go to Uploads</Button>
                </Card.Body>
              </Card>
            </Container>
          </div>
        );
      }
      return (
        <div className="uploads-page">
          <Container fluid className="uploads-container">
            <Card className="upload-category-card mb-4">
              <Card.Header className="category-header">
                <div className="d-flex justify-content-between align-items-center w-100">
                  <div className="category-header-content d-flex align-items-center">
                    <div className="category-icon">
                      <cardProps.icon />
                    </div>
                    <div className="category-info ms-3">
                      <h4 className="category-title mb-0">Auto Upload</h4>
                      <p className="category-description mb-0">Auto-uploading file: <b>{filename}</b>{deviceId ? (<span> &nbsp;|&nbsp; <b>Device: {deviceId}</b></span>) : null}</p>
                    </div>
                  </div>
                  <Button 
                    variant="danger" 
                    size="lg" 
                    className="px-4 fw-bold"
                    style={{ minWidth: '120px' }}
                    onClick={() => navigate('/ratetable')}
                  >
                    Cancel
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <Row className="justify-content-center">
                  <Col xs={12} md={8} lg={6} className="mb-3 d-flex justify-content-center">
                    <FileUploadCard
                      ref={cardProps.ref}
                      title={cardProps.title}
                      onUpload={cardProps.onUpload}
                      toastMsg={cardProps.toastMsg}
                      showDate={cardProps.showDate}
                      dateFieldName={cardProps.dateFieldName}
                      icon={cardProps.icon}
                      description={cardProps.description}
                      categoryColor={cardProps.categoryColor}
                      disableFileInput={true}
                      suppressNoFileError={true}
                      autoRedirectAfterUpload={true}
                      hideFileInputArea={true}
                      deviceId={deviceId}
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Container>
        </div>
      );
    }

    return (
      <div className="uploads-page settings-page">
        <Container fluid className="uploads-container">
          <Card className="settings-main-card">
            <Card.Header className="settings-header ">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaCloudUploadAlt style={{ fontSize: '1.5rem' }} />
                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>Uploads</span>
              </div>
            </Card.Header>
            <Card.Body className="p-0   ">
              <Tab.Container id="uploads-tabs" activeKey={activeKey} onSelect={setActiveKey}>
                <Row className="g-0">
                  <Col md={3} className="settings-sidebar">
                    <Nav variant="pills" className="flex-column settings-nav">
                      {uploadCategories.map((category) => (
                        <Nav.Item key={category.key}>
                          <Nav.Link eventKey={category.key} className="settings-nav-link">
                            <category.icon className="me-2" />
                            {category.title}
                          </Nav.Link>
                        </Nav.Item>
                      ))}
                    </Nav>
                  </Col>
                  <Col md={9} className="settings-content">
                    <Tab.Content className="settings-tab-content">
                      {uploadCategories.map((category) => (
                        <Tab.Pane key={category.key} eventKey={category.key} className="settings-tab-pane">
                           <Row className="justify-content-center">
                             <Col xs={12} md={8} lg={6} className="mb-3 d-flex justify-content-center">
                               <FileUploadCard
                                 ref={category.ref}
                                 title={category.title}
                                 onUpload={category.onUpload}
                                 toastMsg={category.toastMsg}
                                 showDate={category.showDate}
                                 dateFieldName={category.dateFieldName}
                                 icon={category.icon}
                                 description={category.description}
                                 categoryColor={category.categoryColor}
                                 deviceId={deviceId}
                               />
                             </Col>
                           </Row>
                        </Tab.Pane>
                      ))}
                    </Tab.Content>
                  </Col>
                </Row>
              </Tab.Container>
            </Card.Body>
          </Card>
          {/* Upload Guidelines at the bottom */}
          <Card className="upload-guidelines-card mt-4">
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

