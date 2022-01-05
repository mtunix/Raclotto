import React from "react";
import {Button, Form, InputGroup} from "react-bootstrap";
import {Util} from "../lib/util";


export class DialView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            num: this.props.num,
            dragY: 0,
        }
    }

    isInRange() {
        return 0 < this.state.num && this.state.num <= this.props.ingredients.length;
    }

    onInputChanged = (event) => {
        let v = event.target.value
        if (Util.isNumeric(event.target.value)) {
            v = parseInt(event.target.value)
        }

        this.setState({num: v}, () => {
            this.props.onChange(this.state.num)
        })
    };

    decrement = (e) => {
        if (this.state.num > 1) {
            this.setState((pre) => ({num: pre.num - 1}), () => {
                this.props.onChange(this.state.num)
            });
        }
    };

    increment = (e) => {
        if (this.state.num < this.props.ingredients.length) {
            this.setState((pre) => ({num: pre.num + 1}), () => {
                this.props.onChange(this.state.num)
            });
        }
    };

    onDrag = (e) => {
        if (e.screenY === 0)
            return;

        if (this.state.num > 1 && e.screenY > this.state.dragY) {
            this.setState((prevState) => ({
                num: prevState.num - 1,
                dragY: e.screenY
            }), () => {
                this.props.onChange(this.state.num)
            });
        } else if (this.state.num < this.props.ingredients.length && e.screenY < this.state.dragY) {
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

    bodyScroll = () => {
        document.body.style.overflow = "visible";
        document.body.style.position = "";
    };

    noBodyScroll = () => {
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
    };

    hideDragImage = (e) => {
        e.dataTransfer.setDragImage(new Image(), 0, 0)
    };

    render() {
        return (
            <div touch-action={"none"}
                 style={{touchAction: "none !important"}}
                 onDragStart={this.hideDragImage}
                 onDrag={this.onDrag}
                 onTouchStart={this.noBodyScroll}
                 onTouchEnd={this.bodyScroll}
                 onTouchMove={(e) => this.onDrag(e.touches[0])}
                 onClick={(e) => e.preventDefault()}
                 draggable={true}>
                    <InputGroup className="mb-3" >
                        <Button className={"mr-0"}
                                variant={"primary"}
                                onClick={this.decrement}
                        >-</Button>
                        <Form.Control type="number"
                                      onChange={this.onInputChanged}
                                      className={`mx-0 text-center ${this.isInRange() ? "" : "border border-danger"}`}
                                      value={this.state.num} />
                        <Button variant={"primary"}
                                className={"ml-0"}
                                onClick={this.increment}>+</Button>
                    </InputGroup>
            </div>
        );
    }
}
