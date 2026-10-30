import type { DemandingReservePuzzle } from "./demanding-reserve-board";
import { board, step, text } from "./demanding-reserve-board";

/**
 * Second editorial season of demanding fallback boards. Same rules as season one:
 * text-only composed boards that render identically on web and native, at least two
 * different necessary inferences, short lines so size cues are never auto-shrunk, and
 * no picture-name addition. Editorial claims only — not human-calibrated difficulty.
 */
export const DEMANDING_RESERVE_SEASON_TWO: DemandingReservePuzzle[] = [
  board(
    "look-back-anger",
    "look back in anger",
    "row",
    [text("AN(KOOL)GER")],
    [
      step("reversal", "KOOL reads LOOK backwards.", "Read the inner word back."),
      step(
        "containment",
        "The outer pieces AN and GER join to make ANGER around it.",
        "The reversed word sits inside the emotion."
      ),
    ],
    [
      "The inside and the outside follow different reading rules.",
      "Reverse only the bracketed letters, then join the outer fragments.",
      "It is the title of a famous 1950s play about a furious young man.",
    ]
  ),
  board(
    "step-back-time",
    "a step back in time",
    "row",
    [text("TI(PETS)ME")],
    [
      step("reversal", "PETS is STEP read backwards.", "One step, taken back."),
      step(
        "containment",
        "TI and ME close around it to spell TIME.",
        "The reversed step happens inside time."
      ),
    ],
    [
      "The bracketed animal is not the point.",
      "Reverse the inner word, then name the word wrapped around it.",
      "Visiting an old-fashioned place can feel like this.",
    ]
  ),
  board(
    "fish-water",
    "a fish out of water",
    "stack",
    [text("FISH"), text("WA( )TER")],
    [
      step(
        "containment",
        "WATER has an empty slot where something should be.",
        "Something belongs inside the water but is missing."
      ),
      step(
        "position",
        "FISH sits apart, above and outside that empty space.",
        "The animal is out of its element."
      ),
    ],
    [
      "One row has a space reserved for the other.",
      "Notice what should be inside the lower word and where it is instead.",
      "It describes someone uncomfortable in unfamiliar surroundings.",
    ]
  ),
  board(
    "two-minds",
    "in two minds",
    "stack",
    [text("MI(IN)ND"), text("MI(IN)ND")],
    [
      step(
        "containment",
        "IN is placed inside MIND on each row.",
        "The bracketed word describes its own position."
      ),
      step("count", "There are two identical rows.", "Count the minds."),
    ],
    [
      "The small inner word is telling you where it is.",
      "Join each row's outside letters, then count the rows.",
      "It describes being undecided between two options.",
    ]
  ),
  board(
    "storm-teacup",
    "a storm in a teacup",
    "row",
    [text("T"), text("CU(STORM)P")],
    [
      step("homophone", "The lone letter T sounds like tea.", "Say the letter aloud."),
      step(
        "containment",
        "STORM is inside CUP, which follows the T.",
        "Join tea to the cup that holds the weather."
      ),
    ],
    [
      "The single letter is a sound clue.",
      "Say the letter, join it to the container, then name what is inside.",
      "It describes a lot of fuss over something unimportant.",
    ]
  ),
  board(
    "tall-order",
    "a tall order",
    "row",
    [text("ABCDE", "stacked")],
    [
      step(
        "classification",
        "The letters run A, B, C, D, E.",
        "They are arranged in alphabetical order."
      ),
      step("orientation", "The sequence is stacked vertically.", "The order stands tall."),
    ],
    [
      "Ignore what the letters spell; notice how they are arranged.",
      "Name the arrangement of the letters, then describe the shape of the column.",
      "It describes a request that is difficult to fulfil.",
    ]
  ),
  board(
    "small-fortune",
    "a small fortune",
    "stack",
    [text("PRICE"), text("$1,000,000", "small")],
    [
      step("classification", "A million dollars is a fortune.", "Read the price as a fortune."),
      step(
        "size",
        "The amount is printed much smaller than the word above it.",
        "The fortune is small."
      ),
    ],
    [
      "Both the amount and its printing matter.",
      "Name what the sum is, then describe how it is printed.",
      "Ironically, it describes a price that cost a lot of money.",
    ]
  ),
  board(
    "big-cheese",
    "the big cheese",
    "row",
    [text("FETA", "small"), text("BRIE", "large"), text("EDAM", "small")],
    [
      step("classification", "Feta, brie, and edam are all cheeses.", "Name the shared category."),
      step(
        "size",
        "BRIE is printed much larger than its neighbours.",
        "Single out the big one of the group."
      ),
    ],
    [
      "The three words belong to the same family; one stands out.",
      "Name the family, then describe the member that is not like the others.",
      "It is slang for the most important person in an organisation.",
    ]
  ),
  board(
    "cloud-nine",
    "on cloud nine",
    "stack",
    [text("YOU"), text("CLOUD IX")],
    [
      step("classification", "IX is the Roman numeral for nine.", "Decode the numeral."),
      step("position", "YOU sits on top of that numbered cloud.", "Read the placement as on."),
    ],
    [
      "The two letters after the word are not a word themselves.",
      "Read them as an old numbering system, then note where you are placed.",
      "It describes feeling extremely happy.",
    ]
  ),
  board(
    "one-million",
    "one in a million",
    "row",
    [text("MILL(1)ION")],
    [
      step("homophone", "The digit 1 is read as one.", "Say the number as a word."),
      step(
        "containment",
        "MILL and ION join around it to make MILLION.",
        "The one sits inside the million."
      ),
    ],
    [
      "The digit has interrupted a longer word.",
      "Join the letters on either side, then say where the number is.",
      "It describes someone or something exceptionally rare.",
    ]
  ),
  board(
    "nothing-common",
    "nothing in common",
    "row",
    [text("COMM( )ON")],
    [
      step("containment", "The brackets sit inside COMMON.", "Something is placed in the word."),
      step("negation", "The brackets are empty.", "What is inside is nothing."),
    ],
    [
      "Look carefully at what the brackets hold.",
      "Join the outer letters, then describe the contents of the brackets.",
      "It describes two people who share no interests.",
    ]
  ),
  board(
    "under-pressure",
    "under pressure",
    "stack",
    [text("PSI PSI PSI"), text("YOU")],
    [
      step(
        "classification",
        "PSI is a unit of pressure.",
        "The repeated units stand for pressure."
      ),
      step("position", "YOU is placed beneath the units.", "Read the placement as under."),
    ],
    [
      "The repeated abbreviation is a unit of measurement.",
      "Name what that unit measures, then describe where you sit.",
      "It describes feeling stressed by heavy demands.",
    ]
  ),
  board(
    "afternoon-tea",
    "afternoon tea",
    "row",
    [text("NOON"), text("T")],
    [
      step("homophone", "The letter T sounds like tea.", "Say the letter aloud."),
      step("position", "T comes after NOON in reading order.", "Read the sequence as after noon."),
    ],
    [
      "The second part is a single sound.",
      "Say the letter, then describe when it appears relative to the first word.",
      "It is a light meal of sandwiches and cakes, often with scones.",
    ]
  ),
  board(
    "cut-above-rest",
    "a cut above the rest",
    "stack",
    [text("CUT"), text("NAP SIESTA")],
    [
      step(
        "classification",
        "A nap and a siesta are both kinds of rest.",
        "Name the lower row's shared meaning."
      ),
      step("position", "CUT sits above that row.", "Read the placement as above."),
    ],
    [
      "The bottom row lists two examples of the same thing.",
      "Name what a nap and a siesta both are, then place the top word.",
      "It describes something clearly superior to its competitors.",
    ]
  ),
  board(
    "sleep-on-it",
    "sleep on it",
    "stack",
    [text("ZZZ"), text("IT")],
    [
      step("classification", "ZZZ is the cartoon sound of sleeping.", "Read it as sleep."),
      step("position", "That sleep sits on top of IT.", "Read the placement as on."),
    ],
    [
      "The repeated letter is a sound effect.",
      "Name what the sound effect means, then read where it sits.",
      "It means to delay a decision until tomorrow.",
    ]
  ),
  board(
    "eye-storm",
    "the eye of the storm",
    "row",
    [text("STO(I)RM")],
    [
      step("homophone", "The inserted letter I sounds like eye.", "Say the letter aloud."),
      step(
        "position",
        "It sits at the very centre of STORM.",
        "The eye is the storm's calm middle."
      ),
    ],
    [
      "One letter does not belong to the word around it.",
      "Say the extra letter aloud and note exactly where it is placed.",
      "It is the calm centre of a hurricane, or of a crisis.",
    ]
  ),
  board(
    "why-not",
    "why not",
    "row",
    [text("Y", "strike")],
    [
      step("homophone", "The letter Y sounds like why.", "Say the letter aloud."),
      step("negation", "It has been struck through.", "A crossed-out word is not."),
    ],
    [
      "A single letter can be a whole word.",
      "Say the letter aloud, then interpret the line through it.",
      "It is a cheerful way of agreeing to a suggestion.",
    ]
  ),
  board(
    "fifty-fifty",
    "fifty fifty",
    "row",
    [text("L"), text("L")],
    [
      step(
        "classification",
        "L is the Roman numeral for fifty.",
        "Decode each letter as a number."
      ),
      step("count", "There are two equal halves side by side.", "Say the number twice."),
    ],
    [
      "These letters are numbers in an ancient system.",
      "Decode one letter, then account for the identical pair.",
      "It describes an even split or an evenly balanced chance.",
    ]
  ),
  board(
    "head-above-water",
    "head above water",
    "stack",
    [text("HEAD"), text("H2O")],
    [
      step("classification", "H2O is the chemical formula for water.", "Decode the lower row."),
      step("position", "HEAD sits above it.", "Read the placement as above."),
    ],
    [
      "The bottom row is a formula, not a word.",
      "Name the substance, then describe where the top word sits.",
      "Keeping it there means just managing to cope.",
    ]
  ),
  board(
    "safety-numbers",
    "safety in numbers",
    "row",
    [text("12(SAFETY)34")],
    [
      step(
        "classification",
        "The characters around the word are all digits.",
        "Name what surrounds it as numbers."
      ),
      step("containment", "SAFETY is enclosed by those digits.", "Read the enclosure as in."),
    ],
    [
      "What surrounds the word matters more than its value.",
      "Name what the surrounding characters are, then where the word is.",
      "It means a group is more protected than an individual.",
    ]
  ),
  board(
    "pain-neck",
    "a pain in the neck",
    "row",
    [text("NE(PANE)CK")],
    [
      step("homophone", "PANE sounds exactly like pain.", "Hear the inner word."),
      step(
        "containment",
        "NE and CK join around it to make NECK.",
        "The sound sits inside the neck."
      ),
    ],
    [
      "The window part is a sound clue.",
      "Say the inner word aloud, then join the outer letters.",
      "It describes a very annoying person or task.",
    ]
  ),
  board(
    "rising-star",
    "rising star",
    "row",
    [text("RATS", "stacked")],
    [
      step("reversal", "Reading the column upwards gives STAR.", "Read from bottom to top."),
      step("orientation", "The star travels up the column.", "Upward movement means rising."),
    ],
    [
      "The obvious top-to-bottom reading is a decoy.",
      "Read the column in the opposite direction and describe its movement.",
      "It describes someone quickly becoming successful.",
    ]
  ),
  board(
    "cut-corners",
    "cut corners",
    "row",
    [text("ORNE")],
    [
      step(
        "letter-repair",
        "ORNE is CORNER with its first and last letters missing.",
        "Restore the word that has lost its ends."
      ),
      step(
        "negation",
        "The removed letters are the word's extreme edges.",
        "The corners have been cut off."
      ),
    ],
    [
      "The board shows a familiar word with something removed.",
      "Add one letter to each end, then describe what was taken away.",
      "It means doing something cheaply or skipping steps.",
    ]
  ),
  board(
    "out-of-order",
    "out of order",
    "row",
    [text("ABDCE")],
    [
      step("classification", "The letters almost run A to E.", "They form an alphabetical order."),
      step("letter-repair", "C and D have swapped places.", "The order is broken."),
    ],
    [
      "The letters are nearly in a familiar sequence.",
      "Find where the sequence breaks and describe its state.",
      "It is the sign hung on a machine that does not work.",
    ]
  ),
  board(
    "root-problem",
    "the root of the problem",
    "row",
    [text("√PROBLEM")],
    [
      step("classification", "√ is the mathematical root symbol.", "Name the symbol."),
      step("position", "It is applied directly to PROBLEM.", "Read it as the root of that word."),
    ],
    [
      "The symbol before the word comes from mathematics.",
      "Name the symbol, then read it as an operation on the word.",
      "It means the fundamental cause of a difficulty.",
    ]
  ),
  board(
    "pie-sky",
    "pie in the sky",
    "row",
    [text("SK(π)Y")],
    [
      step("homophone", "π is pronounced pie.", "Say the Greek letter aloud."),
      step("containment", "SK and Y join around it to make SKY.", "The pie is in the sky."),
    ],
    [
      "The symbol in the middle comes from mathematics, but listen to it.",
      "Say the symbol's name aloud, then join the letters around it.",
      "It describes a plan that is pleasant to imagine but unrealistic.",
    ]
  ),
  board(
    "fork-road",
    "a fork in the road",
    "row",
    [text("RO(Y)AD")],
    [
      step(
        "classification",
        "The letter Y has the shape of a fork: one stem splitting into two.",
        "Read the letter by its shape, not its sound."
      ),
      step("containment", "RO and AD join around it to make ROAD.", "The fork is in the road."),
    ],
    [
      "Look at the inner letter's shape rather than saying it.",
      "One line splits into two; then join the letters around it.",
      "It describes a point where you must choose a direction.",
    ]
  ),
  board(
    "every-other-day",
    "every other day",
    "row",
    [text("MON WED FRI")],
    [
      step("classification", "Monday, Wednesday, and Friday are days.", "Name what the words are."),
      step(
        "count",
        "Tuesday and Thursday are skipped each time.",
        "The pattern takes every other one."
      ),
    ],
    [
      "These abbreviations follow a regular pattern with gaps.",
      "Find what is missing between each pair of entries.",
      "It describes something that happens on alternate days.",
    ]
  ),
  board(
    "once-while",
    "once in a while",
    "row",
    [text("WHI(1CE)LE")],
    [
      step("homophone", "1CE sounds like once: one plus a soft C.", "Say it aloud."),
      step(
        "containment",
        "WHI and LE join around it to make WHILE.",
        "The once is inside a while."
      ),
    ],
    [
      "The middle mixes a digit and a letter into a sound.",
      "Say the middle aloud, then join the outer letters.",
      "It means occasionally, but not often.",
    ]
  ),
  board(
    "long-weekend",
    "a long weekend",
    "stack",
    [text("FRI SAT"), text("SUN MON")],
    [
      step(
        "classification",
        "Saturday and Sunday make a weekend.",
        "Identify the core the other days attach to."
      ),
      step("count", "Friday and Monday extend it to four days.", "The weekend has been stretched."),
    ],
    [
      "Two of the four days are special; two are additions.",
      "Find the familiar pair, then describe what the extra days do to it.",
      "It is a short break with an extra day off at either end.",
    ]
  ),
  board(
    "odd-one-out",
    "the odd one out",
    "row",
    [text("(2 4 6 8) 3")],
    [
      step("classification", "Every number in brackets is even; 3 is odd.", "Find the odd one."),
      step("position", "That number is outside the brackets.", "It has been left out."),
    ],
    [
      "One number does not share the others' property.",
      "Name the property it lacks and describe where it stands.",
      "It describes the item that does not belong with the rest.",
    ]
  ),
  board(
    "beat-bush",
    "beat around the bush",
    "row",
    [text("BE(BUSH)AT")],
    [
      step(
        "letter-repair",
        "The outside pieces BE and AT join to make BEAT.",
        "Recover the word that has been split."
      ),
      step(
        "containment",
        "BEAT wraps all the way around BUSH.",
        "The beating goes around the bush."
      ),
    ],
    [
      "The outer letters are a word that has been pulled apart.",
      "Join the outside pieces, then describe their position relative to the inside.",
      "It means to avoid getting to the point.",
    ]
  ),
  board(
    "behind-bars",
    "behind bars",
    "row",
    [text("|Y|O|U|")],
    [
      step(
        "classification",
        "The vertical lines look like the bars of a cell.",
        "Name them as bars."
      ),
      step("position", "YOU is seen through them, behind them.", "Read the placement as behind."),
    ],
    [
      "The upright strokes are not letters.",
      "Name what the strokes resemble, then describe where you are.",
      "It describes being in prison.",
    ]
  ),
  board(
    "on-the-rocks",
    "on the rocks",
    "stack",
    [text("WHISKY"), text("SLATE SHALE")],
    [
      step("classification", "Slate and shale are both rocks.", "Name the lower row's category."),
      step("position", "WHISKY sits on top of them.", "Read the placement as on."),
    ],
    [
      "The lower row is two members of the same group.",
      "Name what slate and shale are, then place the drink.",
      "It describes a drink served with ice, or a failing relationship.",
    ]
  ),
  board(
    "change-heart",
    "a change of heart",
    "stack",
    [text("HEART"), text("↓"), text("EARTH")],
    [
      step(
        "letter-repair",
        "EARTH uses exactly the same letters as HEART.",
        "The word has been rearranged."
      ),
      step("position", "The arrow turns the first word into the second.", "The heart has changed."),
    ],
    [
      "Compare the letters in the top and bottom rows.",
      "The arrow shows a transformation; describe what happened to the first word.",
      "It describes deciding to feel or act differently.",
    ]
  ),
  board(
    "half-dozen",
    "half a dozen",
    "row",
    [text("DOZ")],
    [
      step(
        "letter-repair",
        "DOZ is the start of DOZEN.",
        "Recover the full word from its fragment."
      ),
      step("count", "Exactly three of its six letters remain.", "Only half is shown."),
    ],
    [
      "The board is an incomplete word.",
      "Complete the word, then measure how much of it is shown.",
      "It means six, or a small number of things.",
    ]
  ),
  board(
    "all-at-sea",
    "all at sea",
    "row",
    [text("ALL"), text("@"), text("C")],
    [
      step("classification", "The @ symbol is read as at.", "Name the symbol."),
      step("homophone", "The letter C sounds like sea.", "Say the letter aloud."),
    ],
    [
      "Read the symbol the way you would in an email address.",
      "Say each part aloud in order; the last letter is a sound.",
      "It describes being confused and unsure what to do.",
    ]
  ),
  board(
    "mixed-messages",
    "mixed messages",
    "stack",
    [text("MALIE"), text("XETT"), text("TRELET")],
    [
      step(
        "letter-repair",
        "Rearranging the rows gives EMAIL, TEXT, and LETTER.",
        "Each word has been mixed up."
      ),
      step(
        "classification",
        "Email, text, and letter are all kinds of message.",
        "Name the category, then describe its state."
      ),
    ],
    [
      "Each row unscrambles to a different word.",
      "Unscramble the rows and find what the results have in common.",
      "It describes signals that contradict one another.",
    ]
  ),
  board(
    "jump-queue",
    "jump the queue",
    "stack",
    [text("ME"), text("Q Q Q Q")],
    [
      step("homophone", "The letter Q sounds like queue.", "A line of Qs is a queue."),
      step("position", "ME has leapt over the line.", "Read the placement as jumping it."),
    ],
    [
      "The repeated letter is a sound clue for a line of people.",
      "Say the letter aloud, then describe what you have done to the line.",
      "It describes pushing ahead of people who were waiting.",
    ]
  ),
  board(
    "square-peg",
    "a square peg in a round hole",
    "row",
    [text("( [PEG] )")],
    [
      step(
        "classification",
        "Square brackets surround PEG; round brackets surround those.",
        "Name the bracket shapes."
      ),
      step(
        "containment",
        "The square shape sits inside the round shape.",
        "The square peg is in the round hole."
      ),
    ],
    [
      "The brackets are not punctuation here; notice their shapes.",
      "Name each kind of bracket, then which one is inside which.",
      "It describes someone who does not fit their situation.",
    ]
  ),
];
