import {
  faBottleWater,
  faChartLine,
  faCogs,
  faFileUpload,
  faHouse,
  faMicrochip,
  faUser,
  faTable
} from "@fortawesome/free-solid-svg-icons";



export const perPage = 10;
export const Dairy = [
  { title: "dashboard", icon: faHouse, tooltip: "Dashboard" },
  { title: "device", icon: faMicrochip, tooltip: "Devices" },
  { title: "settings", icon: faCogs, tooltip: "Settings" },
  { title: "records", icon: faChartLine, tooltip: "Reports" },
  { title: "pricetable", icon: faTable, tooltip: "Price Table Generator" },
  { title: "uploads", icon: faFileUpload, tooltip: "Upload Files" },
  { title: "dairy", icon: faUser, tooltip: "Dairy Profile" },

];

export const Device = [
  { title: "dashboard", icon: faHouse, tooltip: "Dashboard" },
  { title: "settings", icon: faCogs, tooltip: "Device Settings" },
  { title: "records", icon: faChartLine, tooltip: "View Reports" },
  { title: "uploads", icon: faFileUpload, tooltip: "Upload Files" },
  { title: "device", icon: faUser, tooltip: "Device Profile" },

];
