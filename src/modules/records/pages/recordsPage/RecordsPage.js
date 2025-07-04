import React, { useState } from "react";
import { Tab, Container, Card, Badge, Row, Col, Nav } from "react-bootstrap";
import DeviceRecords from "../deviceRecords/DeviceRecords";
import MemberRecords from "../memberRecords/MemberRecords";
import "./RecordsPage.scss";
import AbsentMemberRecords from "../memberRecords/AbsentMemberRecords";
import CumilativeRecords from "../memberRecords/CumilativeRecords";
import DatewiseDetailedRecords from "../memberRecords/DatewiseDetailedRecords";
import DatewiseSummaryRecords from "../memberRecords/DatewiseSummaryRecords";
import {
  FaDatabase,
  FaUsers,
  FaUserTimes,
  FaCalculator,
  FaCalendarAlt,
  FaChartBar
} from "react-icons/fa";

const RecordsPage = () => {
  const [activeTab, setActiveTab] = useState("records");

  const tabConfig = [
    {
      key: "records",
      title: "Device Records",
      icon: FaDatabase,
      description: "View and manage device milk collection records",
      component: DeviceRecords
    },
    {
      key: "memberRecords",
      title: "Memberwise Report",
      icon: FaUsers,
      description: "Detailed reports by individual members",
      component: MemberRecords
    },
    {
      key: "absentRecords",
      title: "Absent Members",
      icon: FaUserTimes,
      description: "Track members who were absent on specific dates",
      component: AbsentMemberRecords
    },
    {
      key: "cumilativeRecords",
      title: "Payment Register",
      icon: FaCalculator,
      description: "Cumulative payment calculations and summaries",
      component: CumilativeRecords
    },
    {
      key: "datewiseDetailed",
      title: "Datewise Detailed",
      icon: FaCalendarAlt,
      description: "Detailed records organized by date",
      component: DatewiseDetailedRecords
    },
    {
      key: "datewiseSummary",
      title: "Datewise Summary",
      icon: FaChartBar,
      description: "Summary reports grouped by date",
      component: DatewiseSummaryRecords
    }
  ];

  return (
    <div className="records-page">
      <Container fluid className="records-container">
        {/* Header Card */}
        {/* <Card className="records-header-card mb-4">
          <Card.Header className="records-header">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h2 className="mb-1">Records Management</h2>
                <p className="mb-0 opacity-75">Access and manage all milk collection records and reports</p>
              </div>
              <Badge className="records-badge">
                <FaDatabase className="me-2" />
              </Badge>
            </div>
          </Card.Header>
        </Card> */}

        {/* Main Records Card with Sidebar */}
        <Card className="records-main-card">
          <Card.Header className="records-header">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <FaDatabase className="me-2" />
                <span>Records Dashboard</span>
              </div>
              <div className="d-flex align-items-center">
                <Badge bg="primary" className="me-3 records-badge">
                  <FaChartBar className="me-1" />
                  Reports
                </Badge>
              </div>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <Tab.Container id="records-tabs" defaultActiveKey="records">
              <Row className="g-0">
                {/* Sidebar */}
                <Col md={2} className="records-sidebar">
                  <Nav variant="pills" className="flex-column records-nav">
                    {tabConfig.map((tab) => {
                      const IconComponent = tab.icon;
                      return (
                        <Nav.Item key={tab.key}>
                          <Nav.Link
                            eventKey={tab.key}
                            className="records-nav-link"
                          >
                            <IconComponent className="me-2" />
                            <div className="nav-link-content">
                              <div className="nav-link-title">{tab.title}</div>
                            </div>
                          </Nav.Link>
                        </Nav.Item>
                      );
                    })}
                  </Nav>
                </Col>

                {/* Main Content */}
                <Col md={10} className="records-content">
                  <Tab.Content className="records-tab-content">
                    {tabConfig.map((tab) => {
                      const Component = tab.component;
                      return (
                        <Tab.Pane key={tab.key} eventKey={tab.key} className="records-tab-pane">
                          <div className="tab-header">
                            <h5>
                              <tab.icon className="me-2" />
                              {tab.title}
                            </h5>
                            <p>{tab.description}</p>
                          </div>
                          <div className="records-section">
                            <Component />
                          </div>
                        </Tab.Pane>
                      );
                    })}
                  </Tab.Content>
                </Col>
              </Row>
            </Tab.Container>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default RecordsPage;
