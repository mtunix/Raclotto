var ingredients = [];

window.onload = function() {
	$('#inputIngredient').keypress(function(event) {
		if (event.which == 13) addIngredient();	
	});

	$('#inputCount').keypress(function(event) {
		if (event.which == 13) gimmeSomeFood();	
	});
}

function addIngredient() {
	let listContainer = find("ingredientList");
	let ingredient = find("inputIngredient").value;
	if (ingredient !== undefined) {
		ingredients.push(ingredient);
		listContainer.appendChild(generateIngredient(ingredients.length-1, true));
		find("inputIngredient").value = "";
	}
}

function deleteIngredient(id) {
	$('#' + id).remove();
	ingredients.splice(id - 1, 1);
}

function generateIngredient(id, deleteFlag) {
	let ingredient = document.createElement("div");
	ingredient.innerHTML = ingredients[id];
	ingredient.id = id;
	ingredient.setAttribute("class", "ingredient");

	if (deleteFlag) {
		let deleteButton = document.createElement("button");
		deleteButton.innerHTML = "Raus aus dem Topf";
		deleteButton.addEventListener("click", function() { deleteIngredient(id);  });
		ingredient.appendChild(deleteButton);
	}	


	return ingredient;
}

function gimmeSomeFood() {
	let randoms = randomize($('#inputCount').val());
	$('#ingredientsRandom').empty();
	for (let i = 0; i < randoms.length; ++i)
		$('#ingredientsRandom').append(generateIngredient(randoms[i], false));
}	

function randomize(count) {
	let randomIngredients = [];
	count = count > ingredients.length ? ingredients.length : count;

	for (let i = 0; i < count;) {
		let random = Math.trunc(Math.random() * ingredients.length);
		if (!randomIngredients.includes(random)) {
			randomIngredients.push(random);
			++i;
		}
	}

	return randomIngredients;
}

function find(id) {
	return document.getElementById(id);
}
