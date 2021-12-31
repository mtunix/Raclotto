import React from "react";
import {Button, ButtonGroup, Form} from "react-bootstrap";
import {Api} from "../lib/api";

export class ServerSettingsView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            name: ""
        }
    }

    componentDidMount() {
        Api.get("session", this.props.session).then((data) => {
            this.setState({name:data["session"].name})
        });
    }

    onNameChanged = (event) => {
        this.setState({name: event.target.value})
    };

    render() {
        return (
            <div>
                <Form.Group className="mb-3" controlId="formIngredientName">
                    <Form.Label>Sessionname</Form.Label>
                    <Form.Control
                        value={this.state.name}
                        onChange={this.onNameChanged}
                        type="name"
                        placeholder="Namen eingeben"
                    />
                </Form.Group>
                <Form.Group className="d-grid gap-2 mt-2 mb-3" controlId="formIngredientName">
                    <Form.Label>Abend schon vorbei?</Form.Label>
                    <ButtonGroup className="flex-wrap">
                        <Button>Session beenden</Button>
                    </ButtonGroup>
                </Form.Group>

            </div>
        )
    }
}
