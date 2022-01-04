import React from "react";
import {Api} from "../lib/api";
import {Accordion, ListGroup} from "react-bootstrap";
import Rating from "react-rating";
import {VectorGraphics} from "../lib/vectorGraphics";

export class HistoryView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            pans: [],
        };
    }

    componentDidMount() {
        Api.get("pans", this.props.session).then((data) => {
            this.setState({pans: data.reverse()});
        });
    }
    getRating(id, initial) {
        return (<div className={"d-none d-sm-block"}><Rating
            className="mb-2"
            initialRating={initial}
            onClick={(rating) => this.onRating(id, rating)}
            emptySymbol={VectorGraphics.RATING_EMPTY}
            fullSymbol={VectorGraphics.RATING_FULL}
            readonly={true}
        /></div> );
    }

    onRating = (id, rating) => {
        Api.rate(
            this.props.session,
            id,
            rating
        ).then((data) => {
            // todo
            console.log(data);
        });
    };

    render() {
        let getVariant = (type) => type === 1 ? "primary" : "secondary";
        let pans = this.state.pans.map((pan, i) =>
            <Accordion.Item eventKey={i}>
                <Accordion.Header>
                    <span style={{fontWeight: 800}}>{pan.name}</span>
                    <span style={{fontStyle: "italic", fontSize: "smaller"}} className="px-3">verspeist von {pan.user}</span>
                    {this.getRating(pan.id, pan.rating)}
                </Accordion.Header>
                <Accordion.Body>
                    <ListGroup key={this.props.ingredients} className="mb-2">
                        {pan.ingredients.map((ingredient) =>
                            <ListGroup.Item variant={getVariant(ingredient.type)}>{ingredient.name}</ListGroup.Item>
                        )}
                    </ListGroup>
                    <span style={{fontStyle: "italic", fontSize: "smaller"}} className="px-3">verspeist um {pan.timestamp}</span>
                </Accordion.Body>
            </Accordion.Item>
        );

        return (
            <Accordion>
                {pans}
            </Accordion>
        );
    }
}