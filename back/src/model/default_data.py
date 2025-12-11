from back.src.entity.achievement import Achievement
from back.src.entity.insult import Insult

ACHIEVEMENTS = [
    Achievement(
        title="Gotta eat'em all!",
        description="Esse alle Zutaten des Raclottos",
        value=10,
        hidden=False,
        is_global=False  # Session-specific: "des Raclottos"
    ),
    Achievement(
        title="King of the Sauce",
        description="Esse alle Saucen des Raclottos",
        value=10,
        hidden=False,
        is_global=False  # Session-specific: "des Raclottos"
    ),
    Achievement(
        title="Stack Overflow!",
        description="Esse eine Pfanne mit mehr als 10 Zutaten",
        value=8,
        hidden=False,
        is_global=True  # Global: any pan
    ),
    Achievement(
        title="King of the Grill",
        description="Esse am meisten Pfannen in einem Raclotto",
        value=20,
        hidden=False,
        is_global=False  # Session-specific: "in einem Raclotto"
    ),
    Achievement(
        title="Garbage Collector",
        description="Esse eine Pfanne nach einer 3-stündigen Pause",
        value=5,
        hidden=False,
        is_global=True  # Global: any pan
    ),
    Achievement(
        title="Happy new Year",
        description="Esse die erste Pfanne des Jahres",
        value=6,
        hidden=True,
        is_global=True  # Global: first pan of the year
    ),
    Achievement(
        title="Local Guide",
        description="Bewerte 10 Pfannen",
        value=3,
        hidden=False,
        is_global=True  # Global: 10 ratings total
    ),
    Achievement(
        title="Local Host",
        description="Eröffne 10 Raclottos",
        value=10,
        hidden=False,
        is_global=True  # Global: 10 sessions total
    ),
    Achievement(
        title="First Blood!",
        description="Esse die erste Pfanne des Raclottos",
        value=10,
        hidden=False,
        is_global=False  # Session-specific: "des Raclottos"
    ),
    Achievement(
        title="Double Kill!",
        description="Erhalte eine identische Pfanne direkt hintereinander",
        value=30,
        hidden=False,
        is_global=True  # Global: any two consecutive pans
    ),
    Achievement(
        title="Second to none",
        description="Starte eine Pfanne in der letzten Minute des Jahres",
        value=15,
        hidden=True,
        is_global=True  # Global: any pan at end of year
    ),
    Achievement(
        title="Zeit für ein D- D- D- Duell!",
        description="Beende ein Raclotto mit 2 Racleuren",
        value=8,
        hidden=True,
        is_global=False  # Session-specific: "ein Raclotto"
    ),
    Achievement(
        title="Connoisseur",
        description="Füge eine nie dagewesene Zutat hinzu",
        value=3,
        hidden=False,
        is_global=True  # Global: any new ingredient
    ),
    Achievement(
        title="Last Pan standing",
        description="Esse die letzte Pfanne eines Raclottos",
        value=8,
        hidden=False,
        is_global=False  # Session-specific: "eines Raclottos"
    ),
    Achievement(
        title="Easter Egg",
        description="Esse eine Pfanne mit Ei an Ostern",
        value=50,
        hidden=False,
        is_global=True  # Global: any pan at Easter
    ),
    Achievement(
        title="Vanilla",
        description="Esse eine Pfanne mit nur einer Zutat",
        value=10,
        hidden=False,
        is_global=True  # Global: any pan
    ),
    Achievement(
        title="Pandler",
        description="Nimm an 2 Raclottos innerhalb von 24h teil",
        value=10,
        hidden=False,
        is_global=True  # Global: across sessions
    ),
    Achievement(
        title="Wizard",
        description="Schätze die richtige Anzahl der Pfannen eines Raclottos",
        value=35,
        hidden=False,
        is_global=False  # Session-specific: "eines Raclottos"
    ),
    Achievement(
        title="Survival of the Fittest",
        description="Esse die schlecht bewerteste Pfanne",
        value=10,
        hidden=False,
        is_global=False  # Session-specific: worst in a session
    ),
    Achievement(
        title="Raclotto Normalverbraucher",
        description="Esse eine Pfanne mit Käse und Kartoffel",
        value=12,
        hidden=False,
        is_global=True  # Global: any pan
    ),
    Achievement(
        title="VerPant",
        description="Mache deine erste Pfanne eine Stunde nach Start des Raclottos",
        value=5,
        hidden=True,
        is_global=False  # Session-specific: "des Raclottos"
    ),
    Achievement(
        title="Pantastic",
        description="Erstelle die best bewerteste Pfanne eines Raclottos",
        value=8,
        hidden=False,
        is_global=False  # Session-specific: "eines Raclottos"
    ),
    Achievement(
        title="Steakholder",
        description="Esse 5 Pfannen mit Fleisch",
        value=5,
        hidden=False,
        is_global=True  # Global: 5 pans total
    ),
    Achievement(
        title="Biotonne",
        description="Esse 5 vegane Pfannen",
        value=5,
        hidden=False,
        is_global=True  # Global: 5 pans total
    ),
    Achievement(
        title="Pan Sexual",
        description="Bewerte deine Pfannen mit durchschnittlich 4+",
        value=8,
        hidden=True,
        is_global=True  # Global: average across all ratings
    ),
    Achievement(
        title="JaPan",
        description="Esse eine Pfanne mit ausschließlich Fisch",
        value=12,
        hidden=False,
        is_global=True  # Global: any pan
    ),
    Achievement(
        title="Pan-O-Rama",
        description="Esse eine Pfanne mit Butter",
        value=5,
        hidden=False,
        is_global=True  # Global: any pan
    ),
    Achievement(
        title="Panini",
        description="Esse eine Pfanne mit Teig",
        value=6,
        hidden=False,
        is_global=True  # Global: any pan
    ),
    Achievement(
        title="Panda",
        description="Esse eine Pfanne mit 5 Gemüsezutaten und sonst nichts",
        value=11,
        hidden=False,
        is_global=True  # Global: any pan
    ),
    Achievement(
        title="Pan-nic",
        description="Starte ein Raclotto unter freim Himmel",
        value=15,
        hidden=False,
        is_global=True  # Global: any session creation
    ),
]

INSULTS = [
    Insult(title="5-Minuten Terrinen Kocher"),
    Insult(title="Rabingospieler"),
    Insult(title="Thermomixer"),
    Insult(title="Nichtsnutz"),
    Insult(title="Unkreativling"),
    Insult(title="BZgA Beratungsstelle"),
    Insult(title="Panner"),
    Insult(title="Langweiler"),
    Insult(title="Spielverderber"),
    Insult(title="Lauch")
]

