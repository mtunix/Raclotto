import React from "react";
import {Accordion, Card, Col, ListGroup, Row, ToggleButton} from "react-bootstrap";
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
        let title;
        let view;

        switch (this.state.toolbar) {
            case 1:
                view = (<GenerateView session={this.props.session}
                                      ingredients={this.state.ingredients}
                                      onGeneration={this.onGeneration}/>);
                title = "Zusammenstellung wuerfeln"
                break;
            case 2:
                view = (<SettingsView onUserChanged={this.onUserChanged}/>);
                title = "Einstellungen Nutzer"
                break;
            case 3:
                view = (<HistoryView session={this.props.session} />);
                title = "Historie"
                break;
            case 4:
                view = (<AddIngredient session={this.props.session}
                                       onAdd={this.onAdd} />);
                title = "Zutat hinzufuegen"
                break;
            case 5:
                view = (<AchievementView />);
                title = "Errungenschaften"
                break;
            case 6:
                view = (<ServerSettingsView session={this.props.session}
                                            onSessionClosed={this.props.onSessionClosed}/>);
                title = "Einstellungen Session"
                break;
        }

        if (view)
            return (
                <Card>
                    <Card.Header style={{fontWeight: 800}}>{title}</Card.Header>
                    <Card.Body>
                        {/*<Card.Title></Card.Title>*/}
                        <Card.Text>
                            {view}
                        </Card.Text>
                    </Card.Body>
                </Card>
            );
    }

    onAdd = () => {
        Api.get("ingredients", this.props.session).then((data) => {
            this.setState({ingredients: data})
        });
    };

    renderIngredients(type) {
        let variant = type === 1 ? "primary" : "secondary";
        let typeStr = type === 1 ? "Zutaten" : "Saucen";
        let ingredients = this.state.ingredients
            .filter(ingredient => ingredient.type === type)
            .map((ingredient) =>
                <ListGroup.Item variant={variant}>{ingredient.name}</ListGroup.Item>
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
                <Row className="mx-0">
                    <Col sm>
                        {this.renderIngredients(1)}
                    </Col>
                    <Col sm>
                        {this.renderIngredients(2)}
                    </Col>
                </Row>
            </div>
        );
    }
}
