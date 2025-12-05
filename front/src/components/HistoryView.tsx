import React, {useState, useEffect} from "react";
import {Api} from "../lib/api";
import {Collapse, List, Row, Col, Rate, Tag, Spin, Button} from "antd";
import {Pan} from "../model/pan";
import {Ingredient} from "../model/ingredient";
import {IngredientType} from "../model/ingredient";
import {useTranslation} from "react-i18next";

type HistoryViewProps = {
    session: string;
    ingredients: Ingredient[];
};

export function HistoryView(props: HistoryViewProps) {
    let { t } = useTranslation();
    let [pans, setPans] = useState<Pan[]>([]);
    let [waiting, setWaiting] = useState(true);

    useEffect(() => {
        Api.get("pans", props.session).then((data: any) => {
            setPans(data.reverse());
            setWaiting(false);
        });
    }, [props.session]);

    function getRating(id: number, initial: number, readonly: boolean) {
        return (
            <Rate
                value={initial}
                onChange={(rating) => onRating(id, rating)}
                disabled={readonly}
                style={{ marginBottom: '8px' }}
            />
        );
    }

    function onRating(id: number, rating: number) {
        Api.rate(props.session, id, rating).then((data: any) => {
            console.log(data);
        });
    }

    function getTags(ingredient: Ingredient) {
        return (
            <div>
                {ingredient.meat && <Tag color="default" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>{t("tags.meat")}</Tag>}
                {ingredient.vegan && <Tag color="default" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>{t("tags.vegan")}</Tag>}
                {ingredient.vegetarian && <Tag color="default" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>{t("tags.vegetarian")}</Tag>}
                {ingredient.histamine && <Tag color="default" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>{t("tags.histamine")}</Tag>}
                {ingredient.gluten && <Tag color="default" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>{t("tags.gluten")}</Tag>}
                {ingredient.lactose && <Tag color="default" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>{t("tags.lactose")}</Tag>}
                {ingredient.fructose && <Tag color="default" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>{t("tags.fructose")}</Tag>}
            </div>
        );
    }

    if (waiting) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Spin size="large" />
            </div>
        );
    }

    let items = pans.map((pan, i) => ({
        key: i,
        label: (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <span style={{ fontWeight: 800 }}>{pan.name}</span>
                    <br />
                    <span style={{ fontStyle: "italic", fontSize: "smaller" }}>{t("history.consumedBy")} {pan.user}</span>
                </div>
                <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                    {getRating(pan.id, pan.rating, true)}
                </div>
            </div>
        ),
        children: (
            <div>
                <Row gutter={16}>
                    <Col span={12}>
                        <span style={{ fontWeight: 800 }}>{t("ingredient.ingredients")}</span>
                        <List
                            dataSource={pan.ingredients.filter(ingredient => ingredient.type === IngredientType.FILL)}
                            renderItem={(ingredient) => (
                                <List.Item
                                    style={{
                                        backgroundColor: '#e6f7ff',
                                        marginBottom: '8px'
                                    }}
                                >
                                    <div style={{ width: '100%' }}>
                                        <div style={{ fontSize: '1rem' }}>{ingredient.name}</div>
                                        {getTags(ingredient)}
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Col>
                    <Col span={12}>
                        <span style={{ fontWeight: 800 }}>{t("ingredient.sauces")}</span>
                        <List
                            dataSource={pan.ingredients.filter(ingredient => ingredient.type === IngredientType.SAUCE)}
                            renderItem={(ingredient) => (
                                <List.Item
                                    style={{
                                        backgroundColor: '#f0f0f0',
                                        marginBottom: '8px'
                                    }}
                                >
                                    <div style={{ width: '100%' }}>
                                        <div style={{ fontSize: '1rem' }}>{ingredient.name}</div>
                                        {getTags(ingredient)}
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Col>
                </Row>
                <div style={{ backgroundColor: '#f5f5f5', padding: '12px', marginTop: '16px', borderRadius: '4px' }}>
                    <Row>
                        <Col span={12}>
                            <span style={{ fontStyle: "italic", fontSize: "smaller" }}>{t("history.consumedAt")} {pan.timestamp}</span>
                        </Col>
                        <Col span={12} style={{ textAlign: 'right' }}>
                            {getRating(pan.id, pan.rating, false)}
                        </Col>
                    </Row>
                </div>
                <Row style={{ marginTop: '16px' }}>
                    <Col span={24}>
                        <Button type="primary" block>{t("history.iWantThisToo")}</Button>
                    </Col>
                </Row>
            </div>
        )
    }));

    return (
        <div>
            <Collapse items={items} />
        </div>
    );
}

