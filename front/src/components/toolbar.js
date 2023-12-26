import React from "react";
import {Card, ToggleButton} from "react-bootstrap";
import {AddIngredient} from "./addIngredient";
import {GenerateView} from "./generateView";
import {HistoryView} from "./historyView";
import {SettingsView} from "./settingsView";
import {AchievementView} from "./achievementView";
import {ServerSettingsView} from "./ServerSettingsView";
import {VectorGraphics} from "../lib/vectorGraphics";
import {Dashboard} from "./Dashboard";

export class Toolbar extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            toolbar: 0,
            user: "",
        };
    }

    onUserChanged = (name) => {
        this.setState({
            user: name
        });
    };

    onGeneration = (numIngredient, numSauce) => {
        // this.setState({toolbar: 0})
    };

    onToolbarClicked = (id) => {
        if (this.state.toolbar === id)
            this.setState({toolbar: 0})
        else
            this.setState({toolbar: id})
    };


    getTool() {
        let title;
        let view;

        switch (this.state.toolbar) {
            case 1:
                view = (<GenerateView session={this.props.session}
                                      ingredients={this.props.ingredients}
                                      onGeneration={this.onGeneration}/>);
                title = "Zusammenstellung wuerfeln"
                break;
            case 2:
                view = (<SettingsView onUserChanged={this.onUserChanged}/>);
                title = "Einstellungen Nutzer"
                break;
            case 3:
                view = (<HistoryView session={this.props.session}/>);
                title = "Historie"
                break;
            case 4:
                view = (<AddIngredient session={this.props.session}
                                       onAdd={this.props.onAdd}/>);
                title = "Zutat hinzufuegen"
                break;
            case 5:
                view = (<AchievementView/>);
                title = "Errungenschaften"
                break;
            case 6:
                view = (<ServerSettingsView session={this.props.session}
                                            onSessionClosed={this.props.onSessionClosed}/>);
                title = "Einstellungen Session"
                break;
            case 7:
                view = <Dashboard session={this.props.session}/>;
                title = "Dashboard"
                break;
        }

        if (view)
            return (
                <Card>
                    <Card.Header style={{fontWeight: 800}}>{title}</Card.Header>
                    <Card.Body>
                        <Card.Text>
                            {view}
                        </Card.Text>
                    </Card.Body>
                </Card>
            );
    }

    render() {
        return (
            <div className={"mb-1"}>
                <div>
                    <ToggleButton type="radio"
                                  className={"mb-1 mr-1"}
                                  checked={this.state.toolbar === 1}
                                  variant="outline-primary"
                                  onClick={() => this.onToolbarClicked(1)}>
                        {VectorGraphics.SHUFFLE}
                    </ToggleButton>
                    <ToggleButton type="radio"
                                  checked={this.state.toolbar === 2}
                                  variant="outline-primary"
                                  className={"mb-1 mr-1"}
                                  onClick={() => this.onToolbarClicked(2)}>
                        {VectorGraphics.SETTINGS_CLIENT}
                    </ToggleButton>
                    <ToggleButton type="radio"
                                  className={"mb-1 mr-1"}
                                  checked={this.state.toolbar === 3}
                                  variant="outline-primary"
                                  onClick={() => this.onToolbarClicked(3)}>
                        {VectorGraphics.HISTORY}
                    </ToggleButton>
                    <ToggleButton type="radio"
                                  checked={this.state.toolbar === 4}
                                  variant="outline-primary"
                                  className={"mb-1 mr-1"}
                                  onClick={() => this.onToolbarClicked(4)}>
                        +
                    </ToggleButton>
                    <ToggleButton type="radio"
                                  className={"mb-1 mr-1"}
                                  checked={this.state.toolbar === 5}
                                  variant="outline-primary"
                                  onClick={() => this.onToolbarClicked(5)}>
                        {VectorGraphics.ACHIEVEMENTS}
                    </ToggleButton>
                    <ToggleButton type="radio"
                                  checked={this.state.toolbar === 6}
                                  className={"mb-1 mr-1"}
                                  variant="outline-primary"
                                  onClick={() => this.onToolbarClicked(6)}>
                        {VectorGraphics.SETTINGS_SERVER}
                    </ToggleButton>
                    <ToggleButton type="radio"
                                  checked={this.state.toolbar === 7}
                                  className={"mb-1 mr-1"}
                                  variant="outline-primary"
                                  onClick={() => this.onToolbarClicked(7)}>
                        {VectorGraphics.DASHBOARD}
                    </ToggleButton>
                </div>
                <div className="mt-3 mb-3">
                    {this.getTool()}
                </div>
            </div>
        );
    }
}
