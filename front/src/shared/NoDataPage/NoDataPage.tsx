import {t} from "i18next";

/**
 * Generic error page for when there is no data available.
 */
export default function NoDataPage() {
    return (
        <div id="error-page">
            <i className="bi bi-database-exclamation font-size-xxl bg-circle" />
            <h1 className="mt-4">{t("error.no_data_available.title")}</h1>
            <p>{t("error.no_data_available.message")}</p>
        </div>
    );
}