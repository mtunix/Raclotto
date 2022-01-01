import React from "react";
import {Col, ListGroup, Row, ToggleButton} from "react-bootstrap";
import {AddIngredient} from "./addIngredient";
import {GenerateView} from "./generateView";
import {Api} from "../lib/api";
import {HistoryView} from "./historyView";
import {SettingsView} from "./settingsView";
import {AchievementView} from "./achievementView";
import {ServerSettingsView} from "./serverSettingsView";
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

    onToolbarClicked = (id) => {
        if (this.state.toolbar === id)
            this.setState({toolbar: 0})
        else
            this.setState({toolbar: id})
    };

    onGeneration = (numIngredient, numSauce) => {
        // this.setState({toolbar: 0})
    };

    onUserChanged = (name) => {
        this.setState({
            user: name
        });
    };

    getTool() {
        switch (this.state.toolbar) {
            case 1:
                return (<GenerateView session={this.props.session}
                                      ingredients={this.state.ingredients}
                                      onGeneration={this.onGeneration}/>);
            case 2:
                return (<SettingsView onUserChanged={this.onUserChanged}/>);
            case 3:
                return (<HistoryView session={this.props.session} />);
            case 4:
                return (<AddIngredient session={this.props.session}
                                       onAdd={this.onAdd} />);
            case 5:
                return (<AchievementView />);
            case 6:
                return (<ServerSettingsView session={this.props.session}
                                            onSessionClosed={this.props.onSessionClosed}/>);
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
                        <ToggleButton type="radio"
                                      checked={this.state.toolbar === 1}
                                      variant="outline-primary"
                                      onClick={() => this.onToolbarClicked(1)}>
                            {VectorGraphics.SHUFFLE}
                        </ToggleButton>
                        <ToggleButton type="radio"
                                      checked={this.state.toolbar === 2}
                                      variant="outline-primary"
                                      className="mx-2"
                                      onClick={() => this.onToolbarClicked(2)}>
                            {VectorGraphics.SETTINGS_CLIENT}
                        </ToggleButton>
                        <ToggleButton type="radio"
                                      checked={this.state.toolbar === 3}
                                      variant="outline-primary"
                                      onClick={() => this.onToolbarClicked(3)}>
                            {VectorGraphics.HISTORY}
                        </ToggleButton>
                        <ToggleButton type="radio"
                                      checked={this.state.toolbar === 4}
                                      variant="outline-primary"
                                      className="mx-2"
                                      onClick={() => this.onToolbarClicked(4)}>
                            +
                        </ToggleButton>
                        <ToggleButton type="radio"
                                      checked={this.state.toolbar === 5}
                                      variant="outline-primary"
                                      onClick={() => this.onToolbarClicked(5)}>
                            {VectorGraphics.ACHIEVEMENTS}
                        </ToggleButton>
                        <ToggleButton type="radio"
                                      checked={this.state.toolbar === 6}
                                      className="mx-2"
                                      variant="outline-primary"
                                      onClick={() => this.onToolbarClicked(6)}>
                            {VectorGraphics.SETTINGS_SERVER}
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
