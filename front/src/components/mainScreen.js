import React from "react";
import {Accordion, Button, Card, Col, ListGroup, Row} from "react-bootstrap";
import {Api} from "../lib/api";
import {Toolbar} from "./toolbar";

export class MainScreen extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            toolbar: 0,
            user: "",
            ingredients: []
        };
    }

    onAdd = () => {
        Api.get("ingredients", this.props.session).then((data) => {
            this.setState({ingredients: data})
        });
    };

    componentDidMount() {
        Api.get("ingredients", this.props.session).then((data) => {
            this.setState({ingredients: data})
        });
    }

    renderIngredients(type) {
        let variant = type === 1 ? "primary" : "secondary";
        let typeStr = type === 1 ? "Zutaten" : "Saucen";
        let ingredients = this.state.ingredients
            .filter(ingredient => ingredient.type === type)
            .map((ingredient) => {
                    return (
                        <ListGroup.Item variant={variant}>
                            <span style={{fontSize: "1rem"}}>{ingredient.name}</span>
                            <div>
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
                            </div>
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
