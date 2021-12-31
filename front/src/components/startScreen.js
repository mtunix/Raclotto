import React from "react";
import {Button, Col, Row, Form} from "react-bootstrap";
import {Notifications} from "../lib/notifications";
import {Api} from "../lib/api";

export class StartScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sessions: [],
            name: "",
            selected: ""
        };
    }

    componentDidMount() {
        this.validate();

        Api.get("sessions").then((data) => {
            this.setState({
                sessions: data,
                selected: data[0].key
            });

            if (data <= 0)
                this.props.onNotification(Notifications.NO_SESSIONS())
        });
    }

    onNameChanged = (event) => {
        this.setState({name: event.target.value});
    }

    onSessionSelected = (event) => {
        this.setState({selected: event.target.value})
    }

    validate() {
        Api.validate(this.props.session).then((data) => {
            if (data[this.props.session]) {
                this.props.onNotification(Notifications.SESSION_FOUND());
                this.setState({selected: this.props.session})
            }
        });
    }

    join = () => {
        this.props.onSessionJoined(this.state.selected)
    }

    create = () => {
        Api.createSession(this.state.name).then((data) => {
            this.props.onSessionJoined(data["session"].key)
        })
    }

    renderJoinSession() {
        if (this.state.sessions.length <= 0)
            return "";
        else {
            let sessions = this.state.sessions.map((session) =>
                <option value={session.key}>
                    {session.name} - {new Date(session.timestamp).toLocaleTimeString("de-DE")}
                </option>);

            return (<Col sm>
                <h1>Bestehender Session beitreten</h1>
                <Form.Label>Session</Form.Label>
                <Form.Select value={this.state.selected} onChange={this.onSessionSelected}>
                    {sessions}
                </Form.Select>
                <div className="d-grid mt-2">
                    <Button variant="primary" onClick={this.join}>Beitreten</Button>
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
                        <Form.Group className="mb-3" controlId="formSessionName">
                            <Form.Label>Sessionname</Form.Label>
                            <Form.Control
                                type="name"
                                placeholder="Sessionnamen eingeben"
                                value={this.state.name}
                                onChange={this.onNameChanged}
                            />
                            <Form.Text className="text-muted">
                                Der Sessionname wird anderen Spielern bei der Sessionauswahl angezeigt.
                            </Form.Text>
                            <div className="d-grid mt-2">
                                <Button variant="primary" onClick={this.create}>Erstellen</Button>
                            </div>
                        </Form.Group>
                    </Col>
                    {this.renderJoinSession()}
                </Row>
            </div>
        );
    }
}