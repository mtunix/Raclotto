import React from "react";
import {Api} from "../lib/api";
import {Accordion, ListGroup} from "react-bootstrap";

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

    render() {
        let pans = this.state.pans.map((pan, i) =>
            <Accordion.Item eventKey={i}>
                <Accordion.Header>
                    <span style={{fontWeight: 800}}>{pan.name}</span>
                    <span style={{fontStyle: "italic", fontSize: "smaller"}} className="px-3">verspeist von {pan.user}</span>
                </Accordion.Header>
                <Accordion.Body>
                    <ListGroup key={this.props.ingredients} className="mb-2">
                        {pan.ingredients.map((ingredient) =>
                            <ListGroup.Item>{ingredient.name}</ListGroup.Item>
                        )}
                    </ListGroup>
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