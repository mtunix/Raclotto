import React from "react";
import {Button, Col, Row, Form} from "react-bootstrap";
import {Notifications} from "../lib/notifications";
import {Api} from "../lib/api";

export class StartScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sessions: [],
            name: ""
        }

        Api.get("sessions").then((data) => {
            this.setState({sessions: data})

            if (data <= 0)
                this.props.onNotification(Notifications.NO_SESSIONS())
        });

        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        this.setState({name: event.target.value});
    }

    validate() {
        if (Api.validate(this.props.session))
            this.props.onNotification(Notifications.SESSION_FOUND())
    }

    renderJoinSession() {
        if (this.state.sessions.length <= 0)
            return "";
        else {
            let sessions = this.state.sessions.map((session) =>
                <option>
                    {session.name} - {new Date(session.timestamp).toLocaleTimeString("de-DE")}
                </option>);

            return (<Col sm>
                <h1>Bestehender Session beitreten</h1>
                <Form.Label>Session</Form.Label>
                <Form.Select>
                    {sessions}
                </Form.Select>
                <div className="d-grid mt-2">
                    <Button variant="primary">Beitreten</Button>
                </div>
            </Col>);
        }
    }

    render() {
        return (
            <div className="card-columns" style={{margin: "10px"}}>
                <Row className="mx-0">
                    <Col sm>
                        <h1>Neue Session erstellen</h1>
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                            <Form.Label>Sessionname</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="Sessionnamen eingeben"
                                value={this.state.name}
                                onChange={this.handleChange}
                            />
                            <Form.Text className="text-muted">
                                Der Sessionname wird anderen Spielern bei der Sessionauswahl angezeigt.
                            </Form.Text>
                            <div className="d-grid mt-2">
                                <Button variant="primary" onClick={() => Api.createSession(this.state.name)}>Erstellen</Button>
                            </div>
                        </Form.Group>
                    </Col>
                    {this.renderJoinSession()}
                </Row>
            </div>
        );
    }
}