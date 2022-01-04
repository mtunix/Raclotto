import React from "react";
import {
    Accordion,
} from "react-bootstrap";
import {Api} from "../lib/api";

export class AchievementView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            achievements: []
        }
    }

    componentDidMount() {
        Api.get("achievements").then((data) => {
            this.setState({achievements: data})
        })
    }

    render() {
        let achievements = this.state.achievements.map((achievement, i) =>
            <Accordion.Item eventKey={i}>
                <Accordion.Header className={"achievement-done"}>
                    <span style={{fontWeight: 800}}>{achievement.title}</span>
                </Accordion.Header>
                <Accordion.Body>
                    {achievement.description}
                </Accordion.Body>
            </Accordion.Item>
        );

        return (
            <div>
                <Accordion>
                    {achievements}
                </Accordion>
            </div>
        );
    }

}