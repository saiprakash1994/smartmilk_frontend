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

const UploadsPage = () => {
    const [uploadSnfBufTable] = useUploadSnfBufMutation();
    const [uploadSnfCowTable] = useUploadSnfCowMutation();
    const [uploadFatBufTable] = useUploadFatBufMutation();
    const [uploadFatCowTable] = useUploadFatCowMutation();
    const [uploadMemberTable] = useUploadMemberMutation();

    return (
        <>
            <div className="d-flex justify-content-between pageTitleSpace">
                <PageTitle name="UPLOADS" pageItems={0} />
            </div>

            <FileUploadCard
                title="SNF BUF TABLE"
                onUpload={uploadSnfBufTable}
                toastMsg="SNF Buf table uploaded successfully"
                showDate={true}
                dateFieldName="snfBufEffectiveDate"
            />

            <FileUploadCard
                title="SNF COW TABLE"
                onUpload={uploadSnfCowTable}
                toastMsg="SNF Cow table uploaded successfully"
                showDate={true}
                dateFieldName="snfCowEffectiveDate"
            />

            <FileUploadCard
                title="FAT BUF TABLE"
                onUpload={uploadFatBufTable}
                toastMsg="FAT Buf table uploaded successfully"
                showDate={true}
                dateFieldName="fatBufEffectiveDate"
            />

            <FileUploadCard
                title="FAT COW TABLE"
                onUpload={uploadFatCowTable}
                toastMsg="FAT COW table uploaded successfully"
                showDate={true}
                dateFieldName="fatCowEffectiveDate"
            />

            <FileUploadCard
                title="MEMBER TABLE"
                onUpload={uploadMemberTable}
                toastMsg="Member table uploaded successfully"
                showDate={false}
            />
        </>
    );
};

export default UploadsPage;
