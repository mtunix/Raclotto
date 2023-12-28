import React, {useEffect} from "react";
import {Button, ButtonGroup, Col, Form, Row} from "react-bootstrap";
import {Api} from "../lib/api";
import {useNavigate} from "react-router-dom";
import {useSession} from "../lib/useSession";

export function ServerSettingsView(props) {
    const [sessionName, setSessionName] = React.useState("");
    const {session} = useSession();
    const navigate = useNavigate();

    useEffect(() => {
        setSessionName(session?.name);
    }, [session]);

    const onCloseSession = () => {
        Api.close(session).then(() => {
            navigate("/");
        });
    };

    const onExit = () => {
        navigate("/");
    };

    return (
        <div>
            <div>
                <Form.Group className="mb-3" controlId="formIngredientName">
                    <Form.Label>Sessionname</Form.Label>
                    <Form.Control
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        type="name"
                        placeholder="Namen eingeben"
                    />
                </Form.Group>
                <Row>
                    <Col>
                        <Form.Group className="d-grid gap-2 mt-2" controlId="formIngredientName">
                            <Form.Label>Abend schon vorbei?</Form.Label>
                            <ButtonGroup className="flex-wrap">
                                <Button onClick={onCloseSession}>Session beenden</Button>
                            </ButtonGroup>
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group className="d-grid gap-2 mt-2" controlId="formIngredientName">
                            <Form.Label>Kein Bock mehr?</Form.Label>
                            <ButtonGroup className="flex-wrap">
                                <Button onClick={onExit}>Ragequit</Button>
                            </ButtonGroup>
                            <Form.Text className="text-muted">
                                You are not allowed to press this button. You did not Raclotto enough.
                            </Form.Text>
                        </Form.Group>
                    </Col>
                </Row>
            </div>
        </div>
    )
}