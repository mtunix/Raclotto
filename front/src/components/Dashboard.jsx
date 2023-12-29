import {useSession} from "../lib/useSession";
import {useEffect, useState} from "react";
import {Api} from "../lib/api";
import {Accordion, Card, Col, ListGroup, Row} from "react-bootstrap";
import {useInterval} from "../lib/useInterval";
import {IngredientListGroupItem} from "./MainScreen";
import {PanAccordionItem} from "./historyView";

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
            <Col>
                <h4>Pans</h4>
                <Accordion>

                    {pans.map((pan, i) => <PanAccordionItem key={`pan-${pan.id}`} pan={pan} index={i}/>)}
                </Accordion>
            </Col>
            <Col>
                <h4>Zutaten (Rating)</h4>
                <ListGroup className="mb-2">
                    {ingredientsRating.map((ingredient) => <IngredientListGroupItem key={`ingredient-${ingredient.id}`}
                                                                                    available={true}
                                                                                    ingredient={ingredient}/>)}
                </ListGroup>
            </Col>
            <Col>
                <h4>Zutaten (Usage)</h4>
                <ListGroup className="mb-2">
                    {ingredientsUsage.map((ingredient) => <IngredientListGroupItem key={`ingredient-${ingredient.id}`}
                                                                                   available={true}
                                                                                   ingredient={ingredient}/>)}
                </ListGroup>
            </Col>
        </Row>
    );
}
