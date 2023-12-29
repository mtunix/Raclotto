import React, {useState} from "react";
import {Api} from "../lib/api";
import {Accordion, Button, Col, ListGroup, Row} from "react-bootstrap";
import Rating from "react-rating";
import {VectorGraphics} from "../lib/vectorGraphics";
import {useSession} from "../lib/useSession";

export function PanAccordionItem(props) {
    const {session} = useSession();
    const [rating, setRating] = useState(props.pan.rating);
    const getVariant = (type) => type === 1 ? "primary" : "secondary";

    const onRating = (id, rating) => {
        Api.rate(
            session,
            id,
            rating
        ).then((data) => {
            setRating(rating)
        });
    };

    const getRating = (id, initial, readonly) => {
        return (<Rating
            className="mb-2"
            initialRating={initial}
            onClick={(rating) => onRating(id, rating)}
            emptySymbol={VectorGraphics.RATING_EMPTY}
            fullSymbol={VectorGraphics.RATING_FULL}
            readonly={readonly}
        />);
    }

    const getTags = (ingredient) => {
        return (<div>
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.meat} className={"mb-1"} disabled={true}>Fleisch</Button>{' '}
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.vegan} className={"mb-1"} disabled={true}>Vegan</Button>{' '}
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.vegetarian} className={"mb-1"} disabled={true}>Vegetarisch</Button>{' '}
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.histamine} className={"mb-1"} disabled={true}>Histamin</Button>{' '}
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.gluten} className={"mb-1"} disabled={true}>Gluten</Button>{' '}
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.lactose} className={"mb-1"} disabled={true}>Lactose</Button>{' '}
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.fructose} className={"mb-1"} disabled={true}>Fructose</Button>{' '}
        </div>);
    }

    return (
        <Accordion.Item eventKey={props.index}>
            <Accordion.Header>
                <div className={"w-100"}>
                    <span style={{fontWeight: 800}}>{props.pan.name}</span>
                    <br/>
                    <span style={{fontStyle: "italic", fontSize: "smaller"}}>verspeist von {props.pan.user}</span>
                </div>
                <div className={"w-25 mx-2"} style={{textAlign: "right"}}>
                    <div className={"d-none d-sm-block"}>
                        {getRating(props.pan.id, rating, true)}
                    </div>
                </div>
            </Accordion.Header>
            <Accordion.Body>
                <Row>
                    <Col sm>
                        <span style={{fontWeight: 800}}>Zutaten</span>
                        <ListGroup key={props.pan.ingredients} className="mb-2">
                            {props.pan.ingredients.filter(ingredient => ingredient.type === 1).map((ingredient) =>
                                <ListGroup.Item variant={getVariant(ingredient.type)}>
                                    <Row>
                                        <Col>
                                            <span style={{fontSize: "1rem"}}>{ingredient.name}</span>
                                        </Col>
                                    </Row>
                                    {getTags(ingredient)}
                                </ListGroup.Item>
                            )}
                        </ListGroup>
                    </Col>
                    <Col sm>
                        <span style={{fontWeight: 800}}>Saucen</span>
                        <ListGroup key={props.pan.ingredients} className="mb-2">
                            {props.pan.ingredients.filter(ingredient => ingredient.type === 2).map((ingredient) =>
                                <ListGroup.Item variant={getVariant(ingredient.type)}>
                                    <Row>
                                        <Col>
                                            <span style={{fontSize: "1rem"}}>{ingredient.name}</span>
                                        </Col>
                                    </Row>
                                    {getTags(ingredient)}
                                </ListGroup.Item>
                            )}
                        </ListGroup>
                    </Col>
                </Row>
                <Row>
                    <Col>

                    </Col>
                </Row>
                <div className="alert alert-secondary mt-2" role="alert">
                    <Row>
                        <Col>
                            <span style={{fontStyle: "italic", fontSize: "smaller"}}>verspeist um {props.pan.timestamp}</span>
                        </Col>
                        <Col hidden={false} style={{textAlign: "right"}}>
                            {getRating(props.pan.id, rating, false)}
                        </Col>
                    </Row>
                </div>
                <Row>
                    <Col className={"d-grid"}>
                        <button type="button" className="btn btn-primary">Ich will das auch</button>
                    </Col>
                </Row>
            </Accordion.Body>
        </Accordion.Item>
    )
}

export class HistoryView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            pans: [],
            waiting: true
        };
    }

    componentDidMount() {
        Api.get("pans", this.props.session).then((data) => {
            this.setState({
                pans: data.reverse(),
                waiting: false
            });
        });
    }

    render() {
        let pans = this.state.pans.map((pan, i) =>
            <PanAccordionItem pan={pan} key={i} index={i}/>
        );

        return (
            <div>
                <div hidden={!this.state.waiting}>
                    <div className="d-flex justify-content-center">
                        <div className="spinner-border text-secondary" role="status">
                        </div>
                    </div>
                </div>
                <Accordion hidden={this.state.waiting}>
                    {pans}
                </Accordion>
            </div>
        );
    }
}