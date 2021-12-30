import React from "react";
import {Button, Col, Form, ListGroup, Row, ToggleButton} from "react-bootstrap";
import {AddIngredient} from "./addIngredient";
import {GenerateView} from "./generateView";
import {Api} from "../lib/api";

export class MainScreen extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            toolbar: 0,
        };
    }

    onToolbarClicked = (id) => {
        if (this.state.toolbar === id)
            this.setState({toolbar: 0})
        else
            this.setState({toolbar: id})
    };

    onGeneration = (numIngredient, numSauce) => {
        this.setState({toolbar: 0})
        Api.generate(this.props.session, numIngredient, numSauce).then((data) => {
            console.log(data);
        });
    };

    getTool() {
        switch (this.state.toolbar) {
            case 1:
                return (<GenerateView ingredients={this.props.ingredients} onGeneration={this.onGeneration}/>);
            case 2:
                break;
            case 3:
                return (<AddIngredient />);
        }
    }

    renderIngredients(type) {
        let ingredients = this.props.ingredients
            .filter(ingredient => ingredient.type === type)
            .map((ingredient) =>
            <ListGroup.Item>{ingredient.name}</ListGroup.Item>
        );

        return (
            <ListGroup key={this.props.ingredients} className="mb-2">
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
                        {this.renderIngredients(1)}
                    </Col>
                    <Col sm>
                        <h1>Saucen</h1>
                        {this.renderIngredients(2)}
                    </Col>
                </Row>
                <Row className="mx-0 mt-2">
                    <Col sm>
                        <ToggleButton type="radio" checked={this.state.toolbar === 1} variant="outline-primary" onClick={() => this.onToolbarClicked(1)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                                 className="bi bi-shuffle" viewBox="0 0 16 16">
                                <path fill-rule="evenodd"
                                      d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"/>
                                <path
                                    d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z"/>
                            </svg>
                        </ToggleButton>
                        <ToggleButton type="radio" checked={this.state.toolbar === 2} variant="outline-primary" className="mx-2" onClick={() => this.onToolbarClicked(2)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                                 className="bi bi-gear-fill" viewBox="0 0 16 16">
                                <path
                                    d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
                            </svg>
                        </ToggleButton>
                        <ToggleButton type="radio" checked={this.state.toolbar === 3} variant="outline-primary" onClick={() => this.onToolbarClicked(3)}>
                            +
                        </ToggleButton>
                        <div className="mt-3">
                            {this.getTool()}
                        </div>
                    </Col>
                </Row>
            </div>
        );
    }
}
