import React from "react";
import {Button, ButtonGroup, Form, FormControl, InputGroup, ListGroup, ToggleButton} from "react-bootstrap";
import {DialView} from "./dialView";
import {Api} from "../lib/api";

export class GenerateView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            numFill: null,
            numSauce: null,
            generated: null,
            heading: "Zutaten"
        };
    }

    accept = (num) => {
        if (!this.state.numFill) {
            this.setState({numFill: num, heading: "Saucen"});
        } else {
            this.setState({numSauce: num}, function () {
                Api.generate(this.props.session, this.state.numFill, this.state.numSauce).then((data) => {
                    this.setState({
                        generated: data["generated"],
                        heading: data["generated"].name
                    }, function () {
                        console.log(this.state);
                    });
                });
                this.props.onGeneration(this.state.numFill, this.state.numSauce);
            });
        }
    };

    restart = () => {
        this.setState({
            numFill: null,
            numSauce: null,
            generated: null,
            heading: "Zutaten"
        });
    };

    getView() {
        if (!this.state.generated)
            return (<DialView ingredients={this.props.ingredients} accept={this.accept}/>);
        else {
            let ingredients = this.state.generated.ingredients
                .map((ingredient) =>
                    <ListGroup.Item>{ingredient.name}</ListGroup.Item>
                );

            return (
                <div className="d-grid gap-2 mt-2">
                    <ListGroup key={this.props.ingredients} className="mb-2">
                        {ingredients}
                    </ListGroup>
                    <Button onClick={this.restart}>Roll another dice</Button>
                </div>
            );
        }
    }

    render() {
        return (
            <div>
                <h3>{this.state.heading}</h3>
                {this.getView()}
            </div>
        );
    }

}