import {useRouteError} from "react-router-dom";
import {t} from "i18next";
import {Row, Col, Typography} from "antd";

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
    let error: unknown = useRouteError();

    const {Title, Paragraph, Text} = Typography;

    function renderRouteError() {
        const errorMessage = error && typeof error === 'object' 
            ? ('statusText' in error ? String(error.statusText) : 'message' in error ? String(error.message) : '')
            : '';
        return <>
            <Title level={1}>{t("error.unexpected.title")}</Title>
            <Paragraph>{t("error.unexpected.message")}</Paragraph>
            {errorMessage && <Paragraph><Text type="secondary" italic>{errorMessage}</Text></Paragraph>}
        </>
    }

    function renderPropsError() {
        if (props.error) {
            return <>
                <Title level={1}>{props.error.title}</Title>
                <Paragraph>{props.error.message}</Paragraph>
            </>
        } else {
            return <>
                <Title level={1}>{props.title}</Title>
                <Paragraph>{props.message}</Paragraph>
            </>
        }
    }

    function renderUnknownError() {
        return <>
            <Title level={1}>{t("error.unknown.title")}</Title>
            <Paragraph>{t("error.unknown.message")}</Paragraph>
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
        <div id="error-page" style={{padding: '20px'}}>
            <Row justify="center" align="middle" style={{minHeight: '50vh'}}>
                <Col span={2} style={{textAlign: 'center'}}>
                    <span style={{fontSize: '48px'}}>🐛</span>
                </Col>
                <Col span={18} style={{textAlign: 'left'}}>
                    {renderError()}
                </Col>
            </Row>
        </div>
    );
}