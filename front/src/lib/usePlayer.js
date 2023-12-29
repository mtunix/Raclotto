import {useState} from "react";

function getLocalSession() {
    try {
        return localStorage.getItem("name") ?? "";
    } catch (e) {
        return "";
    }
}

export function usePlayer() {
    const [player, setPlayer] = useState(getLocalSession());

    const changePlayer = (player) => {
        setPlayer(player);
        localStorage.setItem("name", player)
    };

    return {
        player: player,
        setPlayer: changePlayer
    }
}