import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';
import './App.css';
import {StartScreen} from "./components/StartScreen";
import {Toast, ToastContainer} from "react-bootstrap";
import {Api} from "./lib/api";
import {MainScreen} from "./components/MainScreen";
import raclotto from "./raclotto.png";
import {Outlet} from "react-router-dom";
import {useSession} from "./lib/useSession";

export function App() {
    const {session} = useSession();
    console.log(session);

    return (
        <AppCls session={session}/>
    );
}

class AppCls extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            session: props.session,
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
                        onSessionClosed={this.onSessionClosed}/>
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
        }, () => {
            localStorage.setItem("session", "")
        });
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
                   key={"toast-" + i}
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

        return (<>
            <center>
                <img width={150} src={raclotto} alt=""/>
            </center>

            <Outlet/>

            <ToastContainer
                position="bottom-center"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
        </>);
    }
}

export default App