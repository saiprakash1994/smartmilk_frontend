import { Card, Col } from "react-bootstrap";
import Placeholder from "react-bootstrap/Placeholder";

const SkeletonHome = () => (
    <Col md={4}>
        <Card className="p-4 dashboard-summary-card h-100 border-0 shadow rounded-4 bg-white">
            <div className="mb-3">
                <Placeholder animation="wave">
                    <Placeholder xs={4} bg="primary" className="rounded-pill" />
                </Placeholder>
            </div>

            <div className="mb-3">
                <Placeholder as="h4" animation="wave">
                    <Placeholder xs={6} />
                </Placeholder>
                <Placeholder as="p" animation="wave">
                    <Placeholder xs={4} />
                </Placeholder>
            </div>

            <div className="mb-3">
                <Placeholder as="h5" animation="wave">
                    <Placeholder xs={5} />
                </Placeholder>``
                <Placeholder as="p" animation="wave">
                    <Placeholder xs={4} />
                </Placeholder>
            </div>

            <div className="d-flex justify-content-between pt-3 mt-3 border-top text-muted small">
                <Placeholder xs={2} />
                <Placeholder xs={2} />
                <Placeholder xs={2} />
            </div>
        </Card>
    </Col>
);

export default SkeletonHome;