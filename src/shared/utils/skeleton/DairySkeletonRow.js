import Placeholder from "react-bootstrap/Placeholder";

const DairySkeletonRow = () => (
    <tr>
        <td>
            <Placeholder animation="wave"  >
                <Placeholder xs={2} />
            </Placeholder>
        </td>
        <td>
            <Placeholder animation="wave" >
                <Placeholder xs={8} />

            </Placeholder>
        </td>
        <td>
            <Placeholder animation="wave"  >
                <Placeholder xs={5} />
            </Placeholder>

        </td>
        <td>
            <Placeholder animation="wave"  >
                <Placeholder xs={5} />
            </Placeholder>        </td>
        <td>
            <div className="d-flex gap-2">
                <Placeholder.Button animation="wave" bg="outline-primary" xs={2} />
                <Placeholder.Button animation="wave" bg="outline-danger" xs={2} />
            </div>
        </td>
    </tr>
);

export default DairySkeletonRow;
