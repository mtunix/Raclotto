import React from "react";
import {Button, Col, Row, Form} from "react-bootstrap";
import {Notifications} from "../lib/notifications";
import randomWords from "random-words"

export class StartScreen extends React.Component {
    constructor(props) {
        super(props);
        this.props.onNotification(Notifications.SESSION_FOUND())
    }

    render() {
        return (
            <div className="card-columns" style={{margin: "10px"}}>
                <Row className="mx-0">
                    <Col sm>
                        <h1>Neue Session erstellen</h1>
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                            <Form.Label>Sessionname</Form.Label>
                            <Form.Control type="email" placeholder="Sessionnamen eingeben" />
                            <Form.Text className="text-muted">
                                Der Sessionname wird anderen Spielern bei der Sessionauswahl angezeigt.
                            </Form.Text>
                            <div className="d-grid mt-2">
                                <Button variant="primary">Erstellen</Button>
                            </div>
                        </Form.Group>
                    </Col>
                    <Col sm>
                        <h1>Bestehender Session beitreten</h1>
                        <Form.Label>Session</Form.Label>
                        <Form.Select>
                            <option>Session A - 24.12.2021</option>
                        </Form.Select>
                        <div className="d-grid mt-2">
                            <Button variant="primary">Beitreten</Button>
                        </div>
                    </Col>
                </Row>
            </div>
        );
    }
}