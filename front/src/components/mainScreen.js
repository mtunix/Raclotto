import React from "react";
import {Button, Col, Form, ListGroup, Row, ToggleButton} from "react-bootstrap";
import {AddIngredient} from "./addIngredient";
import {GenerateView} from "./generateView";
import {Api} from "../lib/api";
import {HistoryView} from "./historyView";
import {SettingsView} from "./settingsView";
import {AchievementView} from "./achievementView";
import {ServerSettingsView} from "./serverSettingsView";

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

    onToolbarClicked = (id) => {
        if (this.state.toolbar === id)
            this.setState({toolbar: 0})
        else
            this.setState({toolbar: id})
    };

    onGeneration = (numIngredient, numSauce) => {
        // this.setState({toolbar: 0})
    };

    getTool() {
        switch (this.state.toolbar) {
            case 1:
                return (<GenerateView session={this.props.session} ingredients={this.state.ingredients} onGeneration={this.onGeneration}/>);
            case 2:
                return (<SettingsView onUserChanged={this.onUserChanged}/>)
            case 3:
                return (<HistoryView session={this.props.session} />);
            case 4:
                return (<AddIngredient session={this.props.session} onAdd={this.onAdd} />);
            case 5:
                return (<AchievementView />)
            case 6:
                return (<ServerSettingsView session={this.props.session} />)
        }
    }

    onAdd = () => {
        Api.get("ingredients", this.props.session).then((data) => {
            this.setState({ingredients: data})
        });
    };

    renderIngredients(type) {
        let variant = type === 1 ? "primary" : "secondary";
        let ingredients = this.state.ingredients
            .filter(ingredient => ingredient.type === type)
            .map((ingredient) =>
            <ListGroup.Item variant={variant}>{ingredient.name}</ListGroup.Item>
        );

        return (
            <ListGroup key={this.state.ingredients} className="mb-2">
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                                 className="bi bi-clock-history" viewBox="0 0 16 16">
                                <path
                                    d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z"/>
                                <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z"/>
                                <path
                                    d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </ToggleButton>
                        <ToggleButton type="radio" checked={this.state.toolbar === 4} variant="outline-primary" className="mx-2" onClick={() => this.onToolbarClicked(4)}>
                            +
                        </ToggleButton>
                        <ToggleButton type="radio" checked={this.state.toolbar === 5} variant="outline-primary" onClick={() => this.onToolbarClicked(5)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                                 className="bi bi-journal-check" viewBox="0 0 16 16">
                                <path fill-rule="evenodd"
                                      d="M10.854 6.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 8.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
                                <path
                                    d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"/>
                                <path
                                    d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z"/>
                            </svg>
                        </ToggleButton>
                        <ToggleButton type="radio" checked={this.state.toolbar === 6} className="mx-2" variant="outline-primary" onClick={() => this.onToolbarClicked(6)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                                 className="bi bi-hdd-network" viewBox="0 0 16 16">
                                <path d="M4.5 5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zM3 4.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
                                <path
                                    d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H8.5v3a1.5 1.5 0 0 1 1.5 1.5h5.5a.5.5 0 0 1 0 1H10A1.5 1.5 0 0 1 8.5 14h-1A1.5 1.5 0 0 1 6 12.5H.5a.5.5 0 0 1 0-1H6A1.5 1.5 0 0 1 7.5 10V7H2a2 2 0 0 1-2-2V4zm1 0v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1zm6 7.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5z"/>
                            </svg>
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
