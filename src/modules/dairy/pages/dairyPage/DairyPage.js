import { useNavigate } from "react-router-dom";
import { errorToast, successToast } from "../../../../shared/utils/appToaster";
import { PageTitle } from "../../../../shared/components/PageTitle/PageTitle";
import { faEdit, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Table from "react-bootstrap/Table";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import './DairyPage.scss';
import { useDeleteDairyMutation, useGetAllDairysQuery } from "../../store/dairyEndPoint";
import { Spinner } from "react-bootstrap";
import DairySkeletonRow from "../../../../shared/utils/skeleton/DairySkeletonRow";

const DairyPage = () => {
    const navigate = useNavigate();
    const { data: dairies = [], isLoading, isError } = useGetAllDairysQuery();
    const [deleteDairy] = useDeleteDairyMutation();

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this dairy?")) return;
        try {
            await deleteDairy(id).unwrap();
            successToast("Dairy deleted.");
        } catch (err) {
            console.error("Delete error:", err);
            errorToast("Failed to delete dairy.");
        }
    };

    return (
        <>
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="DAIRY" pageItems={0} />
                <Button variant="outline-primary" onClick={() => navigate('dairyadd')}>
                    <FontAwesomeIcon icon={faPlus} /> Add Dairy
                </Button>
            </div>

            <div className="usersPage">
                <Card className="h-100">
                    <Card.Body className="cardbodyCss">
                        <Table hover>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Dairy Code</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th style={{ width: '150px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 10 }).map((_, i) => <DairySkeletonRow key={i} />)

                                ) : isError ? (
                                    <tr>
                                        <td colSpan="5" className="text-danger text-center">Error loading devices</td>
                                    </tr>) : dairies.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center">No devices found</td>
                                        </tr>
                                    ) : (
                                    dairies.map((dairy, index) => (
                                        <tr key={dairy._id}>
                                            <td>{index + 1}</td>
                                            <td>{dairy.dairyCode}</td>
                                            <td>{dairy.dairyName}</td>
                                            <td>{dairy.email}</td>
                                            <td>
                                                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => navigate(`edit/${dairy.dairyCode}`)}>
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </Button>
                                                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(dairy.dairyCode)}>
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            </div>
        </>
    );
};

export default DairyPage;
