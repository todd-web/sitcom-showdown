// Roster data, kept separate from the engine so any cast can plug into the same game.
window.GAME_TITLE = "SITCOM SHOWDOWN";
window.GAME_SUBTITLE = "A 90s fan tribute";

window.STAGES = {
  winslow: { name: "The Winslow House", file: "assets/stages/winslow.webp", sky: ["#3b2a4a", "#8a5a44"] },
  banks:   { name: "The Banks Mansion", file: "assets/stages/banks.webp",   sky: ["#1c3a5a", "#d9a35a"] },
  martin:  { name: "Martin's Apartment", file: "assets/stages/martin.webp", sky: ["#2a1f3d", "#b0503a"] },
  flavor:  { name: "Flavor Magazine",   file: "assets/stages/flavor.webp",  sky: ["#1f2f3f", "#c9874a"] },
  den:     { name: "The Den",           file: "assets/stages/den.webp",     sky: ["#2b1d33", "#c0603f"] },
  hillman: { name: "The Pit, Hillman College", file: "assets/stages/hillman.webp", sky: ["#1d2b44", "#7a8f4a"] },
  goodburger: { name: "Good Burger",   file: "assets/stages/goodburger.webp", sky: ["#5a1d1d", "#e0b040"] },
  rigbys:  { name: "Rigby's",           file: "assets/stages/rigbys.webp",  sky: ["#1d3b3a", "#c9a24a"] },
};

// speed: walk pixels per frame. power: damage multiplier. stage: home stage key.
window.ROSTER = [
  { id: "urkel", size: 1.0,    name: "STEVE URKEL",   show: "Family Matters",  stage: "winslow", speed: 5.0, power: 0.95, special: "URKEL-TRON BLASTER", super: "DID I DO THAT?!" },
  { id: "carl", size: 1.02,     name: "CARL WINSLOW",  show: "Family Matters",  stage: "winslow", speed: 3.6, power: 1.2,  special: "STEEEVE!",          super: "SERGEANT SLAM" },
  { id: "will", size: 1.04,     name: "WILL",          show: "Fresh Prince",    stage: "banks",   speed: 5.2, power: 1.0,  special: "BEL-AIR BOUNCE PASS", super: "FRESH PRINCE FLEX" },
  { id: "carlton", size: 0.86,  name: "CARLTON",       show: "Fresh Prince",    stage: "banks",   speed: 5.0, power: 0.95, special: "THE CARLTON",       super: "IT'S NOT UNUSUAL" },
  { id: "phil", size: 1.06,     name: "UNCLE PHIL",    show: "Fresh Prince",    stage: "banks",   speed: 3.3, power: 1.25, special: "JUDGE'S CHARGE",    super: "OUT THE FRONT DOOR" },
  { id: "khadijah", size: 0.96, name: "KHADIJAH",      show: "Living Single",   stage: "flavor",  speed: 4.5, power: 1.05, special: "FLAVOR SWAT",       super: "EDITOR-IN-CHIEF" },
  { id: "regine", size: 0.96,   name: "REGINE",        show: "Living Single",   stage: "flavor",  speed: 4.6, power: 1.0,  special: "DIVA WAVE",         super: "REGINE'S REIGN" },
  { id: "moesha", size: 0.94,   name: "MOESHA",        show: "Moesha",          stage: "den",     speed: 5.3, power: 0.95, special: "DEN SPIN KICK",     super: "DEAR DIARY" },
  { id: "dwayne", size: 0.99,   name: "DWAYNE WAYNE",  show: "A Different World", stage: "hillman", speed: 5.0, power: 1.0, special: "FLIP-UP FLASH",    super: "HILLMAN HONORS" },
  { id: "tommy", size: 1.05,    name: "TOMMY",         show: "Martin",          stage: "martin",  speed: 4.8, power: 1.0,  special: "APPLICATION BLIZZARD", super: "WHAT JOB?!" },
  { id: "dragonfly", size: 0.97, name: "DRAGONFLY JONES", show: "Martin",        stage: "martin",  speed: 5.4, power: 1.0,  special: "DRAGONFLY KICK",    super: "SILENCE!" },
  { id: "keenan", size: 0.96,   name: "KEENAN",        show: "Keenan & Kel",    stage: "rigbys",  speed: 4.2, power: 1.1,  special: "RIGBY'S CART CRASH", super: "CLEANUP ON AISLE 5" },
  { id: "ed", size: 1.04,       name: "ED",            show: "Good Burger",     stage: "goodburger", speed: 4.9, power: 0.95, special: "GOOD BURGER FASTBALL", super: "CAN I TAKE YOUR ORDER?!" },
];
