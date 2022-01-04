import React from "react";
import {Button, Col, ListGroup, Row, Form} from "react-bootstrap";
import {DialView} from "./dialView";
import {Api} from "../lib/api";
import Rating from "react-rating";
import {VectorGraphics} from "../lib/vectorGraphics";

export class GenerateView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            numFill: this.getLocal("numFill"),
            numSauce: this.getLocal("numSauce"),
            generated: null,
            waiting: false
        };
    }

    restart = () => {
        this.setState({
            numFill: this.getLocal("numFill"),
            numSauce: this.getLocal("numSauce"),
            generated: null,
        });
    };

    getLocal(key) {
        if (localStorage.getItem(key)) {
            return parseInt(localStorage.getItem(key));
        }

        return 1;
    }

    getView() {
        if (!this.state.generated)
            return null;

        let getVariant = (type) => type === 1 ? "primary" : "secondary";
        let ingredients = this.state.generated.ingredients
            .map((ingredient) =>
                <ListGroup.Item variant={getVariant(ingredient.type)}>{ingredient.name}</ListGroup.Item>
            );

        return (
            <div className="d-grid gap-2 mt-2">
                <ListGroup key={this.props.ingredients} className="mb-2">
                    {ingredients}
                </ListGroup>
                <Row>
                    <Col sm className={"d-grid"}>
                        <Button onClick={this.restart}>Roll another dice</Button>
                    </Col>
                </Row>
            </div>
        );
    }

    onRating = (rating) => {
        Api.rate(
            this.props.session,
            this.state.generated.id,
            rating
        ).then((data) => {
            console.log(data);
        });
    };

    onGenerateClicked = () => {
        this.setState({waiting: true})
        localStorage.setItem("numFill", this.state.numFill);
        localStorage.setItem("numSauce", this.state.numSauce);
        Api.generate(this.props.session, this.state.numFill, this.state.numSauce).then((data) => {
            this.setState({
                generated: data["generated"],
                waiting: false
            });
        });
        this.props.onGeneration(this.state.numFill, this.state.numSauce);
    }

    getRating() {
        if (!this.state.generated)
            return;

        return (<Rating
            className="mb-2"
            onClick={this.onRating}
            emptySymbol={VectorGraphics.RATING_EMPTY}
            fullSymbol={VectorGraphics.RATING_FULL}/>);
    }

    render() {
        return (
            <div>
                <div hidden={!this.state.generated || this.state.waiting}>
                    <Row>
                        <Col>
                            <h3>{this.state.generated ? this.state.generated.name : ""}</h3>
                        </Col>
                        <Col style={{textAlign: "right"}}>
                            {this.getRating()}
                        </Col>
                    </Row>
                    <Row>
                        {this.getView()}
                    </Row>
                </div>
                <div hidden={this.state.generated || this.state.waiting}>
                    <Row className="mb-2">
                        <Col>
                            <Form.Label>Zutatenanzahl</Form.Label>
                            <DialView ingredients={this.props.ingredients}
                                      onChange={(num) => this.setState({numFill: num})}
                                      num={this.state.numFill} />
                        </Col>
                        <Col>
                            <Form.Label>Saucenanzahl</Form.Label>
                            <DialView ingredients={this.props.ingredients}
                                      onChange={(num) => this.setState({numSauce: num})}
                                      num={this.state.numSauce}/>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <div className="d-grid mt-2">
                                <Button variant="primary"
                                        disabled={this.state.numFill < 1 && this.state.numSauce < 1}
                                        onClick={this.onGenerateClicked}>
                                    Erstellen
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </div>
                <div hidden={!this.state.waiting}>
                    <div className="d-flex justify-content-center">
                        <div className="spinner-border text-secondary" role="status">
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}