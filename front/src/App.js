import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import {StartScreen} from "./components/startScreen";
import {ToastContainer, Toast} from "react-bootstrap";
import {Api} from "./lib/api";
import {MainScreen} from "./components/mainScreen";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            session: localStorage.getItem("session"),
            notifications: [],
            view: 0,
        };

    }

    getStartScreen() {
        return (
            <StartScreen session={this.state.session}
                         onNotification={this.onNotification}
                         onSessionJoined={this.onSessionJoined}/>
        );
    }

    getMainScreen() {
        return (
            <MainScreen session={this.state.session}
                        onSessionClosed={this.onSessionClosed} />
        );
    }

    updateState = () => {
        Api.get("pans", this.state.session).then((data) => {
            this.setState({pans: data})
        });

        Api.get("ingredients", this.state.session).then((data) => {
            this.setState({ingredients: data})
        });
    };

    onSessionJoined = (session) => {
        this.setState({
            session: session,
            view: 1
        }, function () {
            this.updateState();
        });
        localStorage.setItem("session", session)
    };

    onSessionClosed = () => {
        this.setState({
            session: "",
            notifications: [],
            view: 0,
        }, () => { localStorage.setItem("session", "") });
    };

    onNotification = (notification) => {
        this.state.notifications.push(notification)
        this.setState({notifications: this.state.notifications})
    };

    onNavClicked(id, event) {
        event.preventDefault();
        this.setState({view: id});
    }

    getView() {
        if (this.state.view === 1)
            return this.getMainScreen()
        else
            return this.getStartScreen()
    }

    render() {
        let toasts = this.state.notifications.map((notification, i) =>
            <Toast onClose={() => {
                notification.visible = false;
                this.setState({notifications: this.state.notifications});
            }}
                   show={notification.visible}
                   delay={notification.delay}
                   autohide>
                <Toast.Header>
                    <img
                        // src="holder.js/20x20?text=%20"
                        className="rounded me-2"
                        alt=""
                    />
                    <strong className="me-auto">{notification.title}</strong>
                    <small>{new Date(notification.timestamp).toLocaleTimeString("de-DE")}</small>
                </Toast.Header>
                <Toast.Body>{notification.content}</Toast.Body>
            </Toast>
        );

        return (
            <>
                {/*<h1 className="text-center">Raclotto</h1>*/}
                <center>
                    <img width={150} src="raclotto.png"></img>
                </center>
                {this.getView()}

                <ToastContainer id="notifications" className="p-3" position="bottom-center">
                    {toasts}
                </ToastContainer>
            </>
        );
    }
}

export default App