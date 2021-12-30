import React from "react";
import {Button, ButtonGroup, Form, FormControl, InputGroup, ToggleButton} from "react-bootstrap";
import {DialView} from "./dialView";

export class GenerateView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            numFill: null,
            numSauce: null,
            heading: "Zutaten"
        };
    }

    accept = (num) => {
        if (!this.state.numFill) {
            this.setState({numFill: num, heading: "Saucen"});
        } else {
            this.setState({numSauce: num}, function () {
                this.props.onGeneration(this.state.numFill, this.state.numSauce);
            });
        }
    };

    render() {
        return (
            <div>
                <h3>{this.state.heading}</h3>
                <DialView ingredients={this.props.ingredients} accept={this.accept}/>
            </div>
        );
    }

}