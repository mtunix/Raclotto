import React from 'react';
import './App.css';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            esps: [],
            unconfiguredEsps: [],
            firmwares: [],
            doors: [],
            windows: [],
            locations: [],
            rooms: [],
            view: 0
        };

        this.updateState();
        this.onNavClicked = this.onNavClicked.bind(this);
    }

    updateState = () => {
        this.getAjax("ingredients");
        this.getAjax("pans");
    };

    getAjax(datasetName) {
        const self = this;
        console.log(datasetName)
        fetch("/api/" + datasetName)
            .then(function (response) {
                response.text().then(function (data) {
                    // workaround to use string as key
                    let set = [];
                    set[datasetName] = data;
                    self.setState(set);
                    console.log(set)
                });
            })
            .catch(function (error) {
                console.warn(error);
            });
    }

    onNavClicked(id, event) {
        event.preventDefault();
        this.setState({view: id});
    }

    render() {
        return (
            <div className="App">
                <h1>Raclotto</h1>
            </div>
        );
    }
}

export default App