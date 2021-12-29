import React from "react";
import {Button, Col, Form, ListGroup, Row} from "react-bootstrap";
import {Api} from "../lib/api";
import {AddIngredient} from "./addIngredient";

export class MainScreen extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            addIngredientView: null,
        };
    }

    onAddIngredientClicked = (event) => {
        if (this.state.addIngredientView == null) {
            this.setState({
                addIngredientView: <AddIngredient />
            });
        } else {
            this.setState({
                addIngredientView: null
            });
        }
    };

    renderIngredients() {
        let ingredients = this.props.ingredients.map((ingredient) =>
            <ListGroup.Item>{ingredient.name}</ListGroup.Item>
        );

        return (
            <ListGroup className="mb-2">
                {ingredients}
            </ListGroup>
        );
    }

    render() {
        return (
            <div className="card-columns" style={{margin: "10px"}}>
                <Row className="mx-0">
                    <Col sm>
                        <h1>Zutaten</h1>
                        {this.renderIngredients()}
                    </Col>
                    <Col sm>
                        <h1>Saucen</h1>
                        {this.renderIngredients()}
                    </Col>
                </Row>
                <Row className="mx-0 mt-3">
                    <Col sm>
                        {this.state.addIngredientView}
                        <Button onClick={this.onAddIngredientClicked}>+</Button>
                    </Col>
                </Row>
            </div>
        );
    }
}
