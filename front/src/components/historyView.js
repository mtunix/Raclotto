import React from "react";
import {Api} from "../lib/api";
import {Accordion, Button, Col, ListGroup, Row} from "react-bootstrap";
import Rating from "react-rating";
import {VectorGraphics} from "../lib/vectorGraphics";

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
    getRating(id, initial) {
        return (<div className={"d-none d-sm-block"}><Rating
            className="mb-2"
            initialRating={initial}
            onClick={(rating) => this.onRating(id, rating)}
            emptySymbol={VectorGraphics.RATING_EMPTY}
            fullSymbol={VectorGraphics.RATING_FULL}
            readonly={true}
        /></div> );
    }

    onRating = (id, rating) => {
        Api.rate(
            this.props.session,
            id,
            rating
        ).then((data) => {
            // todo
            console.log(data);
        });
    };

    getTags(ingredient) {
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

    render() {
        let getVariant = (type) => type === 1 ? "primary" : "secondary";
        let pans = this.state.pans.map((pan, i) =>
            <Accordion.Item eventKey={i}>
                <Accordion.Header>
                    <div className={"w-100"}>
                        <span style={{fontWeight: 800}}>{pan.name}</span>
                        <br />
                        <span style={{fontStyle: "italic", fontSize: "smaller"}}>verspeist von {pan.user}</span>
                    </div>
                    <div className={"w-25 mx-2"} style={{textAlign: "right"}}>
                        {this.getRating(pan.id, pan.rating)}
                    </div>
                </Accordion.Header>
                <Accordion.Body>
                    <Row>
                        <Col sm>
                            <span style={{fontWeight: 800}}>Zutaten</span>
                            <ListGroup key={this.props.ingredients} className="mb-2">
                                {pan.ingredients.filter(ingredient => ingredient.type === 1).map((ingredient) =>
                                    <ListGroup.Item variant={getVariant(ingredient.type)}>
                                        <Row>
                                            <Col>
                                                <span style={{fontSize: "1rem"}}>{ingredient.name}</span>
                                            </Col>
                                        </Row>
                                        {this.getTags(ingredient)}
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </Col>
                        <Col sm>
                            <span style={{fontWeight: 800}}>Saucen</span>
                            <ListGroup key={this.props.ingredients} className="mb-2">
                                {pan.ingredients.filter(ingredient => ingredient.type === 2).map((ingredient) =>
                                    <ListGroup.Item variant={getVariant(ingredient.type)}>
                                        <Row>
                                            <Col>
                                                <span style={{fontSize: "1rem"}}>{ingredient.name}</span>
                                            </Col>
                                        </Row>
                                        {this.getTags(ingredient)}
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </Col>
                    </Row>
                    <span style={{fontStyle: "italic", fontSize: "smaller"}}>verspeist um {pan.timestamp}</span>
                </Accordion.Body>
            </Accordion.Item>
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