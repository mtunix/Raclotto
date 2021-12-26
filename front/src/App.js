import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import {StartScreen} from "./components/startScreen";
import {ToastContainer, Toast} from "react-bootstrap";
import {Api} from "./lib/api";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            session: "session",
            ingredients: [],
            pans: [],
            notifications: [],
            view: null,
        };

        this.updateState();
        // this.onNavClicked = this.onNavClicked.bind(this);
    }

    updateState = () => {
        Api.get("pans")
        Api.get("ingredients")
        this.state.view = <StartScreen session={this.state.session} onNotification={this.onNotification}/>
    };

    onNotification = (notification) => {
        this.state.notifications.push(notification)
        this.setState(this.state.notifications)
    };

    onNavClicked(id, event) {
        event.preventDefault();
        this.setState({view: id});
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
                        src="holder.js/20x20?text=%20"
                        className="rounded me-2"
                        alt=""
                    />
                    <strong className="me-auto">{notification.title}</strong>
                    <small>5 minutes ago</small>
                </Toast.Header>
                <Toast.Body>{notification.content}</Toast.Body>
            </Toast>
        );

        return (
            <>
                <h1 className="text-center">Raclotto</h1>
                {this.state.view}

                <ToastContainer id="notifications" className="p-3" position="bottom-center">
                    {toasts}
                </ToastContainer>
            </>
        );
    }
}

export default App