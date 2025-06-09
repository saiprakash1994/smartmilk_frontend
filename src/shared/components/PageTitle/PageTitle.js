
export const PageTitle = ({ name, pageItems = 0, classNames }) => {
    return <>
        <p className={`pageTile ${classNames}`} >{name} {pageItems > 0 && <span className="pageItemsCount">({pageItems})</span>}</p>
    </>

}