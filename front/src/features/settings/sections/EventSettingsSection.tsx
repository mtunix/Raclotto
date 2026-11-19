import { useState, useEffect } from "react";
import { Card, Switch, InputNumber, Space, message, Typography, Divider, Button, Alert } from "antd";
import { saveEventConfig, useListEventConfigs } from "../../../api/generated/endpoints/events/events";
import { useTranslation } from "react-i18next";
import { mutateEventConfigs, onErrorRetry } from "../../../lib/api/swrHooks";
import { EventType } from "../../../api/generated/model";
import { useAppStore } from "../../../AppSlice";
import { useAuthStore } from "../../../AuthSlice";
import { canManageSession } from "../../../model/permissions";
import "../SettingsView.css";

const { Title, Text } = Typography;

// Every event type the backend evaluates; configs of other types are left out.
const KNOWN_EVENT_TYPES = Object.values(EventType);

interface EventConfigState {
    enabled: boolean;
    frequency_minutes: number | null;
}

/** Each known event type's settings, from the session's effective config (one per type) or the defaults. */
function configStates(configs: readonly { event_type: string; enabled: boolean; frequency_minutes?: number | null }[]) {
    const states: Record<string, EventConfigState> = {};
    for (const config of configs) {
        states[config.event_type] = { enabled: config.enabled, frequency_minutes: config.frequency_minutes ?? 60 };
    }
    for (const eventType of KNOWN_EVENT_TYPES) {
        states[eventType] ??= { enabled: true, frequency_minutes: 60 };
    }
    return states;
}

export function EventSettingsSection() {
    const { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key ?? "";
    const user = useAuthStore((state) => state.user);
    const readOnly = !canManageSession(user, session);
    const [saving, setSaving] = useState(false);
    const [localConfigs, setLocalConfigs] = useState<Record<string, EventConfigState>>({});
    const [initialConfigs, setInitialConfigs] = useState<Record<string, EventConfigState>>({});

    const { data, isLoading: loading, error } = useListEventConfigs({ session_key: sessionKey }, {
        swr: { enabled: !!sessionKey, onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true },
    });
    const configs = data ?? [];
    
    // Show error message if loading fails
    useEffect(() => {
        if (error && sessionKey) {
            message.error(t("settings.loadFailed"));
        }
    }, [error, sessionKey, t]);

    const [loadedFrom, setLoadedFrom] = useState<typeof data>(undefined);
    if (data && data !== loadedFrom) {
        setLoadedFrom(data);
        const loaded = configStates(data);
        setInitialConfigs(loaded);
        setLocalConfigs(loaded);
    }

    const handleToggle = (eventType: string, enabled: boolean) => {
        setLocalConfigs(prev => ({
            ...prev,
            [eventType]: {
                ...prev[eventType],
                enabled
            }
        }));
    };

    const handleFrequencyChange = (eventType: string, frequency: number | null) => {
        setLocalConfigs(prev => ({
            ...prev,
            [eventType]: {
                ...prev[eventType],
                frequency_minutes: frequency
            }
        }));
    };

    const isDirty = () => {
        const initial = initialConfigs;
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
            const updates = KNOWN_EVENT_TYPES.filter(eventType => localConfigs[eventType]).map(eventType => {
                const config = localConfigs[eventType];
                return saveEventConfig({
                    event_type: eventType,
                    enabled: config.enabled,
                    frequency_minutes: config.frequency_minutes,
                    session_key: sessionKey
                });
            });
            
            await Promise.all(updates);
            
            message.success(t("common.saved"));
            // Invalidate cache to trigger refetch
            void mutateEventConfigs(sessionKey);
            setInitialConfigs(localConfigs);
        } catch (error) {
            console.error("Failed to save event configs:", error);
            message.error(t("common.saveFailed"));
        }
        setSaving(false);
    };

    // Create config entries for all known event types
    const allConfigs = KNOWN_EVENT_TYPES.map(eventType => {
        const config = configs.find(c => c.event_type === eventType);
        return {
            event_type: eventType,
            config: config || null,
            isGlobal: !config || config.session_id === null
        };
    });

    return (
        <div className="settings-session-tab">
            {sessionKey ? (
                <Card>
                    <Title level={4} style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.022em', marginBottom: 8 }}>{t("settings.eventSettings")}</Title>
                    <Text type="secondary" style={{ display: "block", marginBottom: "24px", fontSize: '17px' }}>
                        {t("settings.eventSettingsDescription")}
                    </Text>
                    <Divider />
                    
                    {loading ? (
                        <Text>{t("common.loading")}</Text>
                    ) : (
                        <>
                            {allConfigs.map(({ event_type, config, isGlobal }) => {
                                const localConfig = localConfigs[event_type];
                                const enabled = localConfig ? localConfig.enabled : (config ? config.enabled : true);
                                const frequency = localConfig 
                                    ? localConfig.frequency_minutes 
                                    : (config && config.frequency_minutes !== null && config.frequency_minutes !== undefined 
                                        ? config.frequency_minutes 
                                        : 60);
                                const displayName = t(`events.types.${event_type}.name`);

                                return (
                                    <div key={event_type} style={{ marginBottom: "32px" }}>
                                        <Space orientation="vertical" style={{ width: "100%" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <Text strong style={{ fontSize: '17px' }}>{displayName}</Text>
                                                <Switch
                                                    checked={enabled}
                                                    onChange={(checked) => handleToggle(event_type, checked)}
                                                    disabled={saving || readOnly}
                                                />
                                            </div>
                                            
                                            {enabled && (
                                                <div>
                                                    <div style={{ marginBottom: "8px" }}>
                                                        <Text style={{ fontSize: '17px' }}>{t("settings.frequencyMinutes")}</Text>
                                                    </div>
                                                    <InputNumber
                                                        min={1}
                                                        max={60}
                                                        value={frequency}
                                                        onChange={(value) => handleFrequencyChange(event_type, value)}
                                                        disabled={saving || readOnly}
                                                        size="large"
                                                        style={{ width: "100%" }}
                                                        placeholder={t("settings.optional")}
                                                    />
                                                </div>
                                            )}
                                        </Space>
                                        {event_type !== allConfigs[allConfigs.length - 1].event_type && <Divider style={{ marginTop: 24 }} />}
                                    </div>
                                );
                            })}
                            
                            <Divider />

                            {readOnly ? (
                                <Alert type="info" showIcon title={t("settings.onlyCreatorManages")} />
                            ) : (
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
                                {t("common.save")}
                            </Button>
                            )}
                        </>
                    )}
                </Card>
            ) : (
                <Card className="settings-card" styles={{ body: { padding: '24px' } }}>
                    <Alert
                        title={t("settings.noSession")}
                        type="warning"
                        showIcon
                        style={{ borderRadius: '12px' }}
                    />
                </Card>
            )}
        </div>
    );
}
