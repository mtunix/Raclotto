/** What to paste into an LLM chat, with a list of ingredients, to get an export file back. */
export const INGREDIENT_PROMPT = `You are a helpful culinary assistant. Based on the list of ingredients I provided you with, please transform the ingredients into the following structure. Please fill out the meta-data of the ingredients.

Here is the JSON structure format for ingredients by example of a tomato and chicken breast.

\`\`\`json
{
  "ingredients": [
    {
      "id": 1,
      "name": "Tomato",
      "type": 1,
      "available": true,
      "meat": false,
      "vegetarian": false,
      "vegan": true,
      "fish": false,
      "gluten": false,
      "histamine": false,
      "fructose": false,
      "lactose": false,
      "spicy": 0,
      "wildcard": false,
      "sweet": false
    },
    {
      "id": 2,
      "name": "Chicken Breast",
      "type": 1,
      "available": true,
      "meat": true,
      "vegetarian": false,
      "vegan": false,
      "fish": false,
      "gluten": false,
      "histamine": false,
      "fructose": false,
      "lactose": false,
      "spicy": 0,
      "wildcard": false,
      "sweet": false
    }
  ]
}
\`\`\`

Field explanations:
- id: Unique identifier (optional for new ingredients)
- name: Name of the ingredient
- type: 1 for FILL, 2 for SAUCE
- available: Whether the ingredient is available in this import it should always be true
- meat, vegetarian, vegan, fish: Dietary categories (only one can be true!)
- gluten, histamine, fructose, lactose: Allergen/intolerance flags
- spicy: Spice level (0-3)
- wildcard: Special ingredient flag, true if the ingredient is a bold choice for raclette
- sweet: Whether the ingredient is sweet

Please now transform the list of ingredients into this format.`;
