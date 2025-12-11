import React, {useEffect, useState, useCallback} from "react";
import {Api} from "../lib/api";
import {Row, Col, List, Rate, Switch, Card, Typography, Space} from "antd";
import {useInterval} from "../lib/useInterval";
import {useAppStore} from "../AppSlice";
import {Pan} from "../model/pan";
import {Ingredient, IngredientType} from "../model/ingredient";
import {useTranslation} from "react-i18next";
import {useParams} from "react-router-dom";
import {IngredientDisplay} from "./common/IngredientDisplay";

const {Title} = Typography;

interface IngredientWithRating extends Ingredient {
    avg_rating: number;
}

interface IngredientWithCount extends Ingredient {
    pan_count: number;
}

interface RatingViewerProps {
    rating: number;
}

function RatingViewer(props: RatingViewerProps) {
    return (
        <Rate
            value={props.rating}
            disabled
            allowHalf
            style={{fontSize: "1rem"}}
        />
    );
}

interface IngredientListGroupItemRatingProps {
    ingredient: IngredientWithRating;
}

function IngredientListGroupItemRating(props: IngredientListGroupItemRatingProps) {
    const backgroundColor = props.ingredient.type === IngredientType.FILL ? '#e6f7ff' : '#f0f0f0';

    return (
        <List.Item
            style={{
                backgroundColor: backgroundColor,
                marginBottom: '8px',
                borderRadius: '4px',
                padding: '12px'
            }}
        >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                <span style={{fontSize: "1rem"}}>{props.ingredient.name}</span>
                <RatingViewer rating={props.ingredient.avg_rating}/>
            </div>
        </List.Item>
    );
}

interface IngredientListGroupItemCountProps {
    ingredient: IngredientWithCount;
}

function IngredientListGroupItemCount(props: IngredientListGroupItemCountProps) {
    const backgroundColor = props.ingredient.type === IngredientType.FILL ? '#e6f7ff' : '#f0f0f0';

    return (
        <List.Item
            style={{
                backgroundColor: backgroundColor,
                marginBottom: '8px',
                borderRadius: '4px',
                padding: '12px'
            }}
        >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                <span style={{fontSize: "1rem"}}>{props.ingredient.name}</span>
                <span className="fw-bold" style={{fontSize: "1rem", fontWeight: 800}}>{props.ingredient.pan_count}</span>
            </div>
        </List.Item>
    );
}

interface PanListItemProps {
    pan: Pan;
}

function PanListItem(props: PanListItemProps) {
    const {t} = useTranslation();

    return (
        <List.Item
            style={{
                backgroundColor: '#f0f0f0',
                marginBottom: '8px',
                borderRadius: '4px',
                padding: '12px'
            }}
        >
            <div style={{width: '100%'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                    <div>
                        <span style={{fontWeight: 800}}>{props.pan.name} </span>
                        <span style={{fontStyle: "italic", fontSize: "smaller"}}>
                            {t("history.consumedBy")} {props.pan.user}
                        </span>
                    </div>
                    <div>
                        <RatingViewer rating={props.pan.rating}/>
                    </div>
                </div>
                <div>
                    <Space wrap>
                    {props.pan.ingredients.filter(ingredient => ingredient.type === IngredientType.FILL).map((ingredient) => (
                            <IngredientDisplay 
                                key={`fill-${ingredient.id}`}
                                ingredient={ingredient}
                                variant="badge"
                                showTags={false}
                                showIcon={true}
                            />
                    ))}
                    {props.pan.ingredients.filter(ingredient => ingredient.type === IngredientType.SAUCE).map((ingredient) => (
                            <IngredientDisplay 
                                key={`sauce-${ingredient.id}`}
                                ingredient={ingredient}
                                variant="badge"
                                showTags={false}
                                showIcon={true}
                            />
                    ))}
                    </Space>
                </div>
            </div>
        </List.Item>
    );
}

export function Dashboard() {
    const {t} = useTranslation();
    const {sessionId} = useParams<{sessionId: string}>();
    const session = useAppStore((state) => state.session);
    const [pans, setPans] = useState<Pan[]>([]);
    const [ingredientsRating, setIngredientsRating] = useState<IngredientWithRating[]>([]);
    const [ingredientsUsage, setIngredientsUsage] = useState<IngredientWithCount[]>([]);
    const [isGlobal, setIsGlobal] = useState(false);

    const update = useCallback(() => {
        Api.getStats(isGlobal ? undefined : session?.key).then((data) => {
            setPans(data.pans);
            setIngredientsRating(data.ingredients_top_rated);
            setIngredientsUsage(data.ingredients_most_used);
        }).catch((error) => {
            console.error("Failed to load stats:", error);
        });
    }, [isGlobal, session?.key]);

    useEffect(() => {
        update();
    }, [update]);

    useInterval(() => {
        update();
    }, 5000);

    return (
        <div style={{margin: "10px"}}>
            <Row style={{marginBottom: '16px'}}>
                <Col span={24}>
                    <Switch
                        checked={isGlobal}
                        onChange={(checked) => {
                            setIsGlobal(checked);
                        }}
                        checkedChildren="Global"
                        unCheckedChildren="Session"
                    />
                    <span style={{marginLeft: '8px'}}>{isGlobal ? "Global" : "Session"}</span>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={8}>
                    <Card>
                        <Title level={4}>Pans</Title>
                        <List
                            dataSource={pans}
                            renderItem={(pan) => <PanListItem key={`pan-${pan.id}`} pan={pan}/>}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Title level={4}>{t("ingredient.ingredients")} ({t("dashboard.rating")})</Title>
                        <List
                            dataSource={ingredientsRating}
                            renderItem={(ingredient) => (
                                <IngredientListGroupItemRating
                                    key={`ingredient-${ingredient.id}`}
                                    ingredient={ingredient}
                                />
                            )}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Title level={4}>{t("ingredient.ingredients")} ({t("dashboard.usage")})</Title>
                        <List
                            dataSource={ingredientsUsage}
                            renderItem={(ingredient) => (
                                <IngredientListGroupItemCount
                                    key={`ingredient-${ingredient.id}`}
                                    ingredient={ingredient}
                                />
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
