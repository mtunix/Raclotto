from back.src.entity.achievement import Achievement
from back.src.entity.insult import Insult
from back.src.entity.level import Level

ACHIEVEMENTS = [
    Achievement(
        title="Gotta eat'em all!",
        description="Esse alle Zutaten des Raclottos",
        value=10,
        hidden=False,
        is_global=False,  # Session-specific: "des Raclottos"
    ),
    Achievement(
        title="King of the Sauce",
        description="Esse alle Saucen des Raclottos",
        value=10,
        hidden=False,
        is_global=False,  # Session-specific: "des Raclottos"
    ),
    Achievement(
        title="Stack Overflow!",
        description="Esse eine Pfanne mit mehr als 10 Zutaten",
        value=8,
        hidden=False,
        is_global=True,  # Global: any pan
    ),
    Achievement(
        title="King of the Grill",
        description="Esse am meisten Pfannen in einem Raclotto",
        value=20,
        hidden=False,
        is_global=False,  # Session-specific: "in einem Raclotto"
    ),
    Achievement(
        title="Garbage Collector",
        description="Esse eine Pfanne nach einer 3-stündigen Pause",
        value=5,
        hidden=False,
        is_global=False,  # Session-specific: track pause within current session
    ),
    Achievement(
        title="Happy new Year",
        description="Esse die erste Pfanne des Jahres",
        value=6,
        hidden=True,
        is_global=True,  # Global: first pan of the year
    ),
    Achievement(
        title="Local Guide",
        description="Bewerte 10 Pfannen",
        value=3,
        hidden=False,
        is_global=True,  # Global: 10 ratings total
    ),
    Achievement(
        title="Local Host",
        description="Eröffne ein Raclotto",
        value=10,
        hidden=False,
        is_global=True,  # Global: 1 session total
    ),
    Achievement(
        title="First Blood!",
        description="Esse die erste Pfanne des Raclottos",
        value=10,
        hidden=False,
        is_global=False,  # Session-specific: "des Raclottos"
    ),
    Achievement(
        title="Double Kill!",
        description="Erhalte eine identische Pfanne direkt hintereinander",
        value=30,
        hidden=False,
        is_global=False,  # Session-specific: consecutive pans in current session
    ),
    Achievement(
        title="Second to none",
        description="Starte eine Pfanne in der letzten Minute des Jahres",
        value=15,
        hidden=True,
        is_global=True,  # Global: any pan at end of year
    ),
    Achievement(
        title="Zeit für ein D- D- D- Duell!",
        description="Beende ein Raclotto mit 2 Racleuren",
        value=8,
        hidden=True,
        is_global=False,  # Session-specific: "ein Raclotto"
    ),
    Achievement(
        title="Connoisseur",
        description="Füge eine nie dagewesene Zutat hinzu",
        value=3,
        hidden=False,
        is_global=True,  # Global: any new ingredient
    ),
    Achievement(
        title="Last Pan standing",
        description="Esse die letzte Pfanne eines Raclottos",
        value=8,
        hidden=False,
        is_global=False,  # Session-specific: "eines Raclottos"
    ),
    Achievement(
        title="Easter Egg",
        description="Esse eine Pfanne mit Ei an Ostern",
        value=50,
        hidden=False,
        is_global=True,  # Global: any pan at Easter
    ),
    Achievement(
        title="Vanilla",
        description="Esse eine Pfanne mit nur einer Zutat",
        value=10,
        hidden=False,
        is_global=False,  # Session-specific: pan in current session
    ),
    Achievement(
        title="Pandler",
        description="Nimm an 2 Raclottos innerhalb von 24h teil",
        value=10,
        hidden=False,
        is_global=True,  # Global: across sessions
    ),
    Achievement(
        title="Wizard",
        description="Schätze die richtige Anzahl der Pfannen eines Raclottos",
        value=35,
        hidden=False,
        is_global=False,  # Session-specific: "eines Raclottos"
    ),
    Achievement(
        title="Survival of the Fittest",
        description="Esse die schlecht bewerteste Pfanne eines Raclottos (mindestens 2 Bewertungen)",
        value=10,
        hidden=False,
        is_global=False,  # Session-specific: worst in a session
    ),
    Achievement(
        title="Raclotto Normalverbraucher",
        description="Esse eine Pfanne mit Käse und Kartoffel",
        value=12,
        hidden=False,
        is_global=True,  # Global: any pan
    ),
    Achievement(
        title="VerPant",
        description="Mache deine erste Pfanne eine Stunde nach Start des Raclottos",
        value=5,
        hidden=True,
        is_global=False,  # Session-specific: "des Raclottos"
    ),
    Achievement(
        title="Pantastic",
        description="Erstelle die best bewerteste Pfanne eines Raclottos (mindestens 2 Bewertungen)",
        value=8,
        hidden=False,
        is_global=False,  # Session-specific: "eines Raclottos"
    ),
    Achievement(
        title="Steakholder",
        description="Esse 5 Pfannen mit Fleisch",
        value=5,
        hidden=False,
        is_global=False,  # Session-specific: 5 pans in a session
    ),
    Achievement(
        title="Biotonne",
        description="Esse 5 vegane Pfannen",
        value=5,
        hidden=False,
        is_global=False,  # Session-specific: 5 pans in a session
    ),
    Achievement(
        title="Pan Sexual",
        description="Bewerte deine Pfannen mit durchschnittlich 4+",
        value=8,
        hidden=True,
        is_global=True,  # Global: average across all ratings
    ),
    Achievement(
        title="JaPan",
        description="Esse eine Pfanne mit ausschließlich Fisch",
        value=12,
        hidden=False,
        is_global=True,  # Global: any pan
    ),
    Achievement(
        title="Pan-O-Rama",
        description="Esse eine Pfanne mit Butter",
        value=5,
        hidden=False,
        is_global=True,  # Global: any pan
    ),
    Achievement(
        title="Panini",
        description="Esse eine Pfanne mit Teig",
        value=6,
        hidden=False,
        is_global=True,  # Global: any pan
    ),
    Achievement(
        title="Panda",
        description="Esse eine Pfanne mit 5 Gemüsezutaten und sonst nichts",
        value=11,
        hidden=False,
        is_global=True,  # Global: any pan
    ),
    Achievement(
        title="Pan-nic",
        description="Starte ein Raclotto unter freim Himmel",
        value=15,
        hidden=False,
        is_global=True,  # Global: any session creation
    ),
    Achievement(
        title="Copy & Paste",
        description="Baue die Pfanne deines Sitznachbarn exakt 1:1 nach",
        value=10,
        hidden=True,
        is_global=False,
    ),
    Achievement(
        title="Cheesus Christ",
        description="Staple mindestens 3 verschiedene Käsesorten auf einer Pfanne",
        value=12,
        hidden=False,
        is_global=False,
    ),
    Achievement(
        title="Marzi-Pan",
        description="Esse eine suesse Pfanne",
        value=5,
        hidden=False,
        is_global=False,
    ),
    Achievement(
        title="Firewall",
        description="Esse eine Pfanne mit Chili und einer scharfen Sauce",
        value=10,
        hidden=False,
        is_global=False,
    ),
    Achievement(
        title="404 Cheese not found",
        description="Esse eine Pfanne ohne Käse",
        value=20,
        hidden=True,
        is_global=False,
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
    Insult(title="Lauch"),
]

LEVELS = [
    Level(
        name="level.pfannenPraktikant",
        label_en="Pan Apprentice",
        label_de="Pfannen Praktikant",
        required_experience=0,
    ),
    Level(
        name="level.kaeseKnauserer",
        label_en="Cheese Miser",
        label_de="Käse Knauserer",
        required_experience=100,
    ),
    Level(
        name="level.kartoffelPionier",
        label_en="Potato Pioneer",
        label_de="Kartoffel Pionier",
        required_experience=250,
    ),
    Level(
        name="level.beilagenBaendiger",
        label_en="Side Dish Tamer",
        label_de="Beilagen Bändiger",
        required_experience=450,
    ),
    Level(
        name="level.knoblauchKrieger",
        label_en="Garlic Warrior",
        label_de="Knoblauch Krieger",
        required_experience=700,
    ),
    Level(
        name="level.saucenSucher",
        label_en="Sauce Seeker",
        label_de="Saucen Sucher",
        required_experience=1000,
    ),
    Level(
        name="level.jalapenoJaeger",
        label_en="Jalapeño Hunter",
        label_de="Jalapeño Jäger",
        required_experience=1350,
    ),
    Level(
        name="level.ananasApostel",
        label_en="Pineapple Apostle",
        label_de="Ananas Apostel",
        required_experience=1750,
    ),
    Level(
        name="level.zwiebelZelebrator",
        label_en="Onion Celebrator",
        label_de="Zwiebel Zelebrator",
        required_experience=2200,
    ),
    Level(
        name="level.pfannenArchitekt",
        label_en="Pan Architect",
        label_de="Pfannen Architekt",
        required_experience=2700,
    ),
    Level(
        name="level.drehDoktor",
        label_en="Spin Doctor",
        label_de="Dreh Doktor",
        required_experience=3300,
    ),
    Level(
        name="level.zufallsZaehmer",
        label_en="Randomness Tamer",
        label_de="Zufalls Zähmer",
        required_experience=4000,
    ),
    Level(
        name="level.stapelSpezialist",
        label_en="Stack Specialist",
        label_de="Stapel Spezialist",
        required_experience=4800,
    ),
    Level(
        name="level.vierSchichtVirtuose",
        label_en="Four Layer Virtuoso",
        label_de="Vier Schicht Virtuose",
        required_experience=5700,
    ),
    Level(
        name="level.jackpotJaeger",
        label_en="Jackpot Hunter",
        label_de="Jackpot Jäger",
        required_experience=6700,
    ),
    Level(
        name="level.gaumenGrossherzog",
        label_en="Palate Grand Duke",
        label_de="Gaumen Großherzog",
        required_experience=7800,
    ),
    Level(
        name="level.brutzlerBoss",
        label_en="Sizzler Boss",
        label_de="Brutzler Boss",
        required_experience=9000,
    ),
    Level(
        name="level.kaeseKaiser",
        label_en="Cheese Emperor",
        label_de="Käse Kaiser",
        required_experience=10300,
    ),
    Level(
        name="level.gourmetGouverneur",
        label_en="Gourmet Governor",
        label_de="Gourmet Gouverneur",
        required_experience=11700,
    ),
    Level(
        name="level.raclottoRegent",
        label_en="Raclotto Regent",
        label_de="Raclotto Regent",
        required_experience=13200,
    ),
]
