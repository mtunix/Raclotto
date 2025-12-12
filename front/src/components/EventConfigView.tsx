import React, { useState, useEffect, useCallback } from "react";
import { Card, Switch, InputNumber, Space, Button, message, Typography, Divider } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Api } from "../lib/api";
import { EventConfig } from "../model/eventConfig";

const { Title, Text } = Typography;

type EventConfigViewProps = {
    sessionKey: string;
    sessionId?: number;
};

export function EventConfigView(props: EventConfigViewProps) {
    const { t } = useTranslation();
    const [configs, setConfigs] = useState<EventConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

    const loadConfigs = useCallback(() => {
        if (!props.sessionKey) {
            setLoading(false);
            return;
        }

        setLoading(true);
        Api.getEventConfigs(props.sessionKey).then((data) => {
            setConfigs(data);
            setLoading(false);
        }).catch((error) => {
            console.error("Failed to load event configs:", error);
            message.error(t("settings.loadFailed") || "Failed to load event configurations");
            setLoading(false);
        });
    }, [props.sessionKey, t]);

    useEffect(() => {
        loadConfigs();
    }, [loadConfigs]);

    const handleToggle = useCallback((eventType: string, enabled: boolean) => {
        const config = configs.find(c => c.event_type === eventType);
        const isGlobal = !config || config.session_id === null || config.session_id === undefined;
        
        setSaving(prev => ({ ...prev, [eventType]: true }));
        
        Api.updateEventConfig({
            event_type: eventType,
            enabled: enabled,
            session_key: props.sessionKey
        }).then(() => {
            message.success(t("common.saved") || "Saved");
            loadConfigs();
        }).catch((error) => {
            console.error("Failed to update event config:", error);
            message.error(t("common.saveFailed") || "Failed to save");
        }).finally(() => {
            setSaving(prev => ({ ...prev, [eventType]: false }));
        });
    }, [configs, props.sessionKey, t, loadConfigs]);

    const handleFrequencyChange = useCallback((eventType: string, frequency: number | null) => {
        const config = configs.find(c => c.event_type === eventType);
        const enabled = config ? config.enabled : true;
        
        setSaving(prev => ({ ...prev, [eventType]: true }));
        
        Api.updateEventConfig({
            event_type: eventType,
            enabled: enabled,
            frequency_minutes: frequency,
            session_key: props.sessionKey
        }).then(() => {
            message.success(t("common.saved") || "Saved");
            loadConfigs();
        }).catch((error) => {
            console.error("Failed to update event config:", error);
            message.error(t("common.saveFailed") || "Failed to save");
        }).finally(() => {
            setSaving(prev => ({ ...prev, [eventType]: false }));
        });
    }, [configs, props.sessionKey, t, loadConfigs]);

    // Get all known event types (can be extended)
    const knownEventTypes = ["pan_swap"];

    // Create config entries for all known event types
    const allConfigs = knownEventTypes.map(eventType => {
        const config = configs.find(c => c.event_type === eventType);
        return {
            event_type: eventType,
            config: config || null,
            isGlobal: !config || config.session_id === null || config.session_id === undefined
        };
    });

    if (loading) {
        return <Card><Text>{t("common.loading") || "Loading..."}</Text></Card>;
    }

    return (
        <Card>
            <Title level={4}>{t("settings.eventSettings") || "Event Settings"}</Title>
            <Text type="secondary" style={{ display: "block", marginBottom: "16px" }}>
                {t("settings.eventSettingsDescription") || "Configure event frequency and enable/disable events for this session."}
            </Text>
            <Divider />
            
            {allConfigs.map(({ event_type, config, isGlobal }) => {
                const enabled = config ? config.enabled : true;
                const frequency = config ? config.frequency_minutes : null;
                const displayName = event_type === "pan_swap" 
                    ? (t("events.panSwap") || "Pan Swap Event")
                    : event_type;

                return (
                    <div key={event_type} style={{ marginBottom: "24px" }}>
                        <Space direction="vertical" style={{ width: "100%" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <Text strong>{displayName}</Text>
                                    {isGlobal && (
                                        <Text type="secondary" style={{ marginLeft: "8px" }}>
                                            ({t("settings.globalDefault") || "Global Default"})
                                        </Text>
                                    )}
                                </div>
                                <Switch
                                    checked={enabled}
                                    onChange={(checked) => handleToggle(event_type, checked)}
                                    loading={saving[event_type]}
                                />
                            </div>
                            
                            {enabled && (
                                <div style={{ marginLeft: "24px" }}>
                                    <Text>{t("settings.frequencyMinutes") || "Frequency (minutes)"}: </Text>
                                    <InputNumber
                                        min={1}
                                        max={60}
                                        value={frequency || undefined}
                                        onChange={(value) => handleFrequencyChange(event_type, value)}
                                        disabled={saving[event_type]}
                                        style={{ width: "100px", marginLeft: "8px" }}
                                        placeholder={t("settings.optional") || "Optional"}
                                    />
                                </div>
                            )}
                        </Space>
                        {event_type !== allConfigs[allConfigs.length - 1].event_type && <Divider />}
                    </div>
                );
            })}
        </Card>
    );
}

