import React, { useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import DeviceRecords from "../deviceRecords/DeviceRecords";
import MemberRecords from "../memberRecords/MemberRecords";
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
      <Tabs
        id="records-tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        <Tab eventKey="records" title="Daily Report">
          <DeviceRecords />
        </Tab>
        <Tab eventKey="memberRecords" title="Memberwise Report">
          <MemberRecords />
        </Tab>
        <Tab eventKey="absentRecords" title="Absent Members Report">
          <AbsentMemberRecords />
        </Tab>
        <Tab eventKey="cumilativeRecords" title="Payment Register">
          <CumilativeRecords />
        </Tab>
        <Tab eventKey="datewiseDetailed" title="Datewise Detailed Report">
          <DatewiseDetailedRecords />
        </Tab>
        <Tab eventKey="datewiseSummary" title="Datewise Summary Report">
          <DatewiseSummaryRecords />
        </Tab>
      </Tabs>
    </>
  );
};

export default RecordsPage;
