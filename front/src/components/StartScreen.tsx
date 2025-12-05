import {Button, Form} from "react-bootstrap";
import {useSessions} from "../lib/api/apiSession";
import {SpinnerContainer} from "./common/Spinner";
import ErrorPage from "./common/error/ErrorPage";
import React, {useEffect} from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import {RaclottoSession} from "../model/RaclottoSession";
import {useAppStore} from "../AppSlice";
import {useNavigate} from "react-router";

export function JoinSession() {
    const setSession = useAppStore((state) => state.setSession);
    let {data, isLoading, error} = useSessions();
    let [selectedIndex, setSelectedIndex] = React.useState(0);

    function join() {
        setSession(data[selectedIndex]);
    }

    function onSessionSelected(index: number) {
        setSelectedIndex(index);
    }

    useEffect(() => {
        if (data && data.length > 0) selectedIndex = 0;
    }, [data]);

    if (isLoading) return <SpinnerContainer/>;
    if (error) return <ErrorPage error={error}/>;

    return (<Row><Col sm>
        <h1>Bestehender Session beitreten</h1>
        <Form.Label>Session</Form.Label>
        <Form.Select value={selectedIndex} onChange={(e) => onSessionSelected(e.target.selectedIndex)}>
            {data.map((session: RaclottoSession, i: number) => {
                return <option key={session.id} value={i}>{session.name}</option>
            })}
        </Form.Select>
        <div className="d-grid mt-2">
            <Button variant="primary" onClick={join}>Beitreten</Button>
        </div>
    </Col></Row>);
}

export function SessionSelector() {
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

export function StartScreen() {
    const session = useAppStore((state) => state.session);

    if (session) {
        return (
            <div className="container">
                <h1>Session {session.name} beigetreten</h1>
            </div>
        );
    }

    return (
        <div className="container">
            <SessionSelector/>
        </div>
    );
}