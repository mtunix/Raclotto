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
        };
    }

    componentDidMount() {
        Api.get("pans", this.props.session).then((data) => {
            this.setState({pans: data.reverse()});
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
                    hidden={!ingredient.vegan} className={"mb-1"}>Vegan</Button>{' '}
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.vegetarian} className={"mb-1"}>Vegetarisch</Button>{' '}
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.histamine} className={"mb-1"}>Histamin</Button>{' '}
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.gluten} className={"mb-1"}>Gluten</Button>{' '}
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.lactose} className={"mb-1"}>Lactose</Button>{' '}
            <Button variant="secondary" style={{fontSize: "0.7rem"}} size="sm"
                    hidden={!ingredient.fructose} className={"mb-1"}>Fructose</Button>{' '}
        </div>);
    }

    render() {
        let getVariant = (type) => type === 1 ? "primary" : "secondary";
        let pans = this.state.pans.map((pan, i) =>
            <Accordion.Item eventKey={i}>
                <Accordion.Header>
                    <span style={{fontWeight: 800}}>{pan.name}</span>
                    <span style={{fontStyle: "italic", fontSize: "smaller"}} className="px-3">verspeist von {pan.user}</span>
                    {this.getRating(pan.id, pan.rating)}
                </Accordion.Header>
                <Accordion.Body>
                    <Row>
                        <Col sm>
                            <h5>Zutaten</h5>
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
                            <h5>Saucen</h5>
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
                    <span style={{fontStyle: "italic", fontSize: "smaller"}} className="px-3">verspeist um {pan.timestamp}</span>
                </Accordion.Body>
            </Accordion.Item>
        );

        return (
            <Accordion>
                {pans}
            </Accordion>
        );
    }
}