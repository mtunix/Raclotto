import React, {useEffect, useState, useCallback} from "react";
import {Api} from "../lib/api";
import {Row, Col, List, Rate, Switch, Card, Typography, Space, Tag} from "antd";
import {useInterval} from "../lib/useInterval";
import {useAppStore} from "../AppSlice";
import {useAuthStore} from "../AuthSlice";
import {Pan} from "../model/pan";
import {Ingredient, IngredientType} from "../model/ingredient";
import {LeaderboardEntry} from "../lib/api/types";
import {useTranslation} from "react-i18next";
import {IngredientDisplay} from "./common/IngredientDisplay";

const {Title, Text} = Typography;

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
    const backgroundColor = props.ingredient.type === IngredientType.FILL ? '#f0f7ff' : '#fafafa';

    return (
        <List.Item
            style={{
                backgroundColor: backgroundColor,
                marginBottom: '4px',
                borderRadius: '4px',
                padding: '8px 10px'
            }}
        >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                <span style={{fontSize: "0.9rem"}}>{props.ingredient.name}</span>
                <RatingViewer rating={props.ingredient.avg_rating}/>
            </div>
        </List.Item>
    );
}

interface IngredientListGroupItemCountProps {
    ingredient: IngredientWithCount;
}

function IngredientListGroupItemCount(props: IngredientListGroupItemCountProps) {
    const backgroundColor = props.ingredient.type === IngredientType.FILL ? '#f0f7ff' : '#fafafa';

    return (
        <List.Item
            style={{
                backgroundColor: backgroundColor,
                marginBottom: '4px',
                borderRadius: '4px',
                padding: '8px 10px'
            }}
        >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                <span style={{fontSize: "0.9rem"}}>{props.ingredient.name}</span>
                <span className="fw-bold" style={{fontSize: "0.9rem", fontWeight: 600}}>{props.ingredient.pan_count}</span>
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
                backgroundColor: '#fafafa',
                marginBottom: '4px',
                borderRadius: '4px',
                padding: '8px 10px'
            }}
        >
            <div style={{width: '100%'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px'}}>
                    <div style={{flex: 1}}>
                        <div style={{fontWeight: 500, fontSize: '0.9rem', marginBottom: '4px'}}>
                            {props.pan.name}
                        </div>
                        <div style={{fontStyle: "italic", fontSize: "0.75rem", color: '#8c8c8c'}}>
                            {t("history.consumedBy")} {props.pan.user}
                        </div>
                    </div>
                    <div style={{marginLeft: '8px'}}>
                        <RatingViewer rating={props.pan.rating}/>
                    </div>
                </div>
                <div>
                    <Space wrap size={[4, 4]}>
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

interface LeaderboardListItemProps {
    entry: LeaderboardEntry;
    currentUserId?: number;
}

function LeaderboardListItem(props: LeaderboardListItemProps) {
    const {t} = useTranslation();
    const isTopThree = props.entry.rank <= 3;
    const isCurrentUser = props.currentUserId === props.entry.user_id;
    
    // Subtle styling for top 3, normal for others
    const backgroundColor = isTopThree 
        ? (isCurrentUser ? '#f0f7ff' : '#fafafa')
        : (isCurrentUser ? '#f0f7ff' : '#ffffff');
    const borderColor = isTopThree 
        ? (props.entry.rank === 1 ? '#d4af37' : props.entry.rank === 2 ? '#c0c0c0' : '#cd7f32')
        : 'transparent';
    const borderWidth = isTopThree ? '1px' : '0px';
    const padding = isTopThree ? '10px' : '8px';
    const fontSize = isTopThree ? '0.95rem' : '0.9rem';

    return (
        <List.Item
            style={{
                backgroundColor: backgroundColor,
                marginBottom: '4px',
                borderRadius: '4px',
                padding: padding,
                border: `${borderWidth} solid ${borderColor}`,
                borderLeft: isTopThree ? `3px solid ${borderColor}` : 'none'
            }}
        >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0}}>
                    <Text 
                        type="secondary" 
                        style={{
                            fontSize: isTopThree ? "0.9rem" : "0.8rem",
                            minWidth: '24px',
                            textAlign: 'center',
                            fontWeight: isTopThree ? 600 : 400
                        }}
                    >
                        {props.entry.rank}
                    </Text>
                    <Text 
                        ellipsis
                        strong={isCurrentUser || isTopThree} 
                        style={{fontSize: fontSize, flex: 1}}
                    >
                        {props.entry.name}
                        {isCurrentUser && (
                            <Tag 
                                color="default" 
                                style={{
                                    marginLeft: '6px',
                                    fontSize: '0.75rem',
                                    padding: '0 4px',
                                    lineHeight: '16px'
                                }}
                            >
                                {t("dashboard.you") || "You"}
                            </Tag>
                        )}
                    </Text>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px'}}>
                    <Text 
                        type="secondary" 
                        style={{fontSize: "0.8rem", fontWeight: 500}}
                    >
                        {props.entry.total_points}
                    </Text>
                </div>
            </div>
        </List.Item>
    );
}

