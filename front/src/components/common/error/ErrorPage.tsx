import {useRouteError} from "react-router-dom";
import {t} from "i18next";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

export class RaclottoError extends Error {
    public title: string;

    constructor(title: string, message: string) {
        super(message);
        this.name = "Raclotto.GenericError";
        this.title = title;
    }
}

export class ApiNoResponseError extends RaclottoError {
    constructor() {
        super(t("error.no_response.title"), t("error.no_response.message"));
        this.name = "Raclotto.ApiNoResponseError";
    }
}

type ErrorPageProps = {
    title?: string,
    message?: string
    error?: RaclottoError
}

/**
 * Generic error page for when something goes wrong.
 * This page is displayed when an error occurs in the application.
 * It is _usually_ being rendered by the router.
 */
export default function ErrorPage(props: ErrorPageProps) {
    let error: any = useRouteError();

    function renderRouteError() {
        return <>
            <h1>{t("error.unexpected.title")}</h1>
            <p>{t("error.unexpected.message")}</p>
            <p>
                <i>{error.statusText || error.message}</i>
            </p>
        </>
    }

    function renderPropsError() {
        if (props.error) {
            return <>
                <h1>{props.error.title}</h1>
                <p>{props.error.message}</p>
            </>
        } else {
            return <>
                <h1>{props.title}</h1>
                <p>{props.message}</p>
            </>
        }
    }

    function renderUnknownError() {
        return <>
            <h1>{t("error.unknown.title")}</h1>
            <p>{t("error.unknown.message")}</p>
        </>
    }

    function renderError() {
        if (error) {
            return renderRouteError();
        } else if (props.title && props.message) {
            return renderPropsError();
        } else {
            return renderUnknownError();
        }
    }

    return (
        <div id="error-page">
            <Row>
                <Col></Col>
                <Col className="col-sm-auto align-right my-auto">
                    <i className="bi bi-bug font-size-xxl"></i>
                </Col>
                <Col className="align-left">
                    {renderError()}
                </Col>
                <Col></Col>
            </Row>
        </div>
    );
}