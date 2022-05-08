import React from "react";
import {Button, ButtonGroup, Form} from "react-bootstrap";
import {Api} from "../lib/api";

export class ServerSettingsView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            name: "",
            waiting: true
        }
    }

    componentDidMount() {
        Api.get("session", this.props.session).then((data) => {
            this.setState({
                name:data["session"].name,
                waiting: false
            })
        });
    }

    onNameChanged = (event) => {
        this.setState({name: event.target.value})
    };

    onCloseSession = () => {
        Api.close(this.props.session).then((data) => {
            this.props.onSessionClosed();
        });
    };

    render() {
        return (
            <div>
                <div hidden={!this.state.waiting}>
                    <div className="d-flex justify-content-center">
                        <div className="spinner-border text-secondary" role="status">
                        </div>
                    </div>
                </div>
                <div hidden={this.state.waiting}>
                    <Form.Group className="mb-3" controlId="formIngredientName">
                        <Form.Label>Sessionname</Form.Label>
                        <Form.Control
                            value={this.state.name}
                            onChange={this.onNameChanged}
                            type="name"
                            placeholder="Namen eingeben"
                        />
                    </Form.Group>
                    <Form.Group className="d-grid gap-2 mt-2" controlId="formIngredientName">
                        <Form.Label>Abend schon vorbei?</Form.Label>
                        <ButtonGroup className="flex-wrap">
                            <Button onClick={this.onCloseSession}>Session beenden</Button>
                        </ButtonGroup>
                    </Form.Group>
                </div>
            </div>
        )
    }
}
