import {Button, Form} from "react-bootstrap";
import {useSessions} from "../lib/api/ApiSession";
import {SpinnerContainer} from "./common/Spinner";
import ErrorPage from "./common/error/ErrorPage";
import React, {useEffect} from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import {RaclottoSession} from "../model/RaclottoSession";

export function JoinSession() {
    let {data, isLoading, error} = useSessions();
    let selectedIndex: number = 0;

    useEffect(() => {
        if (data && data.length > 0) selectedIndex = data[0].id;
    }, [data]);

    if (isLoading) return <SpinnerContainer/>;
    if (error) return <ErrorPage error={error}/>;

    function onSessionSelected(index: string) {
        selectedIndex = +index;
    }

    function join() {

    }

    return (<Row><Col sm>
        <h1>Bestehender Session beitreten</h1>
        <Form.Label>Session</Form.Label>
        <Form.Select value={selectedIndex} onChange={(e: React.ChangeEvent) => onSessionSelected(e.target.id)}>
            {data.map((session: RaclottoSession) => {
                return <option value={session.id}>{session.name}</option>
            })}
        </Form.Select>
        <div className="d-grid mt-2">
            <Button variant="primary" onClick={join}>Beitreten</Button>
        </div>
    </Col></Row>);
}

export function StartScreen() {
    function create() {

    }

    return (
        <div className="card-columns" style={{margin: "10px"}}>
            <Row>
                <Col sm>
                    <h1>Neue Session erstellen</h1>
                    <Form.Group className="mb-3" controlId="formSessionName">
                        <Form.Label>Sessionname</Form.Label>
                        <Form.Control
                            type="name"
                            placeholder="Sessionnamen eingeben"
                            // value={this.state.name}
                            // onChange={this.onNameChanged}
                        />
                        <Form.Text className="text-muted">
                            Der Sessionname wird anderen Spielern bei der Sessionauswahl angezeigt.
                        </Form.Text>
                        <div className="d-grid mt-2">
                            <Button variant="primary" onClick={create}>Erstellen</Button>
                        </div>
                    </Form.Group>
                </Col>
            </Row>
            <JoinSession/>
        </div>
    );
}