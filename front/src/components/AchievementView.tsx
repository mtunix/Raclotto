import React, {useEffect, useState} from "react";
import {Collapse, Spin} from "antd";
import {Api} from "../lib/api";
import {Achievement} from "../model/achievement";

type AchievementViewProps = {};

export function AchievementView(props: AchievementViewProps) {
    let [achievements, setAchievements] = useState<Achievement[]>([]);
    let [waiting, setWaiting] = useState(true);

    useEffect(() => {
        Api.get("achievements").then((data: any) => {
            setAchievements(data);
            setWaiting(false);
        });
    }, []);

    if (waiting) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Spin size="large" />
            </div>
        );
    }

    let items = achievements.map((achievement, i) => ({
        key: i,
        label: <span style={{ fontWeight: 800 }}>{achievement.title}</span>,
        children: <p>{achievement.description}</p>
    }));

    return (
        <div>
            <Collapse items={items} />
        </div>
    );
}

