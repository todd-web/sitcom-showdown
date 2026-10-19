// Rerun Rumble roster data. Data only: the engine reads window.ROSTER, window.STAGES and window.CITIES.
// Unofficial fan tribute. Flavor text is drawn from real show lines and running jokes.
window.GAME_TITLE = "PRIME TIME BRAWL";
window.GAME_SUBTITLE = "An all-time Black sitcom fan tribute";
// the tag team super's on-screen name (cut-in and banner): one show joke for every pair; a fighter's tagSuperName overrides it
window.TAG_SUPER_NAME = "FAMILY REUNION";
// original network run of each show, shown under the fighter's name on the select and VS screens
window.SHOW_YEARS = {
  "The Jeffersons": "1975-1985", "Sanford and Son": "1972-1977", "What's Happening!!": "1976-1979", "Good Times": "1974-1979",
  "The Cosby Show": "1984-1992", "A Different World": "1987-1993", "Family Matters": "1989-1998", "The Fresh Prince of Bel-Air": "1990-1996",
  "Martin": "1992-1997", "Moesha": "1996-2001", "Sister, Sister": "1994-1999", "Keenan & Kel": "1996-2000",
};

// Stages. Home stages carry a walker key (background side character; walkers are switched off in the engine,
// the art stays on disk) and point breakInto at the show's second stage; break stages point breakInto back at
// the home stage. breakFallback: the target used while the breakInto stage art is not on disk.
window.STAGES = {
  // The Jeffersons
  deluxe:        { name: "The Deluxe Apartment",       file: "assets/stages/deluxe.webp",        sky: ["#2a2440", "#c79a52"], decade: "70s", breakInto: "drycleaners",   walker: "deluxe_walker" },
  drycleaners:   { name: "Jefferson Cleaners",         file: "assets/stages/drycleaners.webp",   sky: ["#1f3340", "#9fb0a0"], decade: "70s", breakInto: "deluxe" },
  // Sanford and Son
  junkyard:      { name: "Sanford and Son Salvage",    file: "assets/stages/junkyard.webp",      sky: ["#3a2c1e", "#d08a3a"], decade: "70s", breakInto: "sanfordporch",  walker: "junkyard_walker" },
  sanfordporch:  { name: "The Sanford Front Porch",    file: "assets/stages/sanfordporch.webp",  sky: ["#2e3a4a", "#c9a05a"], decade: "70s", breakInto: "junkyard" },
  // What's Happening!!
  robs:          { name: "Rob's Place",                file: "assets/stages/robs.webp",          sky: ["#3a1f2a", "#d97a3a"], decade: "70s", breakInto: "whstreet",      walker: "robs_walker" },
  whstreet:      { name: "The Neighborhood Street",    file: "assets/stages/whstreet.webp",      sky: ["#2a3a5a", "#e0a050"], decade: "70s", breakInto: "robs" },
  // Good Times
  cabrini:       { name: "The Evans Apartment",        file: "assets/stages/cabrini.webp",       sky: ["#2b2a3a", "#a0704a"], decade: "70s", breakInto: "gthallway",     walker: "cabrini_walker" },
  gthallway:     { name: "The Building Hallway",       file: "assets/stages/gthallway.webp",     sky: ["#24282e", "#7a7a5a"], decade: "70s", breakInto: "cabrini" },
  // The Cosby Show
  brownstone:    { name: "The Huxtable Brownstone",    file: "assets/stages/brownstone.webp",    sky: ["#2a1e2e", "#c98a5a"], decade: "80s", breakInto: "cosbykitchen",  walker: "brownstone_walker" },
  cosbykitchen:  { name: "The Huxtable Kitchen",       file: "assets/stages/cosbykitchen.webp",  sky: ["#33302a", "#d9b070"], decade: "80s", breakInto: "brownstone" },
  // A Different World
  hillman:       { name: "The Pit, Hillman College",   file: "assets/stages/hillman.webp",       sky: ["#1d2b44", "#7a8f4a"], decade: "80s", breakInto: "dorm",          walker: "hillman_walker" },
  dorm:          { name: "Gilbert Hall",               file: "assets/stages/dorm.webp",          sky: ["#2a2440", "#b07a8a"], decade: "80s", breakInto: "hillman" },
  // Family Matters
  winslow:       { name: "The Winslow Kitchen",        file: "assets/stages/winslow.webp",       sky: ["#3b2a4a", "#8a5a44"], decade: "90s", breakInto: "winslowliving", walker: "winslow_walker" },
  winslowliving: { name: "The Winslow Living Room",    file: "assets/stages/winslowliving.webp", sky: ["#2e2a44", "#a0784a"], decade: "90s", breakInto: "winslow" },
  // The Fresh Prince of Bel-Air
  banks:         { name: "The Banks Mansion",          file: "assets/stages/banks.webp",         sky: ["#1c3a5a", "#d9a35a"], decade: "90s", breakInto: "banksfront",    breakFallback: "poolhouse", walker: "banks_walker" },
  banksfront:    { name: "The Banks Front Steps",      file: "assets/stages/banksfront.webp",    sky: ["#24405e", "#d8b878"], decade: "90s", breakInto: "banks" },
  poolhouse:     { name: "The Banks Pool House",       file: "assets/stages/poolhouse.webp",     sky: ["#1a4a6a", "#e0c070"], decade: "90s", breakInto: "banks" },
  // Martin
  martin:        { name: "Martin's Apartment",         file: "assets/stages/martin.webp",        sky: ["#2a1f3d", "#b0503a"], decade: "90s", breakInto: "wzup",          walker: "martin_walker" },
  wzup:          { name: "WZUP Studio",                file: "assets/stages/wzup.webp",          sky: ["#1a1a3a", "#c04a6a"], decade: "90s", breakInto: "martin" },
  // Moesha
  den:           { name: "The Den",                    file: "assets/stages/den.webp",           sky: ["#2b1d33", "#c0603f"], decade: "90s", breakInto: "moeshakitchen", walker: "den_walker" },
  moeshakitchen: { name: "The Mitchell Kitchen",       file: "assets/stages/moeshakitchen.webp", sky: ["#33283a", "#d0905a"], decade: "90s", breakInto: "den" },
  // Sister, Sister
  campbell:      { name: "The Campbell House",         file: "assets/stages/campbell.webp",      sky: ["#2a3448", "#c88a6a"], decade: "90s", breakInto: "campbellporch", walker: "campbell_walker" },
  campbellporch: { name: "The Campbell Front Porch",   file: "assets/stages/campbellporch.webp", sky: ["#2a4a6a", "#e0b080"], decade: "90s", breakInto: "campbell" },
  // Keenan & Kel
  rigbys:        { name: "Rigby's",                    file: "assets/stages/rigbys.webp",        sky: ["#1d3b3a", "#c9a24a"], decade: "90s", breakInto: "goodburger",    walker: "rigbys_walker" },
  goodburger:    { name: "Good Burger",                file: "assets/stages/goodburger.webp",    sky: ["#5a1d1d", "#e0b040"], decade: "90s", breakInto: "rigbys" },
};

