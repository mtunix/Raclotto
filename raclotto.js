var ingredients = [];
var sauces = []

types = {
    ingredient: "ingredient",
    sauce: "sauce"
}

window.onload = function () {
    if (localStorage.getItem('ingredients')) {
        ingredients = JSON.parse(localStorage.getItem('ingredients'))
        populate(types.ingredient)
    }

    if (localStorage.getItem('sauces')) {
        sauces = JSON.parse(localStorage.getItem('sauces'))
        populate(types.sauce)
    }

    $('#input-ingredient').keypress(function (event) {
        if (event.which == 13) add(types.ingredient);
    });

    $('#input-sauce').keypress(function (event) {
        if (event.which == 13) add(types.sauce);
    });

    $('#input-count').keypress(function (event) {
        if (event.which == 13) gimmeSomeFood();
    });

    $('#btn-add-ingredient').click(function (event) {
        add(types.ingredient)
    });

    $('#btn-add-sauce').click(function (event) {
        add(types.sauce)
    });

    $('#btn-gimme-food').click(function () {
        gimmeSomeFood()
    });
}

function add(type) {
    let listContainer = find(type + "-list")
    let item = find("input-" + type).value
    if (item !== undefined) {
        window[type + "s"].push(item)
        listContainer.appendChild(generate(window[type + "s"].length - 1, type, true))
        find("input-" + type).value = ""
    }
    localStorage.setItem(type + "s", JSON.stringify(window[type + "s"]))
}

function populate(type) {
    let listContainer = find(type + "-list")
    for (let i = 0; i < window[type + "s"].length; ++i) {
        listContainer.appendChild(generate(i, type, true))
    }
}

function remove(type, id) {
    $('#' + type + id).remove();
    window[type + "s"].splice(id - 1, 1);
	localStorage.setItem(type + "s", JSON.stringify(window[type + "s"]))
}

function generate(id, type, allowDelete) {
    let item = document.createElement("div")
    item.innerHTML = window[type + "s"][id];
    item.id = type + id
    item.setAttribute("class", "ingredient")

    if (allowDelete) {
        let button = document.createElement("button")
        button.setAttribute("type", "button")
        button.setAttribute("class", "btn btn-danger")
        button.innerHTML = "Raus aus dem Topf"
        button.addEventListener("click", function () {
            remove(type, id);
        })
        item.appendChild(button)
    }

    return item
}

function gimmeSomeFood() {
    let randomIngredients = randomize($('#input-ingredient-count').val(), types.ingredient);
    let randomSauces = randomize($('#input-sauce-count').val(), types.sauce)
    $('#ingredients-random').empty();
    for (let i = 0; i < randomIngredients.length; ++i)
        $('#ingredients-random').append(generate(randomIngredients[i], types.ingredient, false));

    for (let i = 0; i < randomSauces.length; ++i)
        $('#ingredients-random').append(generate(randomSauces[i], types.sauce, false));
}

function randomize(count, type) {
    let randoms = [];
    count = count > window[type + "s"].length ? window[type + "s"].length : count;

    for (let i = 0; i < count;) {
        let random = Math.trunc(Math.random() * window[type + "s"].length);
        if (!randoms.includes(random)) {
            randoms.push(random);
            ++i;
        }
    }

    return randoms;
}

function find(id) {
    return document.getElementById(id);
}
