import React from "react";
import {Button, Col, ListGroup, Row, Form} from "react-bootstrap";
import {DialView} from "./dialView";
import {Api} from "../lib/api";
import Rating from "react-rating";

export class GenerateView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            numFill: null,
            numSauce: null,
            generated: null,
            heading: "Zutatenanzahl eingeben"
        };
    }

    accept = (num) => {
        if (!this.state.numFill) {
            this.setState({numFill: num, heading: "Saucenanzahl eingeben"});
        } else {
            this.setState({numSauce: num}, function () {
                Api.generate(this.props.session, this.state.numFill, this.state.numSauce).then((data) => {
                    this.setState({
                        generated: data["generated"],
                        heading: data["generated"].name
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
            heading: "Zutatenanzahl eingeben"
        });
    };

    getView() {
        if (!this.state.generated)
            return (<DialView ingredients={this.props.ingredients} accept={this.accept}/>);
        else {
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
                    <Button onClick={this.restart}>Roll another dice</Button>
                </div>
            );
        }
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

    getRating() {
        if (!this.state.generated)
            return;

        return (<Rating
            className="mb-2"
            onClick={this.onRating}
            emptySymbol={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-star" viewBox="0 0 16 16">
                <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"/>
            </svg>}
            fullSymbol={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                             fill="currentColor"
                             className="bi bi-star-fill" viewBox="0 0 16 16">
                <path
                    d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
            </svg>}/>);
    }

    render() {
        return (
            <div>
                <Row>
                    <Col>
                        <Form.Label>{this.state.heading}</Form.Label>
                    </Col>
                    <Col style={{textAlign: "right"}}>
                        {this.getRating()}
                    </Col>
                </Row>
                {this.getView()}
            </div>
        );
    }

}