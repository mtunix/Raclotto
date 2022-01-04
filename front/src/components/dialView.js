import React from "react";
import {Button, Form, InputGroup} from "react-bootstrap";


export class DialView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            num: this.props.num,
            dragY: 0
        }
    }

    onInputChanged = (event) => {
        this.setState({num: parseInt(event.target.value)})
    };

    onDrag = (e) => {
        if (e.screenY === 0)
            return;

        if (this.state.num > 1 && (e.screenY - this.state.dragY) > 5) {
            this.setState((prevState) => ({
                num: prevState.num - 1,
                dragY: e.screenY
            }), () => {
                this.props.onChange(this.state.num)
            });
        } else if (this.state.num < this.props.ingredients.length && (e.screenY - this.state.dragY ) < -5) {
            this.setState((prevState) => ({
                num: prevState.num + 1,
                dragY: e.screenY
            }), () => {
                this.props.onChange(this.state.num)
            });
        }

        this.setState({
            dragY: e.screenY
        });
    };

    render() {
        return (
            <div touch-action={"none"}
                 style={{touchAction: "none !important"}}
                 onDragStart={(e) => e.dataTransfer.setDragImage(new Image(), 0, 0)}
                 onDrag={this.onDrag}
                 onTouchMove={(e) => this.onDrag(e.touches[0])}
                 onClick={(e) => e.preventDefault()}
                 draggable={true}>
                <div >
                    <InputGroup className="mb-3">
                        <Button className={"mr-0"}
                                variant={"primary"}
                                onClick={() => this.setState((pre) => ({num: pre.num - 1}))}
                        >-</Button>
                        <Form.Control type="number"
                                      className={"mx-0 text-center"}
                                      value={this.state.num} />
                        <Button variant={"primary"}
                                className={"ml-0"}
                                onClick={() => this.setState((pre) => ({num: pre.num + 1}))}>+</Button>
                    </InputGroup>
                </div>
            </div>
        );
    }
}
