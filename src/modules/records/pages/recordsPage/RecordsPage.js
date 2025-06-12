import React, { useState } from 'react'
import { Tabs, Tab } from "react-bootstrap";
import DeviceRecords from '../deviceRecords/DeviceRecords';
import MemberRecords from '../memberRecords/MemberRecords';
import './RecordsPage.scss'
import AbsentMemberRecords from '../memberRecords/AbsentMemberRecords';
import CumilativeRecords from '../memberRecords/CumilativeRecords';
const RecordsPage = () => {
    const [activeTab, setActiveTab] = useState("records");

    return (
        <>
            <Tabs
                id="records-tabs"
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
            >
                <Tab eventKey="records" title="Device Records">
                    <DeviceRecords />


                </Tab>
                <Tab eventKey="memberRecords" title="Member Records">
                    <MemberRecords />
                </Tab>
                <Tab eventKey="absentRecords" title="Absent Member Records">
                    <AbsentMemberRecords />
                </Tab>
                <Tab eventKey="cumilativeRecords" title="Cumilative Member Records">
                    <CumilativeRecords />
                </Tab>

            </Tabs>
        </>
    )
}

export default RecordsPage