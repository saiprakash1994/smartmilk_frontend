import {
  faBottleWater,
  faChartLine,
  faCogs,
  faFileUpload,
  faHouse,
  faMicrochip,
  faUser,
  faTable,
  faTint,
} from "@fortawesome/free-solid-svg-icons";
import { FaCow } from "react-icons/fa6";

export const perPage = 10;
export const Dairy = [
  { title: "dashboard", icon: faHouse, tooltip: "Dashboard" },
  // { title: "collection", icon: faTint, tooltip: "Milk Collection" },

  { title: "device", icon: faMicrochip, tooltip: "Devices" },
  { title: "settings", icon: faCogs, tooltip: "Settings" },
  { title: "records", icon: faChartLine, tooltip: "Reports" },
  { title: "ratetable", icon: faTable, tooltip: "Rate Table Generator" },
  { title: "uploads", icon: faFileUpload, tooltip: "Upload Files" },
  { title: "dairy", icon: faUser, tooltip: "Dairy Profile" },
];

export const Device = [
  { title: "dashboard", icon: faHouse, tooltip: "Dashboard" },
  // { title: "collection", icon: faTint, tooltip: "Milk Collection" },

  { title: "settings", icon: faCogs, tooltip: "Device Settings" },
  { title: "records", icon: faChartLine, tooltip: "View Reports" },
  { title: "ratetable", icon: faTable, tooltip: "Rate Table Generator" },
  { title: "uploads", icon: faFileUpload, tooltip: "Upload Files" },
  { title: "device", icon: faUser, tooltip: "Device Profile" },
];
