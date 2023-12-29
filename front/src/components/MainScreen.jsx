import React, {useCallback} from "react";
import {Accordion, Button, Card, Col, ListGroup, Row} from "react-bootstrap";
import {Api} from "../lib/api";
import {Toolbar} from "./toolbar";
import {VectorGraphics} from "../lib/vectorGraphics";
import {useSession} from "../lib/useSession";
import {useSearchParams} from "react-router-dom";

export function IngredientListGroupItem(props) {
    let variant = props.ingredient.type === 1 ? "primary" : "secondary";

    const getTags = (ingredient) => {
        return (<div>
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
        </div>);
    }

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
    )
}

export function MainScreen(props) {
    const [user, setUser] = React.useState("");
    const [toolbar, setToolbar] = React.useState(0);
    const [ingredients, setIngredients] = React.useState([]);
    const {session} = useSession();
    const [searchParams] = useSearchParams();
    const popout = searchParams.get("popout") === "true";

    React.useEffect(() => {
        Api.get("ingredients", session).then((data) => {
            setIngredients(data)
        });
    }, [session]);

    const onAdd = () => {
        Api.get("ingredients", session).then((data) => {
            setIngredients(data);
        });
    };

    const onDelete = (ingredient) => {
        Api.delete(session, ingredient).then((data) => {
            Api.get("ingredients", session).then((data) => {
                setIngredients(data);
            });
        });
    };

    const onRefill = (ingredient) => {
        Api.refill(session, ingredient).then((data) => {
            Api.get("ingredients", session).then((data) => {
                setIngredients(data);
            });
        });
    };

    const renderIngredients = useCallback((type) => {
        let typeStr = type === 1 ? "Zutaten" : "Saucen";

        let available = ingredients
            .filter(ingredient => ingredient.type === type && ingredient.available)
            .map((ingredient) => {
                    return (
                        <IngredientListGroupItem key={`ingredient-${ingredient.id}`}
                                                 ingredient={ingredient}
                                                 onClick={() => onDelete(ingredient)}
                                                 available={true}/>
                    );
                }
            );

        let unavailable = ingredients
            .filter(ingredient => ingredient.type === type && !ingredient.available)
            .map((ingredient) => {
                    return (
                        <IngredientListGroupItem key={`ingredient-${ingredient.id}`}
                                                 ingredient={ingredient}
                                                 onClick={() => onRefill(ingredient)}
                                                 available={false}/>
                    );
                }
            );

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
    }, [ingredients]);

    return (
        <div className="card-columns" style={{margin: "10px"}}>
            <Row className="mx-0 mt-2 ">
                <Col sm>
                    <Toolbar
                        ingredients={ingredients}
                        session={session}
                        sessionClosed={props.onSessionClosed}
                        onAdd={onAdd}
                    />
                </Col>
            </Row>
            {!popout &&
                <Row className="mx-0">
                    <Col className="mb-2" sm>
                        {renderIngredients(1)}
                    </Col>
                    <Col className="mb-2" sm>
                        {renderIngredients(2)}
                    </Col>
                </Row>
            }
        </div>
    );
}
