import React from "react";
import {ButtonGroup, Form, ToggleButton} from "react-bootstrap";

export class SettingsView extends React.Component {
   constructor(props) {
       super(props);

       this.options = [
           {"name": "vegetarian", "localized": "Vegetarisch"},
           {"name": "vegan", "localized": "Vegan"},
           {"name": "histamine", "localized": "Histamin"},
           {"name": "gluten", "localized": "Gluten"},
           {"name": "fructose", "localized": "Fructose"},
           {"name": "lactose", "localized": "Lactose"},
       ];

       this.state = {
           vegetarian: true,
           vegan: true,
           gluten: true,
           histamine: true,
           fructose: true,
           lactose: true,
           name: "",
       }
   }

   componentDidMount() {
       for (let opt in this.options) {
           if (localStorage.getItem(opt.name)) {
               this.setState({
                   [opt.name]: localStorage.getItem(opt.name) === 'true'
               });
           }
       }

       if (localStorage.getItem("name")) {
           this.setState({"name":localStorage.getItem("name")})
       }
   }

    setChecked = (event) => {
        let type = event.target.id;
        let state = this.state[type];
        this.setState({[type]: !state}, () => {
            localStorage.setItem(type, String(!state))
        })
    };

    onNameChanged = (event) => {
        this.setState({"name": event.target.value}, () => {
            localStorage.setItem("name", event.target.value);
            this.props.onUserChanged(event.target.value);
        });
    };

    render() {
       let checks = this.options.map((option) =>
           <ToggleButton
               className="mb-2"
               id={option.name}
               type="checkbox"
               variant="outline-primary"
               checked={this.state[option.name]}
               onChange={this.setChecked}
           >
               {option.localized}
           </ToggleButton>
       );

       return (
           <div>
               <Form.Group className="mb-3" controlId="formIngredientName">
                   <Form.Label>Ich bin</Form.Label>
                   <Form.Control
                       value={this.state.name}
                       onChange={this.onNameChanged}
                       type="name"
                       placeholder="Namen eingeben"
                   />
               </Form.Group>
               <Form.Group className="d-grid gap-2 mt-2 mb-3" controlId="formIngredientName">
                   <Form.Label>Das alles ist okay zum Snacken</Form.Label>
                   <ButtonGroup className="flex-wrap">
                       {checks}
                   </ButtonGroup>
               </Form.Group>
           </div>
       );
   }
}