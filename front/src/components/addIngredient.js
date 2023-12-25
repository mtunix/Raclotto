import React from "react";
import {Button, ButtonGroup, Form, ToggleButton} from "react-bootstrap";
import {Api} from "../lib/api";

const utilizeFocus = () => {
    const ref = React.createRef()
    const setFocus = () => {
        ref.current && ref.current.focus()
    }

    return {setFocus, ref}
}

export class AddIngredient extends React.Component {
    constructor(props) {
        super(props);
        this.options = [
            {"name": "meat", "localized": "Fleisch"},
            {"name": "vegetarian", "localized": "Vegetarisch"},
            {"name": "vegan", "localized": "Vegan"},
            {"name": "histamine", "localized": "Histamin"},
            {"name": "gluten", "localized": "Gluten"},
            {"name": "fructose", "localized": "Fructose"},
            {"name": "lactose", "localized": "Lactose"},
        ];

        this.state = {
            meat: false,
            vegetarian: true,
            vegan: false,
            gluten: false,
            histamine: false,
            fructose: false,
            lactose: false,
            name: "",
            type: 1
        }

        this.inputFocus = utilizeFocus()
    }

    setChecked = (event) => {
        let type = event.target.id;
        let state = this.state[type];

        if (type === "vegetarian" && !state) {
            this.setState({vegan: true})
        }

        if (type === "meat" && !state) {
            this.setState({
                vegan: true,
                vegetarian: true
            })
        }

        this.setState({[type]: !state})
    };

    onNameChanged = (event) => {
        this.setState({"name": event.target.value})
    };

    onAddClicked = () => {
        Api.add(this.props.session, this.state).then((data) => {
            this.props.onAdd()
        });
        this.setState({"name": ""})
        this.inputFocus.setFocus();
    };

    onIngredientSelected = (type) => {
        this.setState({type: type})
    };

    render() {
        let checks = this.options.map((option) =>
            <ToggleButton
                className="mb-2"
                id={option.name}
                type="checkbox"
                variant="outline-primary"
                checked={this.state[option.name]}
                onChange={this.setChecked}
            >
                {option.localized}
            </ToggleButton>
        );

        return (
            <div>
                <Form.Group className="mb-3" controlId="formIngredientName">
                    <Form.Label>Zutatenname</Form.Label>
                    <Form.Control autoFocus
                                  value={this.state.name}
                                  ref={this.inputFocus.ref}
                                  onChange={this.onNameChanged}
                                  type="name"
                                  placeholder="Namen eingeben"
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <div className="d-grid">
                        <Form.Label>Art</Form.Label>
                        <ButtonGroup>
                            <ToggleButton
                                id="ingredient"
                                type="radio"
                                variant="outline-primary"
                                checked={this.state.type === 1}
                                onChange={() => this.onIngredientSelected(1)}
                            >
                                Zutat
                            </ToggleButton>
                            <ToggleButton
                                id="sauce"
                                type="radio"
                                variant="outline-primary"
                                checked={this.state.type === 2}
                                onChange={() => this.onIngredientSelected(2)}
                            >
                                Sauce
                            </ToggleButton>
                        </ButtonGroup>
                    </div>
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Enthaelt/Ist</Form.Label>
                    <div className="d-grid">
                        <ButtonGroup className="flex-wrap">
                            {checks}
                        </ButtonGroup>
                    </div>
                </Form.Group>
                <div className="d-grid mt-2">
                    <Button variant="primary"
                            disabled={this.state.name.length === 0}
                            onClick={this.onAddClicked}>
                        Erstellen
                    </Button>
                </div>
            </div>
        );
    }
}
