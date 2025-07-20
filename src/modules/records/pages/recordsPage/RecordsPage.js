import React, { useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import DeviceRecords from "../deviceRecords/DeviceRecords";
import MemberRecords from "../memberRecords/MemberRecords";
import MemberList from "../memberRecords/MemberList";
import "./RecordsPage.scss";
import AbsentMemberRecords from "../memberRecords/AbsentMemberRecords";
import CumilativeRecords from "../memberRecords/CumilativeRecords";
import DatewiseDetailedRecords from "../memberRecords/DatewiseDetailedRecords";
import DatewiseSummaryRecords from "../memberRecords/DatewiseSummaryRecords";
import { FaTable, FaBuilding, FaDesktop } from "react-icons/fa";
import { useSelector } from "react-redux";
import { useGetAllDairysQuery } from "../../../dairy/store/dairyEndPoint";
import { useGetAllDevicesQuery } from "../../../device/store/deviceEndPoint";
import { roles } from "../../../../shared/utils/appRoles";

const RecordsPage = () => {
  const [activeTab, setActiveTab] = useState("records");
  return (
    <>
      <div className="records-tabs-scroll">
        <Tabs
          id="records-tabs"
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          
          <Tab eventKey="records" title="Daywise">
            <DeviceRecords />
          </Tab>
          <Tab eventKey="memberRecords" title="Memberwise">
            <MemberRecords />
          </Tab>
          <Tab eventKey="absentRecords" title="Absent List">
            <AbsentMemberRecords />
          </Tab>
          <Tab eventKey="cumilativeRecords" title="Payment Register">
            <CumilativeRecords />
          </Tab>
          <Tab eventKey="datewiseDetailed" title="Datewise Detailed">
            <DatewiseDetailedRecords />
          </Tab>
          <Tab eventKey="datewiseSummary" title="Datewise Summary">
            <DatewiseSummaryRecords />
          </Tab>
          <Tab eventKey="memberList" title="Members List">
            <MemberList />
          </Tab>
        </Tabs>
      </div>
    </>
  );
};

export default RecordsPage;
