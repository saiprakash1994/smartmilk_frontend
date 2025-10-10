import React from "react";
import { Card, Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaTable, FaCalculator, FaChartLine, FaEquals } from "react-icons/fa";
import "./PriceTableGenerator.scss";

const RateTableOptions = () => {
  const navigate = useNavigate();

  const options = [
    {
      title: "Step by Step",
      description: "Generate rate tables using step-by-step FAT and SNF",
      icon: FaChartLine,
      path: "/ratetable-step-by-step",
      color: "primary",
      features: [
        "Separate FAT and SNF configuration",
        "Step-by-step rule creation",
        "Traditional rate table generation",
      ],
    },
    {
      title: "Formula",
      description: "Generate rate tables using FAT and SNF with formula",
      icon: FaCalculator,
      path: "/ratetable-formula",
      color: "primary",
      features: [
        "Unified FAT and SNF rules table",
        "Formula-based rate calculation",
        "Advanced rate table generation",
      ],
    },
    {
      title: "Standard",
      description: "Generate rate tables using standard SNF rules",
      icon: FaEquals,
      path: "/ratetable-stdsnf",
      color: "primary",
      features: [
        "Standard SNF rules table",
        "Simplified rate calculation",
        "Basic rate table generation",
      ],
    },
  ];

  return (
    <div className="ratetable-page" style={{ padding: "12px" }}>
      <Card
        className="price-table-generator-card mx-auto"
        style={{
          maxWidth: 900,
          boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          borderRadius: 18,
        }}
      >
        <Card.Header
          className="position-relative"
          style={{
            borderRadius: "18px 18px 0 0",
            padding: "0.75rem",
            background: "linear-gradient(135deg, #2b50a1 0%, #4f8fe8 100%)",
            color: "whitesmoke",
          }}
        >
          <div className="d-flex w-100 align-items-center">
            <FaTable size={18} className="me-2" />
            <span
              style={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                marginBottom: 0,
                textAlign: "left",
              }}
            >
              Rate Table Generator
            </span>
          </div>
        </Card.Header>
        <Card.Body style={{ padding: "1.2rem" }}>
          <div className="text-center mb-2">
            <h4 className="mb-1">Choose Your Rate Table Generation Method</h4>
            <p className="text-muted">
              Select the method that best suits your needs for generating milk
              rate tables
            </p>
          </div>

          <Row className="g-4">
            {options.map((option, index) => (
              <Col key={index} md={4}>
                <Card
                  className="h-100 option-card"
                  style={{
                    border: "2px solid #e9ecef",
                    borderRadius: 12,
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                  onClick={() => navigate(option.path)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow =
                      "0 10px 25px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0,0,0,0.1)";
                  }}
                >
                  <Card.Body className="d-flex flex-column h-100 p-4">
                    {/* Top section: icon, title, description */}
                    <div>
                      <div className=" text-center">
                        <option.icon
                          size={48}
                          className={`text-${option.color}`}
                          style={{ marginBottom: "0.5rem" }}
                        />
                      </div>
                      <h5 className="mb-2 fw-bold text-center">
                        {option.title}
                      </h5>
                      <p className="text-muted mb-2 text-center">
                        {option.description}
                      </p>
                    </div>

                    {/* Features section: always starts at same point */}
                    <div className="mb-1">
                      <h6 className="fw-bold mb-2">Features:</h6>
                      <ul className="list-unstyled">
                        {option.features.map((feature, idx) => (
                          <li key={idx} className="mb-1">
                            <span className="text-success me-2">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Button at the bottom */}
                    <Button
                      variant={option.color}
                      size="lg"
                      className="w-100 mt-auto"
                      style={{
                        background: `linear-gradient(135deg, ${
                          option.color === "primary" ? "#2b50a1" : "#28a745"
                        } 0%, ${
                          option.color === "primary" ? "#4f8fe8" : "#20c997"
                        } 100%)`,
                        border: "none",
                        borderRadius: 8,
                      }}
                    >
                      Select {option.title}
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <div className="text-center mt-2">
            <Button
              variant="outline-secondary"
              onClick={() => navigate("/dashboard")}
              className="px-4"
            >
              Back to Dashboard
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default RateTableOptions;
