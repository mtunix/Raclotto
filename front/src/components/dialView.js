import React from "react";
import {Button, ButtonGroup, FormControl} from "react-bootstrap";

export class DialView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            numIngredients: 0,
            type: 1
        }
    }

    onDialClicked = (event) => {
        let numStr = String(this.state.numIngredients);

        if (event.target.id === "del") {
            numStr = numStr.substr(0, numStr.length - 1);
            if (!numStr)
                numStr = 0;
        } else {
            numStr += String(event.target.id);
        }

        this.setState({
            numIngredients: parseInt(numStr)
        })
    };

    onInputChanged = (event) => {
        this.setState({numIngredients: parseInt(event.target.value)})
    };

    accept = () => {
        this.props.accept(this.state.numIngredients)
        if (this.state.type === 2) {
            this.setState({numIngredients: 0, type: 1})
        } else {
            this.setState({numIngredients: 0, type: 2})
        }
    };

    buttonIsDisabled = (i) => {
        let numStr = String(this.state.numIngredients);
        numStr += String(i);
        return parseInt(numStr) > this.props.ingredients.filter((i) => i.type === this.state.type).length;
    }

    render() {
        return (
            <div className="d-grid mt-2">
                <ButtonGroup>
                    <FormControl
                        type="number"
                        readOnly={true}
                        placeholder="Anzahl Zutaten eingeben"
                        value={this.state.numIngredients}
                        onChange={this.onInputChanged}
                        aria-label="IngredientCount"
                        aria-describedby="btnGroupAddon"
                    />
                </ButtonGroup>
                <ButtonGroup className="flex-wrap">
                    {[1, 2, 3].map((i) =>
                        <Button
                            className="py-2"
                            id={i}
                            variant="outline-primary"
                            disabled={this.buttonIsDisabled(i)}
                            onClick={this.onDialClicked}
                        >
                            {i}
                        </Button>
                    )}
                </ButtonGroup>
                <ButtonGroup className="flex-wrap">
                    {[4, 5, 6].map((i) =>
                        <Button
                            className="py-2"
                            id={i}
                            variant="outline-primary"
                            disabled={this.buttonIsDisabled(i)}
                            onClick={this.onDialClicked}
                        >
                            {i}
                        </Button>
                    )}
                </ButtonGroup>
                <ButtonGroup className="flex-wrap">
                    {[7, 8, 9].map((i) =>
                        <Button
                            className="py-2"
                            id={i}
                            variant="outline-primary"
                            disabled={this.buttonIsDisabled(i)}
                            onClick={this.onDialClicked}
                        >
                            {i}
                        </Button>
                    )}
                </ButtonGroup>
                <ButtonGroup className="justify-content-evenly">
                    <Button
                        className="py-2"
                        variant="outline-primary"
                        disabled={this.state.numIngredients === 0}
                        // style={{display: "hidden"}}
                        onClick={this.accept}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="16" fill="currentColor"
                             className="bi bi-check-lg" viewBox="0 0 14 14">
                            <path
                                d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
                        </svg>
                    </Button>
                    <Button
                        id={0}
                        className="py-2"
                        variant="outline-primary"
                        disabled={this.buttonIsDisabled(0)}
                        onClick={this.onDialClicked}
                    >
                        0
                    </Button>
                    <Button
                        id="del"
                        className="py-2"
                        variant="outline-primary"
                        onClick={this.onDialClicked}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="16" fill="currentColor"
                             className="bi bi-backspace-fill" viewBox="0 0 16 16">
                            <path
                                d="M15.683 3a2 2 0 0 0-2-2h-7.08a2 2 0 0 0-1.519.698L.241 7.35a1 1 0 0 0 0 1.302l4.843 5.65A2 2 0 0 0 6.603 15h7.08a2 2 0 0 0 2-2V3zM5.829 5.854a.5.5 0 1 1 .707-.708l2.147 2.147 2.146-2.147a.5.5 0 1 1 .707.708L9.39 8l2.146 2.146a.5.5 0 0 1-.707.708L8.683 8.707l-2.147 2.147a.5.5 0 0 1-.707-.708L7.976 8 5.829 5.854z"/>
                        </svg>
                    </Button>

                </ButtonGroup>
            </div>
        );
    }
}
