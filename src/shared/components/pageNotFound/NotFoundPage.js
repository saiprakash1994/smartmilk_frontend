import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container } from 'react-bootstrap';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <Container className="text-center py-5">
            <h1 className="display-3">404</h1>
            <p className="lead">Oops! The page you’re looking for doesn’t exist.</p>
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
            </Button>
        </Container>
    );
};

export default NotFoundPage;
