import { getDifficultyLevelForScore } from "./difficulty-levels";
import type { ReservePuzzle } from "./reserve-puzzles";
import type { PuzzleVisual, VisualLayer } from "./visual/composition";
import type { ReasoningEvidence } from "./visual/reasoning-evidence";
import { INK_PICTOGRAM_STYLE_ID } from "./visual/style";

export type ReasoningOperation = ReasoningEvidence["operations"][number];
export type DemandingReservePuzzle = ReservePuzzle & { reasoningEvidence: ReasoningEvidence };

const text = (
  content: string,
  emphasis: "normal" | "small" | "large" | "strike" | "stacked" = "normal"
): VisualLayer => ({ kind: "text", content, emphasis });
const step = (
  kind: ReasoningOperation["kind"],
  observation: string,
  inference: string
): ReasoningOperation => ({ kind, observation, inference, necessary: true });

function board(
  id: string,
  answer: string,
  layout: "row" | "stack",
  layers: VisualLayer[],
  operations: ReasoningOperation[],
  hints: [string, string, string]
): DemandingReservePuzzle {
  // Keep line breaks for stack boards. This is a fallback representation, not a
  // substitute for the composed board's size and strike cues.
  const unicodeFallback = layers
    .map((layer) =>
      layer.kind === "text" ? layer.content : layer.kind === "operator" ? layer.symbol : ""
    )
    .join(layout === "stack" ? "\n" : " ");
  const visual: PuzzleVisual = {
    styleId: INK_PICTOGRAM_STYLE_ID,
    mode: "composed",
    layout,
    layers,
    unicodeFallback,
  };
  return {
    id: `demanding:${id}`,
    answer,
    rebusPuzzle: unicodeFallback,
    difficulty: 7,
    difficultyLevel: getDifficultyLevelForScore(7).label,
    category: "phrases_and_idioms",
    techniqueId: operations.some((operation) => operation.kind === "size")
      ? "size_or_case_semantics"
      : operations.some(
            (operation) => operation.kind === "containment" || operation.kind === "position"
          )
        ? "spatial_preposition_play"
        : "multi_layer_phonetic",
    visual,
    hints,
    explanation:
      operations.map((operation) => `${operation.observation} ${operation.inference}`).join(" ") +
      ` Together these clues express “${answer}.”`,
    reasoningEvidence: {
      version: "editorial-reasoning-v1",
      operations,
      interacting: true,
      finalInterpretation: answer,
      calibration: "editorial-unplaytested",
    },
  };
}

/**
 * Editorial fallback candidates: no picture-name addition, live model calls,
 * color-dependent clues, tiny glyphs, rotation, or unsupported nested canvases.
 * These are NOT human-calibrated solve-time claims. Familiarity with classic
 * rebuses will matter; collect blind human playtests before claiming difficulty.
 */
