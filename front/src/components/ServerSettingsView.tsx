import React, {useState, useEffect} from "react";
import {Form, Input, Button, Spin} from "antd";
import {Api} from "../lib/api";
import {useTranslation} from "react-i18next";

type ServerSettingsViewProps = {
    session: string;
    onSessionClosed: () => void;
};

export function ServerSettingsView(props: ServerSettingsViewProps) {
    let { t } = useTranslation();
    let [name, setName] = useState("");
    let [waiting, setWaiting] = useState(true);

    useEffect(() => {
        Api.get("session", props.session).then((data: any) => {
            setName(data["session"].name);
            setWaiting(false);
        });
    }, [props.session]);

    function onNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setName(e.target.value);
    }

    function onCloseSession() {
        Api.close(props.session).then(() => {
            props.onSessionClosed();
        });
    }

    if (waiting) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            <Form.Item label={t("session.sessionName")}>
                <Input
                    value={name}
                    onChange={onNameChanged}
                    placeholder={t("common.enterName")}
                />
            </Form.Item>
            <Form.Item label={t("session.eveningOver")}>
                <Button type="primary" danger block onClick={onCloseSession} style={{ marginTop: '8px' }}>
                    {t("session.endSession")}
                </Button>
            </Form.Item>
        </div>
    );
}