// US map pins on a 1280x720 stylized map (x, y in canvas pixels), placed on game/assets/map.webp as drawn
// on 2026-10-17 (the engine's fallback outline uses the same frame). label: which side of the pin the city
// name sits on, so the three Los Angeles pins and the two New York pins do not overlap.
window.CITIES = {
  newyork:    { name: "New York",    x: 1058, y: 252, label: "right" },
  brooklyn:   { name: "Brooklyn",    x: 1072, y: 274, label: "right" },
  virginia:   { name: "Virginia",    x: 1030, y: 360, label: "right" },
  detroit:    { name: "Detroit",     x: 890,  y: 258, label: "right" },
  chicago:    { name: "Chicago",     x: 804,  y: 270, label: "left" },
  belair:     { name: "Bel-Air",     x: 214,  y: 424, label: "left" },
  losangeles: { name: "Los Angeles", x: 240,  y: 442, label: "right" },
  watts:      { name: "Watts",       x: 248,  y: 462, label: "left" },
};

// speed: walk pixels per frame. power: damage multiplier. size: on-screen height factor (every idle is built to the
// same box height, so size alone sets who is tall). Solved from _scratch/heights/heights.md, normalized so the
// average installed fighter keeps its on-screen height (the walker and HUD reference). Reach scales with it.
// stage: home stage key. breakStage: the show's break-into stage. tag: partner id.
// special / super1 / super2: move names. super is kept equal to super1 for the current engine.
// soundbites: clip keys (intro, super, win). lowHpLine: banner at 30 percent health.
// breakLine: banner on a stage break. roundLines: two-line round-start banner. winLine: win text.
// assist: the fighter's ASSIST striker (both heavies, or the ASSIST button; 50 meter, once per round, 6 s cooldown):
//   { key (assets/assists/assists.json entry), name (banner), attack: slap | swing | throw | tray | stun | pin, dmg,
//     voice: a clip key in assets/voice, or { line } to use the clip whose manifest line matches; none on disk = silent,
//     callPose (throw only: the caller's pose while throwing) }
// specialStart: startup frames of the special (default 12), so a wind-up pose can hold.
// super2Cycle: poses shown after the Level 2 super's startup, in order (the last one holds); poses not in the
//   manifest are skipped, and with none present the super shows super_2.
window.ROSTER = (() => {
const F = (o) => Object.assign(o, {
  super: o.super1,
  soundbites: { intro: o.id + "_intro", super: o.id + "_super", win: o.id + "_win" },
});

return [
  // 1. The Jeffersons
  F({ id: "george", size: 0.89, name: "GEORGE JEFFERSON", show: "The Jeffersons", stage: "deluxe", breakStage: "drycleaners", tag: "weezy", cityPin: "newyork",
    speed: 4.8, power: 1.0, special: "MOVIN' ON UP UPPERCUT", super1: "DRY CLEANING SPIN", super2: "DELUXE APARTMENT DROP",
    ticker: ["Movin' on up to the East Side, to a deluxe apartment in the sky.", "George is counting his dry cleaning stores again.", "Florence has a comeback ready before George rings the bell."],
    lowHpLine: "WEEEZY!", breakLine: "MOVIN' ON DOWN!", roundLines: ["GEORGE JEFFERSON STRUTS IN", "FLORENCE IS NOT IMPRESSED"], winLine: "Look, chump, just get out of here!",
    // the signature strut: walk-forward cycle and round-1 intro (6 game frames per drawn frame), plus a bounce per frame (px, minus = up)
    walkCycle: ["strut_1", "strut_2", "strut_3", "strut_4", "strut_5", "strut_6"],
    introCycle: ["strut_1", "strut_2", "strut_3", "strut_4", "strut_5", "strut_6"],
    cycleBob: [0, 4, -9, 0, 4, -9],
    assist: { key: "florence", name: "FLORENCE", attack: "slap", dmg: 70, voice: { line: "Florence is not impressed" } } }),
  F({ id: "weezy", size: 0.89, name: "WEEZY", show: "The Jeffersons", stage: "deluxe", breakStage: "drycleaners", tag: "george", cityPin: "newyork",
    speed: 4.6, power: 0.95, special: "POCKETBOOK SWING", super1: "MOTHER JEFFERSON CALL", super2: "WE FINALLY GOT A PIECE",
    ticker: ["Mother Jefferson still says George married beneath him.", "Louise is off to the Help Center. George wants dinner.", "We finally got a piece of the pie."],
    lowHpLine: "GEORGE JEFFERSON!", breakLine: "WE FINALLY GOT A PIECE OF THE PIE!", roundLines: ["LOUISE JEFFERSON HAS HAD IT", "GEORGE, SIT DOWN"], winLine: "Oh, George." }),

  // 2. Sanford and Son
  F({ id: "fred", size: 1.02, name: "FRED SANFORD", show: "Sanford and Son", stage: "junkyard", breakStage: "sanfordporch", tag: "esther", cityPin: "watts",
    speed: 3.4, power: 1.15, special: "BIG ONE FAKE-OUT", super1: "YOU BIG DUMMY", super2: "ELIZABETH, I'M COMIN'",
    ticker: ["Fred is clutching his chest. This is the big one.", "Lamont is out on the truck. Fred is in charge of the yard.", "How 'bout five across the lips?"],
    lowHpLine: "THIS IS THE BIG ONE!", breakLine: "HOW 'BOUT FIVE ACROSS THE LIPS?", roundLines: ["FRED SANFORD SHUFFLES IN", "LAMONT IS NOT HERE TO STOP HIM"], winLine: "You big dummy!",
    specialStart: 40,   // the Big One chest clutch holds about 0.67 s before the sucker punch
    assist: { key: "grady", name: "GRADY", attack: "swing", dmg: 80, voice: "grady_assist" } }),
  F({ id: "esther", size: 0.94, name: "AUNT ESTHER", show: "Sanford and Son", stage: "junkyard", breakStage: "sanfordporch", tag: "fred", cityPin: "watts",
    speed: 3.8, power: 1.1, special: "WATCH IT, SUCKA PURSE", super1: "FISH-EYED FOOL SLAP", super2: "HEATHEN HAMMER",
    ticker: ["Aunt Esther brought her Bible and her pocketbook.", "Fred calls her ugly. Esther calls him a fish-eyed fool.", "Woodrow is waiting in the car."],
    lowHpLine: "OH, GLORY!", breakLine: "WATCH IT, SUCKA!", roundLines: ["AUNT ESTHER CLUTCHES HER POCKETBOOK", "FRED IS ALREADY TALKING"], winLine: "Fish-eyed fool!" }),

  // 3. What's Happening!!
  F({ id: "rerun", size: 1.02, name: "RERUN", show: "What's Happening!!", stage: "robs", breakStage: "whstreet", tag: "dee", cityPin: "losangeles",
    speed: 4.0, power: 1.2, special: "RERUN SHUFFLE", super1: "WHAT'S HAPPENING SPIN", super2: "DOOBIE BROTHERS BOOTLEG",
    ticker: ["Rerun got his name from summer school. He took it more than once.", "Shirley has had it with all three of them.", "Rerun is taping the Doobie Brothers. Nobody tell security."],
    lowHpLine: "RERUN TIGHTENS THE SUSPENDERS", breakLine: "WHAT'S HAPPENING!!", roundLines: ["RERUN DANCES IN", "THE RED BERET IS ON"], winLine: "What's happening!" }),
  F({ id: "dee", size: 0.85, name: "DEE", show: "What's Happening!!", stage: "robs", breakStage: "whstreet", tag: "rerun", cityPin: "losangeles",
    speed: 5.6, power: 0.85, special: "OOH, I'M TELLIN' MA", super1: "QUARTER PLEASE", super2: "BIG MOUTH BLAST",
    ticker: ["Dee is telling Mama. Raj knows it.", "Raj's little sister has an opinion on everything.", "If you don't give, you don't get."],
    lowHpLine: "OOH, I'M TELLIN' MAMA!", breakLine: "MAMA IS GONNA HEAR ABOUT THIS", roundLines: ["DEE THOMAS HAS ARRIVED", "SOMEBODY IS GETTING TOLD ON"], winLine: "Ooh, I'm tellin'!" }),

  // 4. Good Times
  F({ id: "jj", size: 1.14, name: "J.J. EVANS", show: "Good Times", stage: "cabrini", breakStage: "gthallway", tag: "james", cityPin: "chicago",
    speed: 5.2, power: 0.95, special: "DY-NO-MITE PAINTBRUSH", super1: "KID DY-NO-MITE", super2: "DY-NO-MITE FINALE",
    ticker: ["J.J. finished another painting. Thelma has reviews.", "Kid Dy-No-Mite is in the building.", "Michael is quoting history again. J.J. is quoting himself."],
    lowHpLine: "KID DY-NO-MITE IS NOT DONE", breakLine: "J.J. SIGNS HIS WORK ON THE WALL", roundLines: ["J.J. STRUTS OUT IN THE BUCKET HAT", "THELMA IS ALREADY ROLLING HER EYES"], winLine: "Dy-no-mite!" }),
  F({ id: "james", size: 1.08, name: "JAMES EVANS", show: "Good Times", stage: "cabrini", breakStage: "gthallway", tag: "jj", cityPin: "chicago",
    speed: 4.0, power: 1.2, special: "EVANS FAMILY HOOK", super1: "BELT LASH", super2: "GHETTO BURST",
    ticker: ["James is working two jobs and still has time for the belt.", "Florida says calm down. James does not calm down.", "The elevator is broke again. James took the stairs."],
    lowHpLine: "JAMES EVANS DOES NOT BACK DOWN", breakLine: "I'M GONNA MAKE A BELIEVER OUT OF YOU!", roundLines: ["JAMES EVANS JUST PULLED A DOUBLE SHIFT", "SOMEBODY IS GETTING THE BELT"], winLine: "I got it made in the shade." }),

  // 5. The Cosby Show
  F({ id: "cliff", size: 1.05, name: "CLIFF HUXTABLE", show: "The Cosby Show", stage: "brownstone", breakStage: "cosbykitchen", tag: "theo", cityPin: "brooklyn",
    speed: 3.8, power: 1.1, special: "HUXTABLE SWEATER SPIN", super1: "HOSPITAL SHIFT", super2: "THE TALK",
    ticker: ["Cliff has a brand new sweater. It has every color.", "Theo is in trouble. Cliff is warming up the speech.", "Clair gets the last word. Cliff gets the last dance."],
    lowHpLine: "CLIFF ROLLS UP THE SWEATER SLEEVES", breakLine: "I BROUGHT YOU IN THIS WORLD", roundLines: ["CLIFF HUXTABLE IS OFF THE CLOCK", "THEO HAS SOME EXPLAINING TO DO"], winLine: "Theo!" }),
  F({ id: "theo", size: 0.96, name: "THEO HUXTABLE", show: "The Cosby Show", stage: "brownstone", breakStage: "cosbykitchen", tag: "cliff", cityPin: "brooklyn",
    speed: 5.0, power: 0.95, special: "GORDON GARTRELL WHIP", super1: "WANNABE REGULAR PERSON", super2: "MONOPOLY MONEY RAIN",
    ticker: ["Denise made the Gordon Gartrell. Do not look at the seams.", "Theo wants to be a regular person. Cliff disagrees.", "Monopoly money does not cover the rent. Theo just learned."],
    lowHpLine: "THE GORDON GARTRELL IS HOLDING ON", breakLine: "THE SEAMS GAVE OUT", roundLines: ["THEO IS WEARING THE GORDON GARTRELL", "DENISE SAYS IT IS THE REAL THING"], winLine: "It's a Gordon Gartrell!" }),

  // 6. A Different World
  F({ id: "dwayne", size: 1.05, name: "DWAYNE WAYNE", show: "A Different World", stage: "hillman", breakStage: "dorm", tag: "whitley", cityPin: "virginia",
    speed: 5.0, power: 1.0, special: "FLIP-UP FLASH", super1: "HILLMAN HONORS", super2: "BABY, PLEASE DIVE",
    ticker: ["Dwayne flipped the shades up. That means business.", "Ron has a plan. Dwayne has doubts.", "Mr. Gaines is closing the Pit in five minutes."],
    lowHpLine: "DWAYNE FLIPS THE SHADES DOWN", breakLine: "BABY, PLEASE!", roundLines: ["DWAYNE WAYNE STEPS UP", "THE FLIP-UP SHADES ARE UP"], winLine: "Math major. He had it calculated." }),
  F({ id: "whitley", size: 0.93, name: "WHITLEY GILBERT", show: "A Different World", stage: "hillman", breakStage: "dorm", tag: "dwayne", cityPin: "virginia",
    speed: 4.6, power: 1.0, special: "WHITLEY DON'T PLAY THAT", super1: "HILLMAN DIVA SPIN", super2: "I'M GONNA BE A GILBERT",
    ticker: ["Whitley called Daddy. Daddy is sending a check.", "Sorry, homey. Whitley don't play that.", "Whitley Marion Gilbert of Richmond, Virginia, would like a word."],
    lowHpLine: "BE PREPARED TO THROW DOWN!", breakLine: "DWAYNE CLEOPHUS WAYNE!", roundLines: ["WHITLEY GILBERT HAS ARRIVED", "DADDY IS ON SPEED DIAL"], winLine: "Whitley Gilbert wins. Naturally." }),

  // 7. Family Matters
  F({ id: "carl", size: 1.01, name: "CARL WINSLOW", show: "Family Matters", stage: "winslow", breakStage: "winslowliving", tag: "urkel", cityPin: "chicago",
    speed: 3.6, power: 1.2, special: "STEEEVE SHOUT", super1: "SERGEANT SLAM", super2: "CHICAGO PD TAKEDOWN",
    ticker: ["Urkel knocked on the door. Carl is pretending nobody is home.", "Harriette says be nice to Steve. Carl is trying.", "Sergeant Winslow is on the clock."],
    lowHpLine: "STEEEEVE!", breakLine: "GO HOME, GO HOME!", roundLines: ["SERGEANT CARL WINSLOW IS OFF DUTY", "URKEL IS NOT FAR BEHIND"], winLine: "Sergeant Winslow, Chicago PD.",
    assist: { key: "harriette", name: "HARRIETTE", attack: "stun", dmg: 0, voice: "harriette_assist" } }),
  F({ id: "urkel", size: 0.94, name: "STEVE URKEL", show: "Family Matters", stage: "winslow", breakStage: "winslowliving", tag: "carl", cityPin: "chicago",
    speed: 5.0, power: 0.95, special: "URKEL-TRON BLASTER", super1: "DID I DO THAT?!", super2: "STEFAN TRANSFORMATION",
    ticker: ["Steve built a transformation chamber in the Winslow basement.", "Got any cheese?", "Laura said no again. Steve heard maybe."],
    lowHpLine: "URKEL IS NOT GIVING UP ON LAURA", breakLine: "DID I DO THAT?", roundLines: ["STEVE URKEL HAS ARRIVED", "THE SUSPENDERS ARE PULLED HIGH"], winLine: "Did I do that?",
    super2Cycle: ["stefan_1", "stefan_3"],   // the Stefan Transformation: the glow, then Stefan Urquelle
    assist: { key: "myra", name: "MYRA", attack: "pin", dmg: 60, voice: "myra_assist" } }),

  // 8. The Fresh Prince of Bel-Air
  F({ id: "will", size: 1.13, name: "WILL", show: "The Fresh Prince of Bel-Air", stage: "banks", breakStage: "banksfront", tag: "phil", cityPin: "belair",
    speed: 5.2, power: 1.0, special: "BEL-AIR BOUNCE PASS", super1: "FRESH PRINCE FLEX", super2: "WEST PHILADELPHIA BORN",
    ticker: ["In West Philadelphia born and raised.", "Got in one little fight and his mom got scared.", "Geoffrey has seen this before. Geoffrey is not impressed."],
    lowHpLine: "ONE LITTLE FIGHT AND MOM GOT SCARED", breakLine: "YO HOMES, SMELL YA LATER!", roundLines: ["WILL STEPS IN, WEST PHILLY STYLE", "UNCLE PHIL IS WATCHING"], winLine: "The Fresh Prince of Bel-Air.",
    assist: { key: "jazz", name: "JAZZ", attack: "throw", dmg: 90, voice: "jazz_assist", callPose: "punch_heavy" } }),
  F({ id: "phil", size: 1.08, name: "UNCLE PHIL", show: "The Fresh Prince of Bel-Air", stage: "banks", breakStage: "banksfront", tag: "will", cityPin: "belair",
    speed: 3.3, power: 1.25, special: "JUDGE'S CHARGE", super1: "JAZZ TOSS", super2: "OUT THE FRONT DOOR",
    ticker: ["Jazz is at the door. Uncle Phil is warming up.", "Judge Banks has heard enough.", "Geoffrey brought dessert. Phil is focused."],
    lowHpLine: "WILL!", breakLine: "OUT, JUST LIKE JAZZ!", roundLines: ["JUDGE PHILIP BANKS IS IN SESSION", "JAZZ IS ALREADY RUNNING"], winLine: "Court is adjourned.",
    assist: { key: "geoffrey", name: "GEOFFREY", attack: "tray", dmg: 85, voice: "geoffrey_assist" } }),

  // 9. Martin
  F({ id: "dragonfly", size: 0.96, name: "DRAGONFLY JONES", show: "Martin", stage: "martin", breakStage: "wzup", tag: "sheneneh", cityPin: "detroit",
    speed: 5.4, power: 1.0, special: "DRAGONFLY KICK", super1: "SILENCE!", super2: "STUDENT SHOWCASE",
    ticker: ["The Dragonfly Jones school of martial arts is now in session.", "Silence!", "Dragonfly has a student showcase tonight. Martin signed up."],
    lowHpLine: "SILENCE!", breakLine: "CLASS DISMISSED THROUGH THE WALL", roundLines: ["DRAGONFLY JONES TAKES THE FLOOR", "THE STUDENTS BOW"], winLine: "Dragonfly Jones!" }),
  F({ id: "sheneneh", size: 0.98, name: "SHENENEH", show: "Martin", stage: "martin", breakStage: "wzup", tag: "dragonfly", cityPin: "detroit",
    speed: 4.4, power: 1.1, special: "OH MY GOODNESS SLAP", super1: "HAIR WEAVE WHIP", super2: "YOU GO GIRL FLURRY",
    ticker: ["Sheneneh Jenkins from across the hall has something to say.", "Gina said something. Sheneneh heard it.", "Oh, my goodness!"],
    lowHpLine: "SHENENEH TAKES OFF THE EARRINGS", breakLine: "GET OUT OF MY FACE!", roundLines: ["SHENENEH JENKINS HAS ARRIVED", "GINA IS NOT READY"], winLine: "Oh, my goodness!" }),

  // 10. Moesha
  F({ id: "moesha", size: 0.93, name: "MOESHA", show: "Moesha", stage: "den", breakStage: "moeshakitchen", tag: "kim", cityPin: "losangeles",
    speed: 5.3, power: 0.95, special: "DEN SPIN KICK", super1: "DEAR DIARY", super2: "LEIMERT PARK LIGHTS",
    ticker: ["Moesha is writing it all down in the diary.", "Hakeem is at the Den. Again.", "Frank sells Saturns. Moesha is not getting one."],
    lowHpLine: "MOESHA IS WRITING THIS DOWN", breakLine: "DEAR DIARY...", roundLines: ["MOESHA MITCHELL IS ON THE CASE", "HAKEEM IS RIGHT BEHIND HER"], winLine: "Moesha Mitchell. Write that down." }),
  F({ id: "kim", size: 0.88, name: "KIM PARKER", show: "Moesha", stage: "den", breakStage: "moeshakitchen", tag: "moesha", cityPin: "losangeles",
    speed: 4.8, power: 1.0, special: "NIKKI'S DAUGHTER DASH", super1: "PARKER POP", super2: "SANTA MONICA COLLEGE RUSH",
    ticker: ["Kim Parker has a plan. Moesha has concerns.", "Nikki Parker is on the way.", "Kim and Moesha, best friends since forever."],
    lowHpLine: "KIM PARKER IS NOT DONE TALKING", breakLine: "HEY, GIRL, LET'S GO. LET'S GO!", roundLines: ["KIM PARKER BURSTS IN", "MOESHA ALREADY KNOWS THE PLAN"], winLine: "Kim Parker, out." }),

  // 11. Sister, Sister
  F({ id: "tia", size: 0.91, name: "TIA", show: "Sister, Sister", stage: "campbell", breakStage: "campbellporch", tag: "tamera", cityPin: "detroit",
    speed: 5.0, power: 0.95, special: "TWIN TELEPATHY", super1: "STUDY HALL STRIKE", super2: "RAY'S LIMO SLAM",
    ticker: ["Twins separated at birth found each other at a department store.", "Tia has a test tomorrow. She already studied.", "Lisa designed the outfit. Do not get it dirty."],
    lowHpLine: "TIA HITS THE BOOKS, THEN YOU", breakLine: "LISA IS GONNA HEAR ABOUT THIS", roundLines: ["TIA LANDRY CLOSES THE TEXTBOOK", "TAMERA IS RIGHT BEHIND HER"], winLine: "Tia gets an A." }),
  F({ id: "tamera", size: 0.87, name: "TAMERA", show: "Sister, Sister", stage: "campbell", breakStage: "campbellporch", tag: "tia", cityPin: "detroit",
    speed: 5.1, power: 0.95, special: "TWIN SWITCH", super1: "ROGER GO HOME", super2: "TWIN FINISH",
    ticker: ["Roger is at the window again.", "Ray runs the limo company. Tamera wants the keys.", "Tamera has a date. Tia has questions."],
    lowHpLine: "GO HOME, ROGER!", breakLine: "TWIN SWITCH!", roundLines: ["TAMERA CAMPBELL IS RUNNING LATE", "ROGER IS LURKING"], winLine: "The twins take it." }),

  // 12. Keenan & Kel
  F({ id: "keenan", size: 0.95, name: "KEENAN", show: "Keenan & Kel", stage: "rigbys", breakStage: "goodburger", tag: "ed", cityPin: "chicago",
    speed: 4.2, power: 1.1, special: "RIGBY'S CART CRASH", super1: "CLEANUP ON AISLE 5", super2: "WHY KEL WHY",
    ticker: ["Mr. Rigby wants the store mopped. Keenan has a scheme.", "Kel loves orange soda. Keenan has heard.", "The plan fell apart again. Keenan saw it coming."],
    lowHpLine: "KEENAN NEEDS A NEW PLAN", breakLine: "NO MORE QUESTIONS.", roundLines: ["KEENAN HAS A PLAN", "KEL HAS QUESTIONS"], winLine: "Keenan's plan worked. For once." }),
  F({ id: "ed", size: 1.01, name: "ED", show: "Keenan & Kel", stage: "rigbys", breakStage: "goodburger", tag: "keenan", cityPin: "chicago",
    speed: 4.9, power: 0.95, special: "GOOD BURGER FASTBALL", super1: "WELCOME TO GOOD BURGER", super2: "ED'S SAUCE SHOWER",
    ticker: ["Welcome to Good Burger, home of the Good Burger. Can I take your order?", "Ed's sauce is the secret. Mondo Burger wants it.", "I'm a dude, he's a dude, she's a dude, we're all dudes!"],
    lowHpLine: "WE'RE ALL DUDES!", breakLine: "ORDER UP!", roundLines: ["ED TIES ON THE APRON", "CAN I TAKE YOUR ORDER?"], winLine: "Welcome to Good Burger, home of the Good Burger!" }),
];
})();