export function Dashboard() {
    const {t} = useTranslation();
    const session = useAppStore((state) => state.session);
    const currentUser = useAuthStore((state) => state.user);
    const [pans, setPans] = useState<Pan[]>([]);
    const [ingredientsRating, setIngredientsRating] = useState<IngredientWithRating[]>([]);
    const [ingredientsUsage, setIngredientsUsage] = useState<IngredientWithCount[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isGlobal, setIsGlobal] = useState(false);

    const update = useCallback(() => {
        Api.getStats(isGlobal ? undefined : session?.key).then((data) => {
            setPans(data.pans);
            setIngredientsRating(data.ingredients_top_rated);
            setIngredientsUsage(data.ingredients_most_used);
        }).catch((error) => {
            console.error("Failed to load stats:", error);
        });
        
        // Load leaderboard (always global)
        Api.getLeaderboard().then((data) => {
            setLeaderboard(data);
        }).catch((error) => {
            console.error("Failed to load leaderboard:", error);
        });
    }, [isGlobal, session?.key]);

    useEffect(() => {
        update();
    }, [update]);

    useInterval(() => {
        update();
    }, 5000);

    // Limit items for other sections, but show all pans
    const limitedIngredientsRating = ingredientsRating.slice(0, 5);
    const limitedIngredientsUsage = ingredientsUsage.slice(0, 5);
    const limitedLeaderboard = leaderboard.slice(0, 8);

    return (
        <div style={{margin: "8px 4px"}}>
            <Row style={{marginBottom: '12px'}}>
                <Col span={24}>
                    <Switch
                        checked={isGlobal}
                        onChange={(checked) => {
                            setIsGlobal(checked);
                        }}
                        checkedChildren="Global"
                        unCheckedChildren="Session"
                    />
                    <span style={{marginLeft: '8px', color: '#8c8c8c', fontSize: '0.9rem'}}>
                        {isGlobal ? "Global" : "Session"}
                    </span>
                </Col>
            </Row>
            <Row gutter={12}>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card 
                        bodyStyle={{padding: '10px', display: 'flex', flexDirection: 'column'}}
                    >
                        <Title level={5} style={{marginBottom: '10px', fontSize: '0.9rem', fontWeight: 500, color: '#595959'}}>
                            Pans
                        </Title>
                        <List
                            dataSource={pans}
                            renderItem={(pan: Pan) => <PanListItem key={`pan-${pan.id}`} pan={pan}/>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card 
                        bodyStyle={{padding: '10px', maxHeight: '600px', overflow: 'auto', display: 'flex', flexDirection: 'column'}}
                    >
                        <Title level={5} style={{marginBottom: '10px', fontSize: '0.9rem', fontWeight: 500, color: '#595959'}}>
                            {t("ingredient.ingredients")} <Text type="secondary" style={{fontSize: '0.8rem', fontWeight: 400}}>({t("dashboard.rating")})</Text>
                        </Title>
                        <List
                            dataSource={limitedIngredientsRating}
                            renderItem={(ingredient) => (
                                <IngredientListGroupItemRating
                                    key={`ingredient-${ingredient.id}`}
                                    ingredient={ingredient}
                                />
                            )}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card 
                        bodyStyle={{padding: '10px', maxHeight: '600px', overflow: 'auto', display: 'flex', flexDirection: 'column'}}
                    >
                        <Title level={5} style={{marginBottom: '10px', fontSize: '0.9rem', fontWeight: 500, color: '#595959'}}>
                            {t("ingredient.ingredients")} <Text type="secondary" style={{fontSize: '0.8rem', fontWeight: 400}}>({t("dashboard.usage")})</Text>
                        </Title>
                        <List
                            dataSource={limitedIngredientsUsage}
                            renderItem={(ingredient) => (
                                <IngredientListGroupItemCount
                                    key={`ingredient-${ingredient.id}`}
                                    ingredient={ingredient}
                                />
                            )}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card 
                        bodyStyle={{padding: '10px', maxHeight: '600px', overflow: 'auto', display: 'flex', flexDirection: 'column'}}
                    >
                        <Title level={5} style={{marginBottom: '10px', fontSize: '0.9rem', fontWeight: 500, color: '#595959'}}>
                            {t("dashboard.leaderboard") || "Leaderboard"}
                        </Title>
                        <List
                            dataSource={limitedLeaderboard}
                            renderItem={(entry) => (
                                <LeaderboardListItem
                                    key={`leaderboard-${entry.user_id}`}
                                    entry={entry}
                                    currentUserId={currentUser?.id}
                                />
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
