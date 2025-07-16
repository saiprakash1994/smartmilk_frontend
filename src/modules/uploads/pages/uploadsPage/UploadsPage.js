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
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import { 
    FaCloudUploadAlt, 
    FaFileAlt, 
    FaDatabase, 
    FaUsers, 
    FaChartLine,
    FaTint,
    FaServer
} from "react-icons/fa";
import { useSelector } from "react-redux";
import { useGetDeviceByIdQuery } from "../../../device/store/deviceEndPoint";
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { roles } from "../../../../shared/utils/appRoles";

const UploadsPage = () => {
    const navigate = useNavigate();
    const userInfo = useSelector((state) => state.userInfoSlice.userInfo);
    const deviceid = userInfo?.deviceid;
    const { data: deviceData } = useGetDeviceByIdQuery(deviceid, { skip: !deviceid });
    const clrBasedTable = deviceData?.serverSettings?.clrBasedTable === "Y";
    const snfOrClr = clrBasedTable ? "CLR" : "SNF";

    // Check if user is dairy user
    const isDairyUser = userInfo?.role === roles.DAIRY;

    const [uploadSnfBufTable] = useUploadSnfBufMutation();
    const [uploadSnfCowTable] = useUploadSnfCowMutation();
    const [uploadFatBufTable] = useUploadFatBufMutation();
    const [uploadFatCowTable] = useUploadFatCowMutation();
    const [uploadMemberTable] = useUploadMemberMutation();

    const location = useLocation();
    const { csv, filename, milkType, stepType } = location.state || {};

    // Refs for FileUploadCard components
    const snfBufRef = useRef();
    const snfCowRef = useRef();
    const fatBufRef = useRef();
    const fatCowRef = useRef();

    useEffect(() => {
      if (csv && filename) {
        // Create a File object from the CSV string
        const file = new File([csv], filename, { type: 'text/csv' });
        // Determine the correct section and set the file
        if (filename.includes('SNF_BUF')) {
          snfBufRef.current?.autoUploadFromParent(file);
        } else if (filename.includes('CLR_BUF')) {
          snfBufRef.current?.autoUploadFromParent(file);
        } else if (filename.includes('SNF_COW')) {
          snfCowRef.current?.autoUploadFromParent(file);
        } else if (filename.includes('CLR_COW')) {
          snfCowRef.current?.autoUploadFromParent(file);
        }
      }
    }, [csv, filename]);


    const uploadCategories = [
        {
            title: `${snfOrClr} Tables`,
            description: `Upload ${snfOrClr} (${clrBasedTable ? "Corrected Lactometer Reading" : "Solid Not Fat"}) rate tables for different milk types`,
            icon: FaChartLine,
            color: "primary",
            items: [
                {
                    title: `${snfOrClr} BUF TABLE`,
                    onUpload: uploadSnfBufTable,
                    toastMsg: `${snfOrClr} Buf table uploaded successfully`,
                    showDate: true,
                    dateFieldName: "snfBufEffectiveDate",
                    icon: FaTint,
                    description: `Buffalo milk ${snfOrClr} rates`
                },
                {
                    title: `${snfOrClr} COW TABLE`,
                    onUpload: uploadSnfCowTable,
                    toastMsg: `${snfOrClr} Cow table uploaded successfully`,
                    showDate: true,
                    dateFieldName: "snfCowEffectiveDate",
                    icon: FaServer,
                    description: `Cow milk ${snfOrClr} rates`
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
        // Only show Member Management for device users, not dairy users
        ...(isDairyUser ? [] : [{
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
        }])
    ];

    return (
        <div className="uploads-page">
            <Container fluid className="uploads-container">
                {/* Header Section */}
                {!(csv && filename) && (
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
                )}

                {/* Show only the relevant upload section if auto-uploading */}
                {csv && filename ? (
                  <Card className="upload-category-card mb-4">
                    <Card.Header className="category-header">
                      <div className="category-header-content">
                        <div className="category-icon">
                          <FaChartLine />
                        </div>
                        <div className="category-info">
                          <h4 className="category-title">Auto Upload</h4>
                          <p className="category-description">Auto-uploading file: <b>{filename}</b></p>
                        </div>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      <Row className="justify-content-center">
                        {filename.includes('SNF_BUF') && (
                          <Col xs={12} md={8} lg={6} className="mb-3 d-flex justify-content-center">
                            <FileUploadCard
                              ref={snfBufRef}
                              title={`${snfOrClr} BUF TABLE`}
                              onUpload={uploadSnfBufTable}
                              toastMsg={`${snfOrClr} Buf table uploaded successfully`}
                              showDate={true}
                              dateFieldName="snfBufEffectiveDate"
                              icon={FaTint}
                              description={`Buffalo milk ${snfOrClr} rates`}
                              categoryColor="primary"
                              disableFileInput={true}
                              suppressNoFileError={true}
                              autoRedirectAfterUpload={true}
                              hideFileInputArea={true}
                            />
                          </Col>
                        )}
                        {filename.includes('CLR_BUF') && (
                          <Col xs={12} md={8} lg={6} className="mb-3 d-flex justify-content-center">
                            <FileUploadCard
                              ref={snfBufRef}
                              title={`CLR BUF TABLE`}
                              onUpload={uploadSnfBufTable}
                              toastMsg={`CLR Buf table uploaded successfully`}
                              showDate={true}
                              dateFieldName="snfBufEffectiveDate"
                              icon={FaTint}
                              description={`Buffalo milk CLR rates`}
                              categoryColor="primary"
                              disableFileInput={true}
                              suppressNoFileError={true}
                              autoRedirectAfterUpload={true}
                              hideFileInputArea={true}
                            />
                          </Col>
                        )}
                        {filename.includes('SNF_COW') && (
                          <Col xs={12} md={8} lg={6} className="mb-3 d-flex justify-content-center">
                            <FileUploadCard
                              ref={snfCowRef}
                              title={`${snfOrClr} COW TABLE`}
                              onUpload={uploadSnfCowTable}
                              toastMsg={`${snfOrClr} Cow table uploaded successfully`}
                              showDate={true}
                              dateFieldName="snfCowEffectiveDate"
                              icon={FaServer}
                              description={`Cow milk ${snfOrClr} rates`}
                              categoryColor="primary"
                              disableFileInput={true}
                              suppressNoFileError={true}
                              autoRedirectAfterUpload={true}
                              hideFileInputArea={true}
                            />
                          </Col>
                        )}
                        {filename.includes('CLR_COW') && (
                          <Col xs={12} md={8} lg={6} className="mb-3 d-flex justify-content-center">
                            <FileUploadCard
                              ref={snfCowRef}
                              title={`CLR COW TABLE`}
                              onUpload={uploadSnfCowTable}
                              toastMsg={`CLR Cow table uploaded successfully`}
                              showDate={true}
                              dateFieldName="snfCowEffectiveDate"
                              icon={FaServer}
                              description={`Cow milk CLR rates`}
                              categoryColor="primary"
                              disableFileInput={true}
                              suppressNoFileError={true}
                              autoRedirectAfterUpload={true}
                              hideFileInputArea={true}
                            />
                          </Col>
                        )}
                        <Col xs={12} className="d-flex justify-content-center mt-3">
                          <Button variant="secondary" onClick={() => navigate('/ratetable')}>Cancel</Button>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                ) : (
                  /* Upload Categories */
                  uploadCategories.map((category, categoryIndex) => (
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
                                ref={
                                  item.title.includes('BUF') && category.title.includes('SNF') ? snfBufRef :
                                  item.title.includes('BUF') && category.title.includes('FAT') ? fatBufRef :
                                  item.title.includes('COW') && category.title.includes('SNF') ? snfCowRef :
                                  item.title.includes('COW') && category.title.includes('FAT') ? fatCowRef :
                                  null
                                }
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
                  ))
                )}

                {/* Upload Guidelines */}
                {!(csv && filename) && (
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
                )}
            </Container>
        </div>
    );
};

export default UploadsPage;
