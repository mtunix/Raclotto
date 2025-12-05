import React, {useState} from "react";
import {Button, Card, Space} from "antd";
import {AddIngredient} from "./AddIngredient";
import {GenerateView} from "./GenerateView";
import {HistoryView} from "./HistoryView";
import {SettingsView} from "./SettingsView";
import {AchievementView} from "./AchievementView";
import {ServerSettingsView} from "./ServerSettingsView";
import {VectorGraphics} from "../lib/vectorGraphics";
import {Ingredient} from "../model/ingredient";
import {useTranslation} from "react-i18next";

type ToolbarProps = {
    ingredients: Ingredient[];
    session: string;
    sessionClosed: () => void;
    onAdd: () => void;
};

export function Toolbar(props: ToolbarProps) {
    let { t } = useTranslation();
    let [toolbar, setToolbar] = useState(0);

    function onGeneration(numIngredient: number, numSauce: number) {
        // This can be used for future functionality
    }

    function onToolbarClicked(id: number) {
        if (toolbar === id) {
            setToolbar(0);
        } else {
            setToolbar(id);
        }
    }

    function getTool() {
        let title: string | undefined;
        let view: React.ReactNode | undefined;

        switch (toolbar) {
            case 1:
                view = (
                    <GenerateView
                        session={props.session}
                        ingredients={props.ingredients}
                        onGeneration={onGeneration}
                    />
                );
                title = t("toolbar.generateTitle");
                break;
            case 2:
                view = <SettingsView />;
                title = t("toolbar.userSettingsTitle");
                break;
            case 3:
                view = <HistoryView session={props.session} ingredients={props.ingredients} />;
                title = t("toolbar.historyTitle");
                break;
            case 4:
                view = (
                    <AddIngredient
                        session={props.session}
                        onAdd={props.onAdd}
                    />
                );
                title = t("toolbar.addIngredientTitle");
                break;
            case 5:
                view = <AchievementView />;
                title = t("toolbar.achievementsTitle");
                break;
            case 6:
                view = (
                    <ServerSettingsView
                        session={props.session}
                        onSessionClosed={props.sessionClosed}
                    />
                );
                title = t("toolbar.serverSettingsTitle");
                break;
        }

        if (view) {
            return (
                <Card
                    title={<span style={{ fontWeight: 800 }}>{title}</span>}
                    style={{ marginTop: '16px' }}
                >
                    {view}
                </Card>
            );
        }
    }

    return (
        <div style={{ marginBottom: '8px' }}>
            <Space wrap>
                <Button
                    type={toolbar === 1 ? "primary" : "default"}
                    icon={VectorGraphics.SHUFFLE}
                    onClick={() => onToolbarClicked(1)}
                >
                    {t("common.shuffle")}
                </Button>
                <Button
                    type={toolbar === 2 ? "primary" : "default"}
                    icon={VectorGraphics.SETTINGS_CLIENT}
                    onClick={() => onToolbarClicked(2)}
                >
                    {t("common.settings")}
                </Button>
                <Button
                    type={toolbar === 3 ? "primary" : "default"}
                    icon={VectorGraphics.HISTORY}
                    onClick={() => onToolbarClicked(3)}
                >
                    {t("common.history")}
                </Button>
                <Button
                    type={toolbar === 4 ? "primary" : "default"}
                    onClick={() => onToolbarClicked(4)}
                >
                    +
                </Button>
                <Button
                    type={toolbar === 5 ? "primary" : "default"}
                    icon={VectorGraphics.ACHIEVEMENTS}
                    onClick={() => onToolbarClicked(5)}
                >
                    {t("common.achievements")}
                </Button>
                <Button
                    type={toolbar === 6 ? "primary" : "default"}
                    icon={VectorGraphics.SETTINGS_SERVER}
                    onClick={() => onToolbarClicked(6)}
                >
                    {t("common.serverSettings")}
                </Button>
            </Space>
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                {getTool()}
            </div>
        </div>
    );
}

