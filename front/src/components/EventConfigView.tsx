import React, { useState, useCallback, useEffect, useRef } from "react";
import { Card, Switch, InputNumber, Space, message, Typography, Divider, Button } from "antd";
import { useTranslation } from "react-i18next";
import { Api } from "../lib/api";
import { useEventConfigs, mutateEventConfigs } from "../lib/api/swrHooks";

const { Title, Text } = Typography;

type EventConfigViewProps = {
    sessionKey: string;
    sessionId?: number;
};

interface EventConfigState {
    enabled: boolean;
    frequency_minutes: number | null;
}

export function EventConfigView(props: EventConfigViewProps) {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    const [localConfigs, setLocalConfigs] = useState<Record<string, EventConfigState>>({});
    const initialConfigsRef = useRef<Record<string, EventConfigState>>({});

    // Use SWR hook for data fetching
    const { data: configs = [], isLoading: loading, error } = useEventConfigs(props.sessionKey);
    
    // Show error message if loading fails
    React.useEffect(() => {
        if (error && props.sessionKey) {
            message.error(t("settings.loadFailed") || "Failed to load event configurations");
        }
    }, [error, props.sessionKey, t]);

    // Initialize local state from fetched configs
    useEffect(() => {
        if (configs.length > 0) {
            const initial: Record<string, EventConfigState> = {};
            const local: Record<string, EventConfigState> = {};
            
            configs.forEach(config => {
                const state: EventConfigState = {
                    enabled: config.enabled,
                    frequency_minutes: config.frequency_minutes !== null && config.frequency_minutes !== undefined 
                        ? config.frequency_minutes 
                        : 60
                };
                initial[config.event_type] = { ...state };
                local[config.event_type] = { ...state };
            });
            
            // Also initialize known event types that might not have configs yet
            const knownEventTypes = ["pan_swap"];
            knownEventTypes.forEach(eventType => {
                if (!initial[eventType]) {
                    const state: EventConfigState = {
                        enabled: true,
                        frequency_minutes: 60
                    };
                    initial[eventType] = { ...state };
                    local[eventType] = { ...state };
                }
            });
            
            initialConfigsRef.current = initial;
            setLocalConfigs(local);
        }
    }, [configs]);

    const handleToggle = useCallback((eventType: string, enabled: boolean) => {
        setLocalConfigs(prev => ({
            ...prev,
            [eventType]: {
                ...prev[eventType],
                enabled
            }
        }));
    }, []);

    const handleFrequencyChange = useCallback((eventType: string, frequency: number | null) => {
        setLocalConfigs(prev => ({
            ...prev,
            [eventType]: {
                ...prev[eventType],
                frequency_minutes: frequency
            }
        }));
    }, []);

    const isDirty = () => {
        const initial = initialConfigsRef.current;
        const local = localConfigs;
        
        for (const eventType in local) {
            const initialConfig = initial[eventType];
            const localConfig = local[eventType];
            
            if (!initialConfig) return true;
            
            if (initialConfig.enabled !== localConfig.enabled ||
                initialConfig.frequency_minutes !== localConfig.frequency_minutes) {
                return true;
            }
        }
        
        return false;
    };

    const handleSubmit = async () => {
        if (!isDirty() || saving) return;
        
        setSaving(true);
        
        try {
            const updates = Object.keys(localConfigs).map(eventType => {
                const config = localConfigs[eventType];
                return Api.updateEventConfig({
                    event_type: eventType,
                    enabled: config.enabled,
                    frequency_minutes: config.frequency_minutes,
                    session_key: props.sessionKey
                });
            });
            
            await Promise.all(updates);
            
            message.success(t("common.saved") || "Saved");
            // Invalidate cache to trigger refetch
            mutateEventConfigs(props.sessionKey);
            // Update initial refs to match current state
            initialConfigsRef.current = JSON.parse(JSON.stringify(localConfigs));
        } catch (error) {
            console.error("Failed to save event configs:", error);
            message.error(t("common.saveFailed") || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

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
            <Title level={4} style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.022em', marginBottom: 8 }}>{t("settings.eventSettings") || "Event Settings"}</Title>
            <Text type="secondary" style={{ display: "block", marginBottom: "24px", fontSize: '17px' }}>
                {t("settings.eventSettingsDescription") || "Configure event frequency and enable/disable events for this session."}
            </Text>
            <Divider />
            
            {allConfigs.map(({ event_type, config, isGlobal }) => {
                const localConfig = localConfigs[event_type];
                const enabled = localConfig ? localConfig.enabled : (config ? config.enabled : true);
                const frequency = localConfig 
                    ? localConfig.frequency_minutes 
                    : (config && config.frequency_minutes !== null && config.frequency_minutes !== undefined 
                        ? config.frequency_minutes 
                        : 60);
                const displayName = event_type === "pan_swap" 
                    ? (t("events.panSwap") || "Pan Swap Event")
                    : event_type;

                return (
                    <div key={event_type} style={{ marginBottom: "32px" }}>
                        <Space direction="vertical" style={{ width: "100%" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Text strong style={{ fontSize: '17px' }}>{displayName}</Text>
                                <Switch
                                    checked={enabled}
                                    onChange={(checked) => handleToggle(event_type, checked)}
                                    disabled={saving}
                                />
                            </div>
                            
                            {enabled && (
                                <div>
                                    <div style={{ marginBottom: "8px" }}>
                                        <Text style={{ fontSize: '17px' }}>{t("settings.frequencyMinutes") || "Frequency (minutes)"}</Text>
                                    </div>
                                    <InputNumber
                                        min={1}
                                        max={60}
                                        value={frequency}
                                        onChange={(value) => handleFrequencyChange(event_type, value)}
                                        disabled={saving}
                                        size="large"
                                        style={{ width: "100%" }}
                                        placeholder={t("settings.optional") || "Optional"}
                                    />
                                </div>
                            )}
                        </Space>
                        {event_type !== allConfigs[allConfigs.length - 1].event_type && <Divider style={{ marginTop: 24 }} />}
                    </div>
                );
            })}
            
            <Divider />
            
            <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                loading={saving}
                disabled={!isDirty() || saving}
                block
                style={{ 
                    height: '56px',
                    fontSize: '19px',
                    fontWeight: 500,
                    borderRadius: '12px',
                    letterSpacing: '-0.022em'
                }}
            >
                {t("common.save") || "Save"}
            </Button>
        </Card>
    );
}