export const DEMANDING_RESERVE_PUZZLES: DemandingReservePuzzle[] = [
  board(
    "square-one",
    "back to square one",
    "row",
    [text("ENO²")],
    [
      step("reversal", "ENO reads ONE backwards.", "Read the word back."),
      step(
        "classification",
        "The raised 2 is a square exponent.",
        "Combine back, square, and one as a familiar restart phrase."
      ),
    ],
    [
      "The word and its small raised mark do different jobs.",
      "Read the letters in the other direction, then interpret the exponent.",
      "The phrase describes starting again from the beginning.",
    ]
  ),
  board(
    "left-feet",
    "two left feet",
    "row",
    [text("TEEF"), text("TEEF")],
    [
      step(
        "reversal",
        "Each TEEF becomes FEET when read toward the left.",
        "The direction supplies left."
      ),
      step(
        "count",
        "There are two identical reversed words.",
        "Count the feet rather than joining the letters."
      ),
    ],
    [
      "This is about coordination, not an unfamiliar word.",
      "Read each group toward the left and count the groups.",
      "The expression describes an awkward dancer.",
    ]
  ),
  board(
    "peas-pod",
    "two peas in a pod",
    "row",
    [text("PO(PP)D")],
    [
      step(
        "containment",
        "Removing the parenthesized letters leaves POD.",
        "The inserted letters are inside a pod."
      ),
      step(
        "homophone",
        "PP is two instances of the letter P.",
        "Say the letter names aloud: two peas."
      ),
    ],
    [
      "The punctuation separates a container from its contents.",
      "Remove the middle pair, then say those letters aloud.",
      "The phrase describes two very similar people.",
    ]
  ),
  board(
    "little-late",
    "too little too late",
    "row",
    [text("LATE", "small"), text("LATE", "small")],
    [
      step("size", "Both copies of LATE are printed small.", "Their size supplies little."),
      step(
        "homophone",
        "There are two little LATEs.",
        "Two sounds like too; combine the size and the repeated word."
      ),
    ],
    [
      "Both the scale and the number matter.",
      "Describe the two small words, then listen to the description.",
      "It describes an insufficient response arriving after the opportunity.",
    ]
  ),
  board(
    "happy-returns",
    "many happy returns",
    "stack",
    [text("YPPAH"), text("YPPAH"), text("YPPAH"), text("YPPAH")],
    [
      step("reversal", "Each YPPAH is HAPPY going back.", "Backwards reading supplies returns."),
      step(
        "count",
        "The reversed word appears repeatedly.",
        "The greeting wishes for many of these returns."
      ),
    ],
    [
      "These are not four different words.",
      "Reverse one row, then account for all the repetitions.",
      "The result is a traditional birthday greeting.",
    ]
  ),
  board(
    "fish-pond",
    "big fish in a small pond",
    "row",
    [text("PO(", "small"), text("FISH", "large"), text(")ND", "small")],
    [
      step(
        "containment",
        "The outside fragments make POND around FISH.",
        "The fish is inside the pond."
      ),
      step(
        "size",
        "FISH is large while the surrounding POND is small.",
        "The unequal scales supply the two adjectives."
      ),
    ],
    [
      "Compare the inhabitant with its surroundings.",
      "Join the outside pieces, then describe both sizes.",
      "The expression describes prominence within a limited setting.",
    ]
  ),
  board(
    "overcoming",
    "overcoming the odds",
    "stack",
    [text("COMING"), text("1 3 5 7 9")],
    [
      step(
        "classification",
        "Every number in the lower row is odd.",
        "Read the group as the odds."
      ),
      step(
        "position",
        "COMING sits over that group.",
        "Join the spatial preposition to COMING before naming the lower group."
      ),
    ],
    [
      "The numbers share a property; their total is irrelevant.",
      "Name that property, then locate the word relative to it.",
      "The phrase describes succeeding despite unfavorable chances.",
    ]
  ),
  board(
    "steps-back",
    "one step forward two steps back",
    "row",
    [text("STEP"), text("PETS PETS")],
    [
      step(
        "reversal",
        "STEP reads forward; each PETS is STEP read backwards.",
        "The directions distinguish forward movement from backward movement."
      ),
      step(
        "count",
        "There is one forward word and two reversed words.",
        "Keep the unequal counts when describing the movement."
      ),
    ],
    [
      "The groups use the same four letters.",
      "Read the right-hand groups backwards, then count each direction.",
      "The phrase describes progress outweighed by setbacks.",
    ]
  ),
  board(
    "back-more",
    "back for more",
    "stack",
    [text("EROM"), text("EROM"), text("EROM"), text("EROM")],
    [
      step("reversal", "EROM reads MORE backwards.", "The direction supplies back."),
      step(
        "homophone",
        "There are four copies.",
        "Four sounds like for; join the direction, count, and recovered word."
      ),
    ],
    [
      "The direction and the number each supply part of the answer.",
      "Reverse one word and say the count aloud.",
      "The expression describes returning for another helping.",
    ]
  ),
  board(
    "stones",
    "leave no stone unturned",
    "stack",
    [text("ENOTS"), text("ENOTS"), text("ENOTS")],
    [
      step("reversal", "Every ENOTS becomes STONE when reversed.", "Each stone has been turned."),
      step(
        "negation",
        "There is no normally oriented STONE anywhere.",
        "Not one stone has been left unturned."
      ),
    ],
    [
      "Look for an exception among the rows.",
      "Reverse a row and check whether any row escaped the transformation.",
      "The expression means making every possible effort to find something.",
    ]
  ),
  board(
    "mixed-feelings",
    "mixed feelings",
    "stack",
    [text("YJO"), text("RAEF"), text("VELO")],
    [
      step(
        "letter-repair",
        "Reordering each row gives JOY, FEAR, and LOVE.",
        "Each word has been mixed rather than merely reversed."
      ),
      step(
        "classification",
        "The recovered words all name feelings.",
        "Name their shared category, then describe what happened to its members."
      ),
    ],
    [
      "Each row can become a familiar word, but not by the same reversal.",
      "Rearrange each row independently and find what the results have in common.",
      "The saying describes being emotionally conflicted.",
    ]
  ),
  board(
    "split-second-decision",
    "split second decision",
    "row",
    [text("DECI(SE COND)SION")],
    [
      step(
        "letter-repair",
        "The inner groups SE and COND form SECOND when joined.",
        "The interruption splits SECOND into two parts; retain split as part of the reading."
      ),
      step(
        "containment",
        "Removing the split inner word leaves DECISION in the outer fragments.",
        "The decision contains a split second; combine the split condition with its container."
      ),
    ],
    [
      "The inside and outside need to be read separately.",
      "Join the inner fragments, but account for their separation; then join the outer fragments.",
      "The phrase describes a choice made almost instantly.",
    ]
  ),
  board(
    "double-standards",
    "double standards",
    "stack",
    [text("METRE METRE"), text("KILOGRAM KILOGRAM"), text("SECOND SECOND")],
    [
      step(
        "classification",
        "Metre, kilogram, and second are measurement standards.",
        "Name what these units collectively represent."
      ),
      step(
        "count",
        "Each standard appears twice.",
        "Apply the repeated count to that shared category."
      ),
    ],
    [
      "Why these three words rather than other nouns?",
      "They define measurements, and each occurs the same number of times.",
      "The expression describes applying inconsistent rules to different people.",
    ]
  ),
  board(
    "secondhand-news",
    "secondhand news",
    "stack",
    [text("HAND"), text("HA(NEWS)ND")],
    [
      step("containment", "NEWS is inside the lower HAND.", "It belongs to that particular hand."),
      step(
        "count",
        "The hand containing the news is second in reading order.",
        "Join the ordinal and the container before naming its contents."
      ),
    ],
    [
      "The two rows differ in exactly one important way.",
      "Identify the inserted word and which numbered container holds it.",
      "The expression means information passed on by someone other than its original source.",
    ]
  ),
  board(
    "third-time",
    "third time lucky",
    "stack",
    [text("TIME"), text("TIME"), text("TI(LUCKY)ME")],
    [
      step(
        "containment",
        "The final TIME contains LUCKY.",
        "Only that occurrence has the favorable condition."
      ),
      step(
        "count",
        "It is the third TIME, after two unmodified ones.",
        "Count the occurrences, not the letters."
      ),
    ],
    [
      "The repeated word does not change until the final row.",
      "Number the rows, then isolate what appears inside the last one.",
      "The saying expresses hope after two unsuccessful attempts.",
    ]
  ),
  board(
    "fourth-dimension",
    "the fourth dimension",
    "stack",
    [text("LENGTH", "strike"), text("WIDTH", "strike"), text("HEIGHT", "strike"), text("TIME")],
    [
      step(
        "classification",
        "Length, width, and height name three spatial dimensions.",
        "Recognize the sequence's shared concept before considering time."
      ),
      step(
        "negation",
        "The first three are eliminated, leaving TIME in fourth position.",
        "Name the remaining entry by its ordinal place in the dimensional sequence."
      ),
    ],
    [
      "The last word belongs to the group in a different way.",
      "Identify the three familiar spatial measures that have been ruled out.",
      "Physics adds time to the three spatial dimensions.",
    ]
  ),
  board(
    "back-burner",
    "on the back burner",
    "stack",
    [text("YOU"), text("RENRUB")],
    [
      step(
        "reversal",
        "RENRUB becomes BURNER when read back.",
        "Recover the appliance part and retain the backwards direction."
      ),
      step(
        "position",
        "YOU is on top of the reversed word.",
        "Combine on with back and the recovered noun."
      ),
    ],
    [
      "The lower row is a reversed everyday word.",
      "Recover that word, then account for where the person is placed.",
      "The idiom describes something receiving less immediate attention.",
    ]
  ),
  board(
    "back-saddle",
    "back in the saddle",
    "row",
    [text("SA(KCAB)DDLE")],
    [
      step(
        "reversal",
        "The inserted KCAB reads BACK in reverse.",
        "Decode the inner word separately from the outer letters."
      ),
      step(
        "containment",
        "The outer letters join to form SADDLE.",
        "Place the recovered inner word in that container."
      ),
    ],
    [
      "Read the inner and outer letters using different rules.",
      "Reverse only the bracketed letters; join the remaining pieces normally.",
      "The expression describes returning to an activity after an absence.",
    ]
  ),
  board(
    "wolf-clothing",
    "a wolf in sheep's clothing",
    "row",
    [text("WOO(WOLF)L")],
    [
      step(
        "containment",
        "WOOL surrounds WOLF.",
        "The animal is wearing the surrounding material."
      ),
      step(
        "classification",
        "Wool is a sheep's natural covering.",
        "Describe that covering as the other animal's clothing."
      ),
    ],
    [
      "The outer letters name a material with an animal source.",
      "Identify that source, then describe what it is concealing.",
      "The expression warns of a dangerous person disguised as harmless.",
    ]
  ),
  board(
    "bee-bonnet",
    "a bee in your bonnet",
    "row",
    [text("BON(B)NET")],
    [
      step("homophone", "The inserted letter B sounds like bee.", "Read the inner clue by sound."),
      step(
        "containment",
        "The remaining letters spell BONNET.",
        "The sounding clue is inside the headwear."
      ),
    ],
    [
      "The letter inside is a sound clue.",
      "Remove it to recover the outer word, then say its name aloud.",
      "The saying describes an idea someone cannot stop thinking about.",
    ]
  ),
  board(
    "butterflies",
    "butterflies in your stomach",
    "row",
    [text("GU(YLFRETTUB×2)T", "small")],
    [
      step(
        "reversal",
        "YLFRETTUB becomes BUTTERFLY when reversed.",
        "Read the inner word backwards before interpreting the surrounding letters."
      ),
      step(
        "containment",
        "The ×2 repeats the decoded insect inside GUT, another word for stomach.",
        "Locate the recovered creatures inside the gut; the familiar expression calls it the stomach."
      ),
    ],
    [
      "Separate the outside fragments from the inner word and its multiplier.",
      "Reverse the inner word, apply the multiplier, then rejoin the outside normally.",
      "The expression describes a nervous fluttering sensation.",
    ]
  ),
  board(
    "skeleton-cupboard",
    "a skeleton in the cupboard",
    "row",
    [text("CUP(BONES)BOARD")],
    [
      step(
        "classification",
        "BONES collectively form a skeleton.",
        "Name the whole rather than repeating the visible plural."
      ),
      step(
        "containment",
        "CUPBOARD encloses those bones.",
        "The hidden whole is in the surrounding storage place."
      ),
    ],
    [
      "The inserted word names parts of a larger whole.",
      "Identify that whole, then join the letters surrounding it.",
      "The idiom refers to a shameful secret from someone's past.",
    ]
  ),
  board(
    "troubled-water",
    "bridge over troubled water",
    "stack",
    [text("BRIDGE"), text("OH2")],
    [
      step(
        "letter-repair",
        "OH2 is a disturbed ordering of H2O.",
        "Recognize water's formula with its order troubled."
      ),
      step(
        "position",
        "BRIDGE sits above the disturbed water formula.",
        "Read the vertical relationship as over."
      ),
    ],
    [
      "The lower row resembles a familiar formula with something wrong.",
      "Restore the formula's order and identify the substance.",
      "The phrase pictures a crossing above unsettled water.",
    ]
  ),
  board(
    "silver-linings",
    "every cloud has a silver lining",
    "stack",
    [text("CLO(Ag)UD"), text("CLO(Ag)UD"), text("CLO(Ag)UD")],
    [
      step(
        "classification",
        "Ag is the chemical symbol for silver.",
        "Decode the material in each row."
      ),
      step(
        "containment",
        "Every CLOUD contains that material.",
        "Treat the silver inside each cloud as its lining, with no exceptions."
      ),
    ],
    [
      "The mixed-case pair is a material's scientific abbreviation.",
      "Each surrounding word contains the same precious metal.",
      "The proverb finds a hopeful aspect in every difficult situation.",
    ]
  ),
  board(
    "heart-gold",
    "a heart of gold",
    "row",
    [text("HE(Au)ART")],
    [
      step("classification", "Au is the chemical symbol for gold.", "Decode the central material."),
      step(
        "containment",
        "HEART surrounds that material.",
        "The material is at the heart's center, suggesting its character."
      ),
    ],
    [
      "The central pair is not an English word.",
      "It names a precious metal on the periodic table.",
      "The expression describes someone exceptionally kind and generous.",
    ]
  ),
  board(
    "irons-fire",
    "irons in the fire",
    "row",
    [text("FI(Fe Fe Fe)RE")],
    [
      step(
        "classification",
        "Fe is iron's chemical symbol and appears more than once.",
        "Read the repeated symbols as irons."
      ),
      step(
        "containment",
        "FIRE encloses the symbols.",
        "Place the decoded plural inside the surrounding word."
      ),
    ],
    [
      "The repeated pairs are scientific abbreviations.",
      "Each pair denotes the same common metal; recover the outer word too.",
      "The expression describes several projects or opportunities being pursued.",
    ]
  ),
  board(
    "lead-behind",
    "lead from behind",
    "row",
    [text("YOU"), text("Pb")],
    [
      step(
        "classification",
        "Pb is the chemical symbol for lead.",
        "Decode the material, then use the other pronunciation of its name."
      ),
      step(
        "position",
        "The symbol follows YOU in reading order.",
        "The recovered verb operates from behind the person."
      ),
    ],
    [
      "The final pair is an element symbol, not initials.",
      "The element's name is spelled like a verb pronounced differently.",
      "The phrase describes guiding others without taking the foremost position.",
    ]
  ),
  board(
    "leaf-book",
    "take a leaf out of someone's book",
    "row",
    [text("BO("), text("LEAF", "strike"), text(")OK")],
    [
      step("containment", "BOOK surrounds LEAF.", "A leaf can mean a page within a book."),
      step(
        "negation",
        "The inner word is struck out while the outer word remains.",
        "Remove that leaf from the book rather than discarding the book."
      ),
    ],
    [
      "The inner word has both a botanical and a publishing meaning.",
      "Only the inner word is marked for removal.",
      "The idiom recommends following another person's example.",
    ]
  ),
  board(
    "pan-fire",
    "out of the frying pan into the fire",
    "stack",
    [text("FRYING PAN (YOU)"), text("↓"), text("FRYING PAN ( )   F(YOU)IRE")],
    [
      step(
        "position",
        "The arrow changes the upper situation into the lower one.",
        "Track the person rather than simply reading both lines."
      ),
      step(
        "containment",
        "YOU leaves the pan and ends up inside FIRE.",
        "Describe both the starting escape and the new destination."
      ),
    ],
    [
      "Track one token as the arrangement changes.",
      "The original container becomes empty; another now contains the person.",
      "The idiom describes escaping a bad situation only to enter a worse one.",
    ]
  ),
  board(
    "broken-english",
    "broken English",
    "stack",
    [text("HE LLO"), text("TH ANK Y OU"), text("GO OD BY E")],
    [
      step(
        "letter-repair",
        "Closing the gaps restores HELLO, THANK YOU, and GOODBYE.",
        "The familiar expressions have been broken into fragments."
      ),
      step(
        "classification",
        "The recovered expressions are English greetings and courtesies.",
        "Name the language rather than listing the separate expressions."
      ),
    ],
    [
      "The gaps have interrupted familiar expressions.",
      "Restore all three, then name the language they share.",
      "The phrase describes hesitant or grammatically incomplete use of a language.",
    ]
  ),
];
