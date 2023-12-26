import React, {useEffect} from "react";
import {Button, Col, Row, Form} from "react-bootstrap";
import {Notifications} from "../lib/notifications";
import {Api} from "../lib/api";
import {useSession} from "../lib/useSession";
import {useNavigate} from "react-router-dom";

export function StartScreen(props) {
    const [name, setName] = React.useState("");
    const [selected, setSelected] = React.useState(0);
    const {sessions, join, create} = useSession();
    const navigate = useNavigate();

    return (
        <div className="card-columns"
             style={{margin: "10px"}}>
            <Row className="mx-0">
                <Col sm>
                    <h1>Neue Session erstellen</h1>
                    <Form.Group className="mb-3"
                                controlId="formSessionName">
                        <Form.Label>Sessionname</Form.Label>
                        <Form.Control
                            type="name"
                            placeholder="Sessionnamen eingeben"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Form.Text className="text-muted">
                            Der Sessionname wird anderen Spielern bei der Sessionauswahl angezeigt.
                        </Form.Text>
                        <div className="d-grid mt-2">
                            <Button variant="primary"
                                    onClick={create}>
                                Erstellen
                            </Button>
                        </div>
                    </Form.Group>
                </Col>
                {
                    sessions.length > 0 &&
                    <Col sm>
                        <h1>Bestehender Session beitreten</h1>
                        <Form.Label>Session</Form.Label>
                        <Form.Select value={selected}
                                     onChange={(e) => setSelected(e.target.value)}>
                            {
                                sessions.map((session, i) =>
                                    <option value={i}
                                            key={"session-option-" + i}>
                                        {session.name} - {new Date(session.timestamp).toLocaleTimeString("de-DE")}
                                    </option>)
                            }
                        </Form.Select>
                        <div className="d-grid mt-2">
                            <Button variant="primary"
                                    onClick={(e) => {
                                        join(sessions[selected]);
                                        navigate(`session/${sessions[selected].key}`);
                                    }}>
                                Beitreten
                            </Button>
                        </div>
                    </Col>
                }
            </Row>
        </div>
    );
}