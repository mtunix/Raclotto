import {useSession} from "../lib/useSession";
import React, {useEffect, useState} from "react";
import {Api} from "../lib/api";
import {Accordion, Badge, Button, Card, Col, ListGroup, Row} from "react-bootstrap";
import {useInterval} from "../lib/useInterval";
import {IngredientListGroupItem} from "./MainScreen";
import {PanAccordionItem} from "./historyView";
import {VectorGraphics} from "../lib/vectorGraphics";
import Rating from "react-rating";

export function RatingViewer(props) {
    return (<Rating
        className="mb-2"
        initialRating={props.rating}
        fractions={2}
        emptySymbol={VectorGraphics.RATING_EMPTY}
        fullSymbol={VectorGraphics.RATING_FULL}
        readonly
    />);
}

export function IngredientListGroupItemRating(props) {
    let variant = props.ingredient.type === 1 ? "primary" : "secondary";

    return (
        <ListGroup.Item variant={variant}>
            <Row className={"mb-1"}>
                <Col>
                    <span style={{fontSize: "1rem"}}>{props.ingredient.name}</span>
                </Col>
                <Col style={{textAlign: "right"}}>
                    <RatingViewer rating={props.ingredient.avg_rating}/>
                </Col>
            </Row>
        </ListGroup.Item>
    )
}

export function IngredientListGroupItemCount(props) {
    let variant = props.ingredient.type === 1 ? "primary" : "secondary";

    return (
        <ListGroup.Item variant={variant}>
            <Row className={"mb-1"}>
                <Col>
                    <span style={{fontSize: "1rem"}}>{props.ingredient.name}</span>
                </Col>
                <Col style={{textAlign: "right"}}>
                    <span className="fw-bold" style={{fontSize: "1rem"}}>{props.ingredient.pan_count}</span>
                </Col>
            </Row>
        </ListGroup.Item>
    )
}

export function PanListItem(props) {
    return (
        <ListGroup.Item variant="secondary" eventKey={props.index}>
            <Row>
                <div className={"w-100"}>
                    <span style={{fontWeight: 800}}>{props.pan.name} </span>
                    <span style={{fontStyle: "italic", fontSize: "smaller"}}>verspeist von {props.pan.user}</span>
                    <div style={{
                        float: "right",
                    }}>
                        <RatingViewer rating={props.pan.rating}/>
                    </div>
                </div>
            </Row>
            <Row>
                <Col sm>
                    {props.pan.ingredients.filter(ingredient => ingredient.type === 1).map((ingredient) =>
                        <Badge bg="primary" className="mr-1 mb-1">
                            <span style={{fontSize: "1rem"}}>{ingredient.name}</span>
                        </Badge>
                    )}
                    {props.pan.ingredients.filter(ingredient => ingredient.type === 2).map((ingredient) =>
                        <Badge bg="secondary" className="mr-1 mb-1">
                            <span style={{fontSize: "1rem"}}>{ingredient.name}</span>
                        </Badge>
                    )}
                </Col>
            </Row>
        </ListGroup.Item>
    )
}

export function Dashboard() {
    const {session} = useSession();
    const [pans, setPans] = useState([]);
    const [ingredientsRating, setIngredientsRating] = useState([]);
    const [ingredientsUsage, setIngredientsUsage] = useState([]);

    useEffect(() => {
        Api.getStats(session).then((data) => {
            setPans(data["pans"]);
            setIngredientsRating(data["ingredients_top_rated"]);
            setIngredientsUsage(data["ingredients_most_used"]);
        });
    }, [session]);

    useInterval(() => {
        Api.getStats(session).then((data) => {
            setPans(data["pans"]);
            setIngredientsRating(data["ingredients_top_rated"]);
            setIngredientsUsage(data["ingredients_most_used"]);
        });
    }, 5000);

    return (
        <Row>
            <Col sm>
                <h4>Pans</h4>
                <ListGroup>
                    {pans.map((pan, i) => <PanListItem key={`pan-${pan.id}`} pan={pan} index={i}/>)}
                </ListGroup>
            </Col>
            <Col sm>
                <h4>Zutaten (Rating)</h4>
                <ListGroup className="mb-2">
                    {ingredientsRating.map((ingredient) => <IngredientListGroupItemRating
                        key={`ingredient-${ingredient.id}`}
                        ingredient={ingredient}/>)}
                </ListGroup>
            </Col>
            <Col sm>
                <h4>Zutaten (Usage)</h4>
                <ListGroup className="mb-2">
                    {ingredientsUsage.map((ingredient) => <IngredientListGroupItemCount
                        key={`ingredient-${ingredient.id}`}
                        ingredient={ingredient}/>)}
                </ListGroup>
            </Col>
        </Row>
    );
}
