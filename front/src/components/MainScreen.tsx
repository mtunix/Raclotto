import React, {useCallback, useEffect, useState} from "react";
import {Accordion, Button, Col, ListGroup, Row} from "react-bootstrap";
import {Api} from "../lib/api";
import {Toolbar} from "./Toolbar";
import {VectorGraphics} from "../lib/vectorGraphics";
import {useAppStore} from "../AppSlice";
import {useSearchParams} from "react-router-dom";
import {Ingredient, IngredientType} from "../model/ingredient";

interface PrepType {
    id: number;
    name: string;
}

interface IngredientListGroupItemProps {
    ingredient: Ingredient;
    available: boolean;
    onClick?: () => void;
}

function IngredientListGroupItem(props: IngredientListGroupItemProps) {
    let variant = props.ingredient.type === IngredientType.FILL ? "primary" : "secondary";

    const getTags = (ingredient: Ingredient) => {
        return (
            <div>
                <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                        hidden={!ingredient.meat} className={"mb-1"} disabled>Fleisch</Button>{' '}
                <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                        hidden={!ingredient.vegan} className={"mb-1"} disabled>Vegan</Button>{' '}
                <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                        hidden={!ingredient.vegetarian} className={"mb-1"} disabled>Vegetarisch</Button>{' '}
                <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                        hidden={!ingredient.histamine} className={"mb-1"} disabled>Histamin</Button>{' '}
                <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                        hidden={!ingredient.gluten} className={"mb-1"} disabled>Gluten</Button>{' '}
                <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                        hidden={!ingredient.lactose} className={"mb-1"} disabled>Lactose</Button>{' '}
                <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                        hidden={!ingredient.fructose} className={"mb-1"} disabled>Fructose</Button>{' '}
            </div>
        );
    };

    return (
        <ListGroup.Item variant={props.available ? variant : "danger"}>
            <Row className={"mb-1"}>
                <Col>
                    <span style={{fontSize: "1rem"}}>{props.ingredient.name}</span>
                </Col>
                <Col style={{textAlign: "right"}}>
                    {
                        props.onClick &&
                        <Button variant={"danger"}
                                size={"sm"}
                                style={{fontSize: "0.7rem"}}
                                onClick={props.onClick}>
                            {props.available ? VectorGraphics.REMOVE : VectorGraphics.REPEAT}
                        </Button>
                    }
                </Col>
            </Row>
            {getTags(props.ingredient)}
        </ListGroup.Item>
    );
}

type MainScreenProps = {
    onSessionClosed?: () => void;
};

export function MainScreen(props: MainScreenProps) {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [prepTypes, setPrepTypes] = useState<PrepType[]>([]);
    const session = useAppStore((state) => state.session);
    const [searchParams] = useSearchParams();
    const popout = searchParams.get("popout") === "true";

    const sessionKey = session?.key || "";

    useEffect(() => {
        if (sessionKey) {
            Api.get("preparation_type", sessionKey).then((data: any) => {
                setPrepTypes(data || []);
            }).catch(() => {
                // preparation_type endpoint might not exist
                setPrepTypes([]);
            });
        }
    }, [sessionKey]);

    useEffect(() => {
        if (sessionKey) {
            Api.get("ingredients", sessionKey).then((data: any) => {
                setIngredients(data || []);
            });
        }
    }, [sessionKey]);

    const onAdd = () => {
        if (sessionKey) {
            Api.get("ingredients", sessionKey).then((data: any) => {
                setIngredients(data || []);
            });
        }
    };

    const onDelete = useCallback((ingredient: Ingredient) => {
        if (sessionKey) {
            Api.delete(sessionKey, ingredient).then(() => {
                Api.get("ingredients", sessionKey).then((data: any) => {
                    setIngredients(data || []);
                });
            });
        }
    }, [sessionKey]);

    const onPrepTypeDelete = useCallback((type: PrepType) => {
        if (sessionKey) {
            Api.delete(sessionKey, type).then(() => {
                // Refresh prep types if needed
            });
        }
    }, [sessionKey]);

    const onRefill = useCallback((ingredient: Ingredient) => {
        if (sessionKey) {
            Api.refill(sessionKey, ingredient).then(() => {
                Api.get("ingredients", sessionKey).then((data: any) => {
                    setIngredients(data || []);
                });
            });
        }
    }, [sessionKey]);

    const renderPrepTypes = useCallback(() => {
        const r = prepTypes.map((x) => {
            return (
                <ListGroup.Item key={`preptype-${x.id}`} variant="primary">
                    <Row className={"mb-1"}>
                        <Col>
                            <span style={{fontSize: "1rem"}}>{x.name}</span>
                        </Col>
                        <Col style={{textAlign: "right"}}>
                            <Button variant={"danger"}
                                    size={"sm"}
                                    style={{fontSize: "0.7rem"}}
                                    onClick={() => onPrepTypeDelete(x)}>
                                {VectorGraphics.REMOVE}
                            </Button>
                        </Col>
                    </Row>
                </ListGroup.Item>
            );
        });

        return (
            <Accordion alwaysOpen defaultActiveKey={`preparation-type`}>
                <Accordion.Item eventKey={`preparation-type`}>
                    <Accordion.Header>
                        <span style={{fontWeight: 800}}>Zubereitungsarten</span>
                    </Accordion.Header>
                    <Accordion.Body>
                        <ListGroup className="mb-2">
                            {r}
                        </ListGroup>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        );
    }, [prepTypes, onPrepTypeDelete]);

    const renderIngredients = useCallback((type: IngredientType) => {
        let typeStr = type === IngredientType.FILL ? "Zutaten" : "Saucen";

        let available = ingredients
            .filter(ingredient => ingredient.type === type && ingredient.available)
            .map((ingredient) => {
                return (
                    <IngredientListGroupItem key={`ingredient-${ingredient.id}`}
                                             ingredient={ingredient}
                                             onClick={() => onDelete(ingredient)}
                                             available={true}/>
                );
            });

        let unavailable = ingredients
            .filter(ingredient => ingredient.type === type && !ingredient.available)
            .map((ingredient) => {
                return (
                    <IngredientListGroupItem key={`ingredient-${ingredient.id}`}
                                             ingredient={ingredient}
                                             onClick={() => onRefill(ingredient)}
                                             available={false}/>
                );
            });

        return (
            <Accordion alwaysOpen defaultActiveKey={`ingredients-${type}`}>
                <Accordion.Item eventKey={`ingredients-${type}`}>
                    <Accordion.Header>
                        <span style={{fontWeight: 800}}>{typeStr}</span>
                    </Accordion.Header>
                    <Accordion.Body>
                        <ListGroup className="mb-2">
                            {available}
                            {unavailable}
                        </ListGroup>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        );
    }, [ingredients, onDelete, onRefill]);

    if (!session) {
        return <div>No session selected</div>;
    }

    return (
        <div className="card-columns" style={{margin: "10px"}}>
            <Row className="mx-0 mt-2 ">
                <Col sm>
                    <Toolbar
                        ingredients={ingredients}
                        session={sessionKey}
                        sessionClosed={props.onSessionClosed || (() => {})}
                        onAdd={onAdd}
                    />
                </Col>
            </Row>
            {!popout &&
                <Row className="mx-0">
                    <Col className="mb-2" sm>
                        {renderIngredients(IngredientType.FILL)}
                    </Col>
                    <Col className="mb-2" sm>
                        {renderIngredients(IngredientType.SAUCE)}
                    </Col>
                    <Col className="mb-2" sm>
                        {renderPrepTypes()}
                    </Col>
                </Row>
            }
        </div>
    );
}
