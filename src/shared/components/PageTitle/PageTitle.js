import React from "react";

export const PageTitle = ({ name, pageItems = 0, classNames = "", icon = null }) => {
    return (
        <div className={`dashboard-page-title ${classNames}`.trim()}>
            {icon && <span className="dashboard-page-title-icon me-2">{icon}</span>}
            <span className="dashboard-page-title-text">{name}</span>
            {pageItems > 0 && <span className="dashboard-page-title-count ms-2">({pageItems})</span>}
        </div>
    );
}