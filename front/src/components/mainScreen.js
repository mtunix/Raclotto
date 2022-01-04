import React from "react";
import {Accordion, Button, Card, Col, ListGroup, Row} from "react-bootstrap";
import {Api} from "../lib/api";
import {Toolbar} from "./toolbar";
import {VectorGraphics} from "../lib/vectorGraphics";

export class MainScreen extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            toolbar: 0,
            user: "",
            ingredients: []
        };
    }

    componentDidMount() {
        Api.get("ingredients", this.props.session).then((data) => {
            this.setState({ingredients: data})
        });
    }

    onAdd = () => {
        Api.get("ingredients", this.props.session).then((data) => {
            this.setState({ingredients: data})
        });
    };

    onDelete = (ingredient) => {
        Api.delete(this.props.session, ingredient).then((data) => {
            Api.get("ingredients", this.props.session).then((data) => {
                this.setState({ingredients: data})
            });
        });
    };

    onRefill = (ingredient) => {
        Api.refill(this.props.session, ingredient).then((data) => {
            Api.get("ingredients", this.props.session).then((data) => {
                this.setState({ingredients: data})
            });
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

    renderIngredients(type) {
        let variant = type === 1 ? "primary" : "secondary";
        let typeStr = type === 1 ? "Zutaten" : "Saucen";
        let ingredients = this.state.ingredients
            .filter(ingredient => ingredient.type === type && ingredient.available)
            .map((ingredient) => {
                    return (
                        <ListGroup.Item variant={variant}>
                            <Row>
                                <Col>
                                    <span style={{fontSize: "1rem"}}>{ingredient.name}</span>
                                </Col>
                                <Col style={{textAlign: "right"}}>
                                    <Button variant={"danger"}
                                            size={"sm"}
                                            style={{fontSize: "0.7rem"}}
                                            onClick={() => this.onDelete(ingredient)}>
                                        {VectorGraphics.REMOVE}
                                    </Button>
                                </Col>
                            </Row>
                            {this.getTags(ingredient)}
                        </ListGroup.Item>
                    );
                }
            );

        let unavailable = this.state.ingredients
            .filter(ingredient => ingredient.type === type && !ingredient.available)
            .map((ingredient) => {
                    return (
                        <ListGroup.Item variant={"danger"}>
                            <Row>
                                <Col>
                                    <span style={{fontSize: "1rem"}}>{ingredient.name}</span>
                                </Col>
                                <Col style={{textAlign: "right"}}>
                                    <Button variant={"primary"}
                                            size={"sm"}
                                            style={{fontSize: "0.7rem"}}
                                            onClick={() => this.onRefill(ingredient)}>
                                        {VectorGraphics.REPEAT}
                                    </Button>
                                </Col>
                            </Row>
                            {this.getTags(ingredient)}
                        </ListGroup.Item>
                    );
                }
            );

        return (
            <Accordion>
                <Accordion.Item eventKey={`ingredients-${type}`}>
                    <Accordion.Header>
                        <span style={{fontWeight: 800}}>{typeStr}</span>
                    </Accordion.Header>
                    <Accordion.Body>
                        <ListGroup key={this.state.ingredients} className="mb-2">
                            {ingredients}
                            {unavailable}
                        </ListGroup>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        );
    }

    render() {
        return (
            <div className="card-columns" style={{margin: "10px"}}>
                <Row className="mx-0 mt-2 mb-3">
                    <Col sm>
                        <Toolbar
                            ingredients={this.state.ingredients}
                            session={this.props.session}
                            sessionClosed={this.props.onSessionClosed}
                            onAdd={this.props.onAdd}
                        />
                    </Col>
                </Row>
                <Row className="mx-0">
                    <Col className="mb-2" sm>
                        {this.renderIngredients(1)}
                    </Col>
                    <Col className="mb-2" sm>
                        {this.renderIngredients(2)}
                    </Col>
                </Row>
            </div>
        );
    }
}
