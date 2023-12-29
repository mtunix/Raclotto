import {useState} from "react";

function getLocalSession() {
    try {
        return localStorage.getItem("player") ?? "";
    } catch (e) {
        return "";
    }
}

export function usePlayer() {
    const [player, setPlayer] = useState(getLocalSession());

    const changePlayer = (player) => {
        setPlayer(player);
        localStorage.setItem("player", player)
    };

    return {
        player: player,
        setPlayer: changePlayer
    }
}