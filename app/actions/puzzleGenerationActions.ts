"use server";

import { unstable_cache } from "next/cache";

// Comprehensive puzzle templates and components
const PUZZLE_COMPONENTS = {
	// Emoji categories for visual hints
	emojis: {
		animals: ["🐱", "🐶", "🐻", "🦁", "🐸", "🐝", "🦋", "🐧", "🦅", "🐠", "🐙", "🦀", "🐍", "🦎", "🐢"],
		nature: ["🌳", "🌲", "🌴", "🌵", "🌾", "🌿", "🍀", "🌸", "🌺", "🌻", "🌹", "🌷", "🌼", "🌙", "⭐", "☀️", "🌈", "❄️", "⚡"],
		objects: ["📱", "💻", "⌚", "📷", "🎵", "🎨", "✂️", "🔑", "💡", "🔔", "📚", "✏️", "🎯", "🏀", "⚽", "🎸", "🎹"],
		food: ["🍎", "🍊", "🍌", "🍇", "🍓", "🥕", "🌽", "🍞", "🧀", "🥛", "☕", "🍯", "🍰", "🥧", "🍕", "🌮", "🍜"],
		transport: ["🚗", "🚕", "🚌", "🚲", "✈️", "🚁", "🚢", "🛸", "🚀", "🚂", "🚃", "🛴", "🛵", "🏍️"],
		symbols: ["❤️", "💙", "💚", "💜", "🖤", "🤍", "💎", "🔥", "💧", "🌟", "✨", "💫", "🎈", "🎀", "🎁", "🏆"],
		actions: ["🏃", "🚶", "🧘", "🤸", "🏊", "🚴", "🧗", "🤾", "🏋️", "🤹", "🎭", "🎪", "🎨", "🎵", "🎤", "🎬"],
	},
};

// Answer categories with associated hint strategies
const ANSWER_CATEGORIES = {
	compound_words: [
		{ answer: "sunflower", hints: ["☀️", "🌻"], difficulty: 2, explanation: "Sun (☀️) + Flower (🌻) = Sunflower" },
		{ answer: "rainbow", hints: ["🌧️", "🎀"], difficulty: 2, explanation: "Rain (🌧️) + Bow (🎀) = Rainbow" },
		{ answer: "moonlight", hints: ["🌙", "💡"], difficulty: 3, explanation: "Moon (🌙) + Light (💡) = Moonlight" },
		{ answer: "snowman", hints: ["❄️", "👤"], difficulty: 2, explanation: "Snow (❄️) + Man (👤) = Snowman" },
		{ answer: "firefly", hints: ["🔥", "🦋"], difficulty: 3, explanation: "Fire (🔥) + Fly (🦋) = Firefly" },
		{ answer: "basketball", hints: ["🏀", "⚽"], difficulty: 3, explanation: "Basket (🏀) + Ball (⚽) = Basketball" },
		{ answer: "keyboard", hints: ["🔑", "📋"], difficulty: 3, explanation: "Key (🔑) + Board (📋) = Keyboard" },
		{ answer: "starfish", hints: ["⭐", "🐠"], difficulty: 4, explanation: "Star (⭐) + Fish (🐠) = Starfish" },
		{ answer: "bookworm", hints: ["📚", "🐛"], difficulty: 3, explanation: "Book (📚) + Worm (🐛) = Bookworm" },
		{ answer: "butterfly", hints: ["🧈", "🦋"], difficulty: 4, explanation: "Butter (🧈) + Fly (🦋) = Butterfly" },
		{ answer: "lighthouse", hints: ["💡", "🏠"], difficulty: 3, explanation: "Light (💡) + House (🏠) = Lighthouse" },
		{ answer: "spaceship", hints: ["🌌", "🚢"], difficulty: 3, explanation: "Space (🌌) + Ship (��) = Spaceship" },
		{ answer: "thunderstorm", hints: ["⚡", "🌪️"], difficulty: 4, explanation: "Thunder (⚡) + Storm (🌪️) = Thunderstorm" },
		{ answer: "watermelon", hints: ["💧", "🍈"], difficulty: 3, explanation: "Water (💧) + Melon (🍈) = Watermelon" },
		{ answer: "earthquake", hints: ["🌍", "📳"], difficulty: 4, explanation: "Earth (🌍) + Quake (📳) = Earthquake" },
	],

	phonetic_puzzles: [
		{ answer: "seaweed", hints: ["🌊", "weed"], difficulty: 3, explanation: "Sea (🌊) + Weed = Seaweed" },
		{ answer: "because", hints: ["🐝", "cause"], difficulty: 3, explanation: 'Bee (🐝) sounds like "Be" + Cause = Because' },
		{ answer: "believe", hints: ["🐝", "leaf", "🍃"], difficulty: 4, explanation: "Bee (🐝) + Leaf (🍃) + Eve = Believe" },
		{ answer: "before", hints: ["🐝", "4️⃣"], difficulty: 3, explanation: "Bee (🐝) + Four (4️⃣) = Before" },
		{ answer: "teacup", hints: ["🍵", "🏆"], difficulty: 2, explanation: "Tea (🍵) + Cup (🏆) = Teacup" },
		{ answer: "iceberg", hints: ["🧊", "⛰️"], difficulty: 3, explanation: "Ice (🧊) + Berg (⛰️) = Iceberg" },
		{ answer: "honeybee", hints: ["🍯", "🐝"], difficulty: 2, explanation: "Honey (🍯) + Bee (🐝) = Honeybee" },
		{ answer: "peacock", hints: ["🟢", "🐓"], difficulty: 4, explanation: "Pea (🟢) + Cock (🐓) = Peacock" },
		{ answer: "seashell", hints: ["🌊", "🐚"], difficulty: 2, explanation: "Sea (🌊) + Shell (🐚) = Seashell" },
		{ answer: "beehive", hints: ["🐝", "🏠"], difficulty: 3, explanation: "Bee (🐝) + Hive (🏠) = Beehive" },
		{ answer: "anyone", hints: ["NE", "1️⃣"], difficulty: 4, explanation: "Any (NE) + One (1️⃣) = Anyone" },
		{ answer: "tennessee", hints: ["10", "I", "👁️"], difficulty: 5, explanation: "Ten (10) + I + See (👁️) = Tennessee" },
		{ answer: "understand", hints: ["👇", "🤚"], difficulty: 4, explanation: "Under (👇) + Stand (🤚) = Understand" },
	],

	positional_puzzles: [
		{ answer: "crossroads", hints: ["ROADS", "ROADS"], difficulty: 5, explanation: "Roads crossing each other = Crossroads" },
		{ answer: "upside down", hints: ["uʍop", "ǝpᴉsdn"], difficulty: 4, explanation: "Text appears upside down = Upside Down" },
		{ answer: "inside out", hints: ["tuo", "edisni"], difficulty: 4, explanation: "Text appears inside out = Inside Out" },
		{ answer: "backwards", hints: ["sdrawkcab"], difficulty: 3, explanation: "Word written backwards = Backwards" },
		{ answer: "middle age", hints: ["AGE"], difficulty: 4, explanation: "AGE in the middle = Middle Age" },
		{ answer: "downtown", hints: ["TOWN", "👇"], difficulty: 4, explanation: "TOWN with down arrow = Downtown" },
		{ answer: "uptown", hints: ["TOWN", "☝️"], difficulty: 4, explanation: "TOWN with up arrow = Uptown" },
		{ answer: "overcome", hints: ["COME", "OVER"], difficulty: 4, explanation: "OVER positioned above COME = Overcome" },
		{ answer: "background", hints: ["GROUND", "BACK"], difficulty: 4, explanation: "BACK behind GROUND = Background" },
		{ answer: "forehead", hints: ["HEAD", "4️⃣"], difficulty: 4, explanation: "FOUR (4️⃣) in front of HEAD = Forehead" },
		{ answer: "sandwich", hints: ["SAND", "WICH"], difficulty: 3, explanation: "SAND between bread = Sandwich" },
		{ answer: "undercover", hints: ["👇", "COVER"], difficulty: 4, explanation: "Under (👇) + COVER = Undercover" },
		{ answer: "corner", hints: ["R", "🏠"], difficulty: 5, explanation: "R in the corner = Corner" },
		{ answer: "mixed up", hints: ["MIXEDUP"], difficulty: 4, explanation: "Letters all mixed up = Mixed Up" },
		{ answer: "square dance", hints: ["⬜", "💃"], difficulty: 3, explanation: "Square (⬜) + Dance (💃) = Square Dance" },
	],

	mathematical_rebuses: [
		{ answer: "tennis", hints: ["10", "S"], difficulty: 4, explanation: "Ten (10) + S = Tennis" },
		{ answer: "coordinate", hints: ["CO", "4️⃣", "8️⃣"], difficulty: 5, explanation: "CO + Four (4) + Dinate (8) = Coordinate" },
		{ answer: "paradise", hints: ["PAIR", "🎲", "🎲"], difficulty: 5, explanation: "PAIR + A + DICE = Paradise" },
		{ answer: "fortunate", hints: ["4️⃣", "🔟", "8️⃣"], difficulty: 5, explanation: "FOUR (4) + TEN (10) + ATE (8) = Fortunate" },
		{ answer: "wonderful", hints: ["1️⃣", "🌕"], difficulty: 5, explanation: "ONE (1) + DERFUL = Wonderful" },
		{ answer: "nightmare", hints: ["🌙", "🐴"], difficulty: 4, explanation: "NIGHT (🌙) + MARE (🐴) = Nightmare" },
		{ answer: "infinity", hints: ["∞", "TEA"], difficulty: 5, explanation: "IN + FIN (∞) + I + TEA = Infinity" },
		{ answer: "calculate", hints: ["🐄", "📊"], difficulty: 5, explanation: "CAL (🐄) + CU + LATE = Calculate" },
		{ answer: "geometry", hints: ["GEO", "📐"], difficulty: 4, explanation: "GEO + METRY (📐) = Geometry" },
		{ answer: "polynomial", hints: ["🦜", "📊"], difficulty: 6, explanation: "POLY (🦜) + NO + MIAL = Polynomial" },
		{ answer: "fibonacci", hints: ["🐟", "BO", "NACCI"], difficulty: 6, explanation: "FI (🐟) + BO + NACCI = Fibonacci" },
		{ answer: "algorithm", hints: ["AL", "GO", "RHYTHM"], difficulty: 5, explanation: "AL + GO + RHYTHM = Algorithm" },
		{ answer: "triangle", hints: ["3️⃣", "ANGLE"], difficulty: 4, explanation: "TRI (3️⃣) + ANGLE = Triangle" },
		{ answer: "pentagon", hints: ["5️⃣", "GON"], difficulty: 5, explanation: "PENT (5️⃣) + AGON = Pentagon" },
		{ answer: "hexagon", hints: ["6️⃣", "AGON"], difficulty: 5, explanation: "HEX (6️⃣) + AGON = Hexagon" },
		{ answer: "octagon", hints: ["8️⃣", "AGON"], difficulty: 5, explanation: "OCT (8️⃣) + AGON = Octagon" },
		{ answer: "quadratic", hints: ["4️⃣", "RATIC"], difficulty: 6, explanation: "QUAD (4️⃣) + RATIC = Quadratic" },
		{ answer: "logarithm", hints: ["LOG", "RHYTHM"], difficulty: 6, explanation: "LOG + A + RHYTHM = Logarithm" },
	],

	visual_wordplay: [
		{ answer: "green with envy", hints: ["🟢", "👁️"], difficulty: 5, explanation: "Green (🟢) with I (👁️) NV = Green with Envy" },
		{ answer: "see through", hints: ["👁️", "🔍"], difficulty: 4, explanation: "See (👁️) Through (🔍) = See Through" },
		{ answer: "broken heart", hints: ["💔"], difficulty: 3, explanation: "Broken heart emoji = Broken Heart" },
		{ answer: "growing up", hints: ["G", "R", "O", "W", "I", "N", "G", "⬆️"], difficulty: 4, explanation: "GROWING with up arrow = Growing Up" },
		{ answer: "falling down", hints: ["F", "A", "L", "L", "I", "N", "G", "⬇️"], difficulty: 4, explanation: "FALLING with down arrow = Falling Down" },
		{ answer: "time after time", hints: ["⏰", "⏰", "⏰"], difficulty: 4, explanation: "Time repeated = Time After Time" },
		{ answer: "once upon a time", hints: ["1️⃣", "🆙", "⏰"], difficulty: 5, explanation: "Once (1) Upon (🆙) A Time (⏰) = Once Upon A Time" },
		{ answer: "split second", hints: ["✂️", "⏱️"], difficulty: 4, explanation: "Split (✂️) Second (⏱️) = Split Second" },
		{ answer: "turn around", hints: ["🔄", "🔴"], difficulty: 4, explanation: "Turn (🔄) Around (🔴) = Turn Around" },
		{ answer: "look both ways", hints: ["👁️", "↔️"], difficulty: 4, explanation: "Look (👁️) Both Ways (↔️) = Look Both Ways" },
		{ answer: "think outside the box", hints: ["💭", "📦", "➡️"], difficulty: 6, explanation: "Think (💭) Outside (➡️) The Box (📦) = Think Outside The Box" },
		{ answer: "reading between the lines", hints: ["📖", "📏", "📏"], difficulty: 6, explanation: "Reading (📖) Between The Lines (📏📏) = Reading Between The Lines" },
		{ answer: "two faced", hints: ["2️⃣", "😀", "😠"], difficulty: 4, explanation: "Two (2) Faced (😀😠) = Two Faced" },
		{ answer: "head over heels", hints: ["🤸", "HEELS"], difficulty: 5, explanation: "Head Over (🤸) Heels = Completely in love" },
		{ answer: "all eyes on me", hints: ["👁️", "👁️", "👁️", "ME"], difficulty: 5, explanation: "All Eyes (👁️👁️👁️) On Me = Center of attention" },
		{ answer: "long time no see", hints: ["LONG", "⏰", "NO", "👁️"], difficulty: 5, explanation: "Long Time (⏰) No See (👁️) = Haven't seen in a while" },
		{ answer: "man overboard", hints: ["👨", "OVER", "BOARD"], difficulty: 5, explanation: "Man (👨) Over Board = Emergency at sea" },
		{ answer: "high and low", hints: ["⬆️", "AND", "⬇️"], difficulty: 4, explanation: "High (⬆️) And Low (⬇️) = Everywhere" },
		{ answer: "six feet under", hints: ["6️⃣", "🦶", "👇"], difficulty: 5, explanation: "Six (6️⃣) Feet (🦶) Under (👇) = Dead and buried" },
		{ answer: "top secret", hints: ["⬆️", "🤫"], difficulty: 4, explanation: "Top (⬆️) Secret (🤫) = Highly classified" },
	],

	advanced_idioms: [
		{ answer: "piece of cake", hints: ["🧩", "🍰"], difficulty: 4, explanation: "Piece (🧩) of Cake (🍰) = Easy task" },
		{ answer: "break the ice", hints: ["💔", "🧊"], difficulty: 4, explanation: "Break (💔) the Ice (🧊) = Start conversation" },
		{ answer: "spill the beans", hints: ["💧", "🫘"], difficulty: 4, explanation: "Spill (💧) the Beans (🫘) = Reveal secret" },
		{ answer: "cat got your tongue", hints: ["🐱", "👅"], difficulty: 5, explanation: "Cat (🐱) Got Your Tongue (👅) = Can't speak" },
		{ answer: "elephant in the room", hints: ["🐘", "🏠"], difficulty: 5, explanation: "Elephant (🐘) In The Room (🏠) = Obvious problem ignored" },
		{ answer: "skeleton in the closet", hints: ["💀", "🚪"], difficulty: 5, explanation: "Skeleton (💀) In The Closet (🚪) = Hidden secret" },
		{ answer: "wolf in sheeps clothing", hints: ["🐺", "🐑", "👕"], difficulty: 6, explanation: "Wolf (🐺) In Sheep's (🐑) Clothing (👕) = Deceptive person" },
		{ answer: "needle in a haystack", hints: ["📍", "🌾"], difficulty: 5, explanation: "Needle (📍) In A Haystack (🌾) = Very hard to find" },
		{ answer: "ace up your sleeve", hints: ["🂡", "👔"], difficulty: 5, explanation: "Ace (🂡) Up Your Sleeve (👔) = Hidden advantage" },
		{ answer: "bull in a china shop", hints: ["🐂", "🇨🇳", "🏪"], difficulty: 6, explanation: "Bull (🐂) In A China (🇨🇳) Shop (🏪) = Clumsy in delicate situation" },
		{ answer: "fish out of water", hints: ["🐠", "💧", "🚫"], difficulty: 5, explanation: "Fish (🐠) Out Of Water (💧🚫) = Uncomfortable situation" },
		{ answer: "burn the midnight oil", hints: ["🔥", "🌙", "🛢️"], difficulty: 6, explanation: "Burn (🔥) The Midnight (🌙) Oil (🛢️) = Work late into night" },
		{ answer: "bite the bullet", hints: ["🦷", "🔫"], difficulty: 5, explanation: "Bite (🦷) The Bullet (🔫) = Face difficulty bravely" },
		{ answer: "barking up the wrong tree", hints: ["🐕", "⬆️", "❌", "🌳"], difficulty: 7, explanation: "Barking (🐕) Up (⬆️) The Wrong (❌) Tree (🌳) = Pursuing wrong course" },
		{ answer: "the cats out of the bag", hints: ["🐱", "OUT", "🎒"], difficulty: 5, explanation: "The Cat's (🐱) Out Of The Bag (🎒) = Secret is revealed" },
		{ answer: "let the cat out of the bag", hints: ["LET", "🐱", "OUT", "🎒"], difficulty: 6, explanation: "Let The Cat (🐱) Out Of The Bag (🎒) = Reveal a secret" },
		{ answer: "curiosity killed the cat", hints: ["❓", "💀", "🐱"], difficulty: 6, explanation: "Curiosity (❓) Killed (💀) The Cat (🐱) = Being too curious is dangerous" },
		{ answer: "when the cats away the mice will play", hints: ["WHEN", "🐱", "AWAY", "🐭", "PLAY"], difficulty: 8, explanation: "When The Cat's (🐱) Away The Mice (🐭) Will Play = People misbehave when authority is absent" },
		{ answer: "dont let the grass grow under your feet", hints: ["🚫", "🌱", "GROW", "👇", "🦶"], difficulty: 8, explanation: "Don't Let The Grass (🌱) Grow Under (👇) Your Feet (🦶) = Don't delay action" },
		{ answer: "the apple doesnt fall far from the tree", hints: ["🍎", "🚫", "FALL", "FAR", "🌳"], difficulty: 8, explanation: "The Apple (🍎) Doesn't Fall Far From The Tree (🌳) = Children resemble their parents" },
	],

	complex_phrases: [
		{ answer: "blessing in disguise", hints: ["🙏", "🥸"], difficulty: 5, explanation: "Blessing (🙏) In Disguise (🥸) = Hidden good fortune" },
		{ answer: "curiosity killed the cat", hints: ["❓", "💀", "🐱"], difficulty: 6, explanation: "Curiosity (❓) Killed (💀) The Cat (🐱) = Being too curious is dangerous" },
		{ answer: "every cloud has a silver lining", hints: ["☁️", "🥈"], difficulty: 6, explanation: "Every Cloud (☁️) Has A Silver (🥈) Lining = Something good in bad situations" },
		{ answer: "the early bird catches the worm", hints: ["🌅", "🐦", "🪱"], difficulty: 6, explanation: "The Early (🌅) Bird (🐦) Catches The Worm (🪱) = Being early has advantages" },
		{ answer: "dont count your chickens before they hatch", hints: ["🚫", "🔢", "🐣"], difficulty: 7, explanation: "Don't Count (🚫🔢) Your Chickens Before They Hatch (🐣) = Don't assume success" },
		{ answer: "a picture is worth a thousand words", hints: ["🖼️", "💰", "1000", "📝"], difficulty: 7, explanation: "A Picture (🖼️) Is Worth (💰) A Thousand (1000) Words (📝) = Images convey more than text" },
		{ answer: "actions speak louder than words", hints: ["🎬", "📢", "📝"], difficulty: 6, explanation: "Actions (🎬) Speak Louder (📢) Than Words (📝) = What you do matters more than what you say" },
		{ answer: "better safe than sorry", hints: ["🛡️", "😢"], difficulty: 5, explanation: "Better Safe (🛡️) Than Sorry (😢) = It's better to be cautious" },
		{ answer: "dont judge a book by its cover", hints: ["🚫", "⚖️", "📖", "📔"], difficulty: 6, explanation: "Don't Judge (🚫⚖️) A Book (📖) By Its Cover (📔) = Don't judge by appearance" },
		{ answer: "the pen is mightier than the sword", hints: ["🖊️", "💪", "⚔️"], difficulty: 6, explanation: "The Pen (🖊️) Is Mightier (💪) Than The Sword (⚔️) = Words are more powerful than violence" },
		{ answer: "when pigs fly", hints: ["WHEN", "🐷", "✈️"], difficulty: 5, explanation: "When Pigs (🐷) Fly (✈️) = Something that will never happen" },
		{ answer: "kill two birds with one stone", hints: ["💀", "2️⃣", "🐦", "1️⃣", "🪨"], difficulty: 7, explanation: "Kill Two (2) Birds (🐦) With One (1) Stone (🪨) = Accomplish two things at once" },
		{ answer: "the whole nine yards", hints: ["THE", "WHOLE", "9️⃣", "YARDS"], difficulty: 6, explanation: "The Whole Nine (9) Yards = Everything completely" },
		{ answer: "once in a blue moon", hints: ["1️⃣", "IN", "🟦", "🌙"], difficulty: 6, explanation: "Once (1) In A Blue (🟦) Moon (🌙) = Very rarely" },
		{ answer: "raining cats and dogs", hints: ["🌧️", "🐱", "AND", "🐶"], difficulty: 5, explanation: "Raining (🌧️) Cats (🐱) And Dogs (🐶) = Heavy rain" },
		{ answer: "rome wasnt built in a day", hints: ["ROME", "🚫", "BUILT", "1️⃣", "📅"], difficulty: 7, explanation: "Rome Wasn't Built In A Day (🚫1📅) = Great things take time" },
		{ answer: "the grass is always greener on the other side", hints: ["🌱", "ALWAYS", "🟢", "OTHER", "SIDE"], difficulty: 8, explanation: "The Grass (🌱) Is Always Greener (🟢) On The Other Side = Others seem to have it better" },
		{ answer: "dont bite the hand that feeds you", hints: ["🚫", "🦷", "✋", "FEEDS"], difficulty: 7, explanation: "Don't Bite (🚫🦷) The Hand (✋) That Feeds You = Don't harm those who help you" },
	],

	scientific_concepts: [
		{ answer: "photosynthesis", hints: ["📸", "🧪"], difficulty: 6, explanation: "Photo (📸) + Synthesis (🧪) = Plant's energy conversion process" },
		{ answer: "metamorphosis", hints: ["🐛", "➡️", "🦋"], difficulty: 5, explanation: "Meta + Morph + Osis = Caterpillar (🐛) to Butterfly (🦋) transformation" },
		{ answer: "thermodynamics", hints: ["🌡️", "⚡"], difficulty: 6, explanation: "Thermo (🌡️) + Dynamics (⚡) = Study of heat and energy" },
		{ answer: "electromagnetic", hints: ["⚡", "🧲"], difficulty: 5, explanation: "Electric (⚡) + Magnetic (🧲) = Electromagnetic force" },
		{ answer: "deoxyribonucleic acid", hints: ["🧬", "DNA"], difficulty: 8, explanation: "DNA (🧬) = Deoxyribonucleic Acid" },
		{ answer: "gravitational", hints: ["🍎", "⬇️"], difficulty: 5, explanation: "Gravity (🍎⬇️) + ational = Gravitational force" },
		{ answer: "periodic table", hints: ["⏰", "📊"], difficulty: 5, explanation: "Periodic (⏰) Table (📊) = Chemical element chart" },
		{ answer: "ecosystem", hints: ["🌍", "♻️"], difficulty: 4, explanation: "Eco (🌍) + System (♻️) = Environmental system" },
		{ answer: "biodiversity", hints: ["🧬", "🌿"], difficulty: 5, explanation: "Bio (🧬) + Diversity (🌿) = Variety of life" },
		{ answer: "photon", hints: ["📸", "⚛️"], difficulty: 5, explanation: "Photo (📸) + n (⚛️) = Light particle" },
	],

	abstract_concepts: [
		{ answer: "consciousness", hints: ["🧠", "💭"], difficulty: 6, explanation: "Con + Science (🧠) + Ness = Awareness (💭)" },
		{ answer: "philosophy", hints: ["💭", "📚"], difficulty: 5, explanation: "Philo + Sophy = Love (💭) of Wisdom (📚)" },
		{ answer: "psychology", hints: ["🧠", "📖"], difficulty: 5, explanation: "Psycho (🧠) + Logy (📖) = Study of mind" },
		{ answer: "metaphysical", hints: ["🌌", "❓"], difficulty: 6, explanation: "Meta + Physical = Beyond (🌌) physical reality (❓)" },
		{ answer: "existentialism", hints: ["🤔", "🌍"], difficulty: 7, explanation: "Existence (🤔) + ism = Philosophy about being (🌍)" },
		{ answer: "transcendental", hints: ["⬆️", "🌟"], difficulty: 6, explanation: "Trans + Scend (⬆️) + al = Beyond normal limits (🌟)" },
		{ answer: "enlightenment", hints: ["💡", "🧘"], difficulty: 5, explanation: "En + Light (💡) + ment = Spiritual awakening (🧘)" },
		{ answer: "intuition", hints: ["💭", "⚡"], difficulty: 5, explanation: "In + Tuition = Inner knowing (💭⚡)" },
		{ answer: "synchronicity", hints: ["⏰", "🔗"], difficulty: 6, explanation: "Syn + Chrono (⏰) + icity = Meaningful coincidence (🔗)" },
		{ answer: "serendipity", hints: ["🍀", "💫"], difficulty: 5, explanation: "Serene + Dip + ity = Happy accident (🍀💫)" },
		{ answer: "paradox", hints: ["PARA", "DOX"], difficulty: 5, explanation: "Para + Dox = Contradictory truth" },
		{ answer: "dichotomy", hints: ["DI", "CHOT", "OMY"], difficulty: 6, explanation: "Di + Chot + omy = Division into two parts" },
	],

	cryptic_wordplay: [
		{ answer: "definitely", hints: ["DEFI", "NITE", "LY"], difficulty: 6, explanation: "Defi + Nite + Ly = Certainly" },
		{ answer: "altogether", hints: ["ALL", "TO", "GETHER"], difficulty: 5, explanation: "All + To + Gether = Completely" },
		{ answer: "nevertheless", hints: ["NEVER", "THE", "LESS"], difficulty: 6, explanation: "Never + The + Less = However" },
		{ answer: "overwhelm", hints: ["OVER", "WHELM"], difficulty: 5, explanation: "Over + Whelm = Overpower" },
		{ answer: "understand", hints: ["UNDER", "STAND"], difficulty: 4, explanation: "Under + Stand = Comprehend" },
		{ answer: "outstanding", hints: ["OUT", "STANDING"], difficulty: 5, explanation: "Out + Standing = Excellent" },
		{ answer: "everybody", hints: ["EVERY", "BODY"], difficulty: 4, explanation: "Every + Body = Everyone" },
		{ answer: "somewhere", hints: ["SOME", "WHERE"], difficulty: 4, explanation: "Some + Where = A place" },
		{ answer: "meanwhile", hints: ["MEAN", "WHILE"], difficulty: 5, explanation: "Mean + While = During that time" },
		{ answer: "throughout", hints: ["THROUGH", "OUT"], difficulty: 5, explanation: "Through + Out = From start to finish" },
	],

	double_meanings: [
		{ answer: "bear", hints: ["🐻", "BARE"], difficulty: 5, explanation: "Bear (🐻) sounds like Bare = To carry or tolerate" },
		{ answer: "right", hints: ["➡️", "WRITE"], difficulty: 4, explanation: "Right (➡️) sounds like Write = Correct direction" },
		{ answer: "knight", hints: ["🛡️", "NIGHT"], difficulty: 4, explanation: "Knight (🛡️) sounds like Night = Medieval warrior" },
		{ answer: "flour", hints: ["🌾", "FLOWER"], difficulty: 4, explanation: "Flour (🌾) sounds like Flower = Baking ingredient" },
		{ answer: "break", hints: ["💔", "BRAKE"], difficulty: 4, explanation: "Break (💔) sounds like Brake = To fracture" },
		{ answer: "piece", hints: ["🧩", "PEACE"], difficulty: 4, explanation: "Piece (🧩) sounds like Peace = A part of" },
		{ answer: "sea", hints: ["🌊", "SEE"], difficulty: 3, explanation: "Sea (🌊) sounds like See = Ocean" },
		{ answer: "sun", hints: ["☀️", "SON"], difficulty: 3, explanation: "Sun (☀️) sounds like Son = Solar star" },
		{ answer: "hair", hints: ["💇", "HARE"], difficulty: 4, explanation: "Hair (💇) sounds like Hare = What grows on head" },
		{ answer: "pair", hints: ["👫", "PEAR"], difficulty: 4, explanation: "Pair (👫) sounds like Pear = Two of something" },
	],

	lateral_thinking: [
		{ answer: "footsteps", hints: ["FOOT", "STEPS"], difficulty: 5, explanation: "Foot + Steps = Tracks left behind" },
		{ answer: "typewriter", hints: ["TYPE", "WRITER"], difficulty: 5, explanation: "Type + Writer = Writing machine" },
		{ answer: "horseback", hints: ["HORSE", "BACK"], difficulty: 4, explanation: "Horse + Back = Riding position" },
		{ answer: "handwriting", hints: ["HAND", "WRITING"], difficulty: 5, explanation: "Hand + Writing = Personal script" },
		{ answer: "timekeeper", hints: ["TIME", "KEEPER"], difficulty: 5, explanation: "Time + Keeper = One who tracks time" },
		{ answer: "doorway", hints: ["DOOR", "WAY"], difficulty: 4, explanation: "Door + Way = Entrance passage" },
		{ answer: "stairway", hints: ["STAIR", "WAY"], difficulty: 4, explanation: "Stair + Way = Path between floors" },
		{ answer: "pathway", hints: ["PATH", "WAY"], difficulty: 4, explanation: "Path + Way = Route to follow" },
		{ answer: "walkway", hints: ["WALK", "WAY"], difficulty: 4, explanation: "Walk + Way = Pedestrian path" },
		{ answer: "runway", hints: ["RUN", "WAY"], difficulty: 4, explanation: "Run + Way = Airport strip" },
	],

	mega_complex: [
		{ answer: "antidisestablishmentarianism", hints: ["ANTI", "DIS", "ESTABLISH", "MENT", "ARIAN", "ISM"], difficulty: 10, explanation: "Anti + Dis + Establish + Ment + Arian + Ism = Opposition to disestablishment" },
		{ answer: "pneumonoultramicroscopicsilicovolcanoconiosis", hints: ["🫁", "ULTRA", "🔬", "🌋"], difficulty: 10, explanation: "Lung disease from silica dust" },
		{ answer: "supercalifragilisticexpialidocious", hints: ["SUPER", "CALI", "FRAGIL", "ISTIC", "EXPI", "ALI", "DOCIOUS"], difficulty: 9, explanation: "Mary Poppins magical word" },
		{ answer: "honorificabilitudinitatibus", hints: ["HONOR", "ABILITY", "HONOR"], difficulty: 9, explanation: "Shakespearean long word meaning honorableness" },
		{ answer: "floccinaucinihilipilification", hints: ["FLUCCI", "NAUCI", "NIHILI", "PILI", "FICATION"], difficulty: 9, explanation: "Act of deeming worthless" },
		{ answer: "hippopotomonstrosesquippedaliophobia", hints: ["🦛", "MONSTER", "SESQUI", "PHOBIA"], difficulty: 9, explanation: "Fear of long words" },
		{ answer: "pseudopseudohypoparathyroidism", hints: ["PSEUDO", "PSEUDO", "HYPO", "PARA", "THYROID"], difficulty: 9, explanation: "Medical condition name" },
		{ answer: "electroencephalography", hints: ["⚡", "🧠", "GRAPHY"], difficulty: 8, explanation: "Brain wave recording" },
		{ answer: "immunoelectrophoresis", hints: ["💉", "⚡", "PHOR", "ESIS"], difficulty: 8, explanation: "Laboratory technique" },
		{ answer: "spectrophotometry", hints: ["SPECTRO", "📸", "METRY"], difficulty: 7, explanation: "Light measurement technique" },
	],

	extreme_idioms: [
		{ answer: "when hell freezes over", hints: ["WHEN", "🔥", "❄️", "OVER"], difficulty: 8, explanation: "When Hell (🔥) Freezes (❄️) Over = Never going to happen" },
		{ answer: "a snowballs chance in hell", hints: ["❄️", "⚽", "CHANCE", "🔥"], difficulty: 7, explanation: "A Snowball's (❄️⚽) Chance In Hell (🔥) = No possibility" },
		{ answer: "beating around the bush", hints: ["🥁", "AROUND", "🌳"], difficulty: 6, explanation: "Beating (🥁) Around The Bush (🌳) = Avoiding the point" },
		{ answer: "dont cry over spilled milk", hints: ["🚫", "😢", "OVER", "🥛"], difficulty: 7, explanation: "Don't Cry (🚫😢) Over Spilled Milk (🥛) = Don't worry about past mistakes" },
		{ answer: "you cant have your cake and eat it too", hints: ["🚫", "🍰", "AND", "🍴"], difficulty: 8, explanation: "You Can't Have Your Cake (🍰) And Eat (🍴) It Too = Can't have both options" },
		{ answer: "the pot calling the kettle black", hints: ["🫖", "CALLING", "🫖", "⚫"], difficulty: 7, explanation: "The Pot (🫖) Calling The Kettle (🫖) Black (⚫) = Hypocritical criticism" },
		{ answer: "a bird in the hand is worth two in the bush", hints: ["🐦", "✋", "WORTH", "2️⃣", "🌳"], difficulty: 8, explanation: "A Bird (🐦) In The Hand (✋) Is Worth Two (2️⃣) In The Bush (🌳) = What you have is better than what you might get" },
		{ answer: "dont look a gift horse in the mouth", hints: ["🚫", "👀", "🎁", "🐴", "👄"], difficulty: 8, explanation: "Don't Look (🚫👀) A Gift (🎁) Horse (🐴) In The Mouth (👄) = Don't be ungrateful" },
		{ answer: "people who live in glass houses shouldnt throw stones", hints: ["👥", "🏠", "GLASS", "🚫", "🪨"], difficulty: 9, explanation: "People Who Live In Glass (🏠) Houses Shouldn't Throw Stones (🚫🪨) = Don't criticize if you have flaws" },
		{ answer: "the squeaky wheel gets the grease", hints: ["🛞", "SQUEAKY", "GETS", "🛢️"], difficulty: 7, explanation: "The Squeaky Wheel (🛞) Gets The Grease (🛢️) = The loudest complaint gets attention" },
	],
};

/**
 * Generate a seed based on date for consistent daily puzzles
 */
function generateDateSeed(date = new Date()) {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return year * 10000 + month * 100 + day;
}

/**
 * Seeded random number generator for consistent results
 */
class SeededRandom {
	private seed: number;

	constructor(seed: number) {
		this.seed = seed;
	}

	next() {
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return this.seed / 233280;
	}

	choice<T>(array: T[]): T {
		if (array.length === 0) {
			throw new Error("Cannot choose from empty array");
		}
		return array[Math.floor(this.next() * array.length)] as T;
	}

	shuffle<T>(array: T[]): T[] {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(this.next() * (i + 1));
			const temp = shuffled[i];
			const other = shuffled[j];
			if (temp !== undefined && other !== undefined) {
				shuffled[i] = other;
				shuffled[j] = temp;
			}
		}
		return shuffled;
	}
}

/**
 * Create enhanced visual hints for puzzles
 */
function enhanceHints(baseHints: string[], category: string, rng: SeededRandom): string[] {
	const enhanced = [...baseHints];

	// Add visual separators for compound words
	if (category === "compound_words" && enhanced.length === 2) {
		enhanced.splice(1, 0, "+");
	}

	// Add directional hints for phrases
	if (category === "phrase_puzzles") {
		enhanced.push("➡️");
	}

	// Add emphasis for difficult puzzles
	if (category === "creative_visual") {
		enhanced.push("🤔");
	}

	return enhanced;
}

/**
 * Generate puzzle metadata including SEO and topic information
 */
function generateMetadata(answer: string, category: string, difficulty: number) {
	const topics: Record<string, string> = {
		compound_words: "Nature & Objects",
		phonetic_puzzles: "Wordplay & Sounds",
		phrase_puzzles: "Common Expressions",
		creative_visual: "Visual Concepts",
		modern_tech: "Technology",
		pop_culture: "Entertainment & Media",
	};

	const keywords = answer.split(/\s+/).concat(["rebus puzzle", "word game", "brain teaser", topics[category]?.toLowerCase() || "puzzle"]);

	return {
		topic: topics[category] || "Puzzle",
		keyword: answer.replace(/\s+/g, ""),
		category: category.replace(/_/g, " "),
		relevanceScore: Math.max(1, 10 - difficulty),
		seoMetadata: {
			keywords,
			description: `Solve this ${topics[category]?.toLowerCase() || "puzzle"} rebus puzzle: ${answer}`,
			ogTitle: `Rebuzzle: ${answer.charAt(0).toUpperCase() + answer.slice(1)} Puzzle`,
			ogDescription: `Challenge yourself with today's rebus puzzle featuring ${answer}. Can you decode the visual clues?`,
		},
	};
}

/**
 * Generate a single puzzle for a specific date
 */
function generatePuzzleForDate(date = new Date()) {
	const seed = generateDateSeed(date);
	const rng = new SeededRandom(seed);

	// Select category based on day of week for variety
	const categoryNames = Object.keys(ANSWER_CATEGORIES);
	const dayOfWeek = date.getDay();
	const selectedCategoryKey = categoryNames[dayOfWeek % categoryNames.length];

	if (!selectedCategoryKey) {
		throw new Error("No category found");
	}

	const selectedCategory = selectedCategoryKey as keyof typeof ANSWER_CATEGORIES;

	// Choose puzzle from selected category
	const categoryPuzzles = ANSWER_CATEGORIES[selectedCategory];
	const puzzle = rng.choice(categoryPuzzles);

	// Enhance hints with additional visual elements
	const enhancedHints = enhanceHints(puzzle.hints, selectedCategoryKey, rng);

	// Generate comprehensive metadata
	const metadata = generateMetadata(puzzle.answer, selectedCategoryKey, puzzle.difficulty);

	// Create the final puzzle object
	return {
		id: `puzzle-${date.toISOString().split("T")[0]}`,
		rebusPuzzle: enhancedHints.join(" "),
		difficulty: puzzle.difficulty,
		answer: puzzle.answer,
		explanation: puzzle.explanation,
		hints: [`Think about ${(metadata.topic || "puzzles").toLowerCase()}`, `This is a ${puzzle.difficulty <= 2 ? "beginner" : puzzle.difficulty <= 3 ? "intermediate" : "advanced"} level puzzle`, `The answer is ${puzzle.answer.split(/\s+/).length > 1 ? "a phrase" : "a single word"}`],
		date: date.toISOString().split("T")[0],
		...metadata,
	};
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayDateString(): string {
	return new Date().toISOString().split("T")[0] || new Date().toDateString();
}

/**
 * Cached puzzle generation function - only runs once per day
 */
const getCachedDailyPuzzle = unstable_cache(
	async (dateString: string) => {
		console.log(`🎯 Generating new puzzle for ${dateString}`);
		const date = new Date(dateString + "T00:00:00.000Z");
		const puzzle = generatePuzzleForDate(date);
		console.log(`✅ Generated puzzle: ${puzzle.answer} (${puzzle.rebusPuzzle})`);
		return puzzle;
	},
	["daily-puzzle"],
	{
		tags: ["puzzle"],
		revalidate: 24 * 60 * 60, // Cache for 24 hours
	}
);

/**
 * Server action to get today's puzzle
 */
export async function getTodaysPuzzle() {
	try {
		const todayString = getTodayDateString();
		const puzzle = await getCachedDailyPuzzle(todayString);

		return {
			success: true,
			puzzle,
			generatedAt: new Date().toISOString(),
			cached: true,
		};
	} catch (error) {
		console.error("Error generating today's puzzle:", error);

		// Fallback to a simple puzzle if generation fails
		const fallbackPuzzle = {
			id: `fallback-${getTodayDateString()}`,
			rebusPuzzle: "📱 + 🏠",
			difficulty: 2,
			answer: "smartphone",
			explanation: "Smart (📱) + Phone (🏠) = Smartphone",
			hints: ["Think about technology", "This is a beginner level puzzle", "The answer is a single word"],
			date: getTodayDateString(),
			topic: "Technology",
			keyword: "smartphone",
			category: "modern tech",
			relevanceScore: 8,
			seoMetadata: {
				keywords: ["smartphone", "rebus puzzle", "word game", "brain teaser", "technology"],
				description: "Solve this technology rebus puzzle: smartphone",
				ogTitle: "Rebuzzle: Smartphone Puzzle",
				ogDescription: "Challenge yourself with today's rebus puzzle featuring smartphone. Can you decode the visual clues?",
			},
		};

		return {
			success: true,
			puzzle: fallbackPuzzle,
			generatedAt: new Date().toISOString(),
			cached: false,
			fallback: true,
		};
	}
}

/**
 * Server action to get a puzzle for a specific date
 */
export async function getPuzzleForDate(dateString: string) {
	try {
		// Validate date format
		if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
			throw new Error("Invalid date format. Use YYYY-MM-DD");
		}

		const puzzle = await getCachedDailyPuzzle(dateString);

		return {
			success: true,
			puzzle,
			generatedAt: new Date().toISOString(),
			cached: true,
		};
	} catch (error) {
		console.error(`Error generating puzzle for ${dateString}:`, error);

		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			generatedAt: new Date().toISOString(),
		};
	}
}

/**
 * Server action to preview puzzle generation (for testing)
 */
export async function previewPuzzleGeneration() {
	try {
		const today = new Date();
		const puzzles = [];

		// Generate 7 days of puzzles for preview
		for (let i = 0; i < 7; i++) {
			const date = new Date(today);
			date.setDate(today.getDate() + i);
			const puzzle = generatePuzzleForDate(date);
			puzzles.push({
				date: date.toISOString().split("T")[0],
				rebus: puzzle.rebusPuzzle,
				answer: puzzle.answer,
				difficulty: puzzle.difficulty,
				category: puzzle.category || "unknown",
			});
		}

		return {
			success: true,
			puzzles,
			generatedAt: new Date().toISOString(),
			message: "Preview of next 7 days of puzzles",
		};
	} catch (error) {
		console.error("Error previewing puzzle generation:", error);

		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			generatedAt: new Date().toISOString(),
		};
	}
}

/**
 * Server action to get puzzle statistics
 */
export async function getPuzzleStats() {
	try {
		const totalPuzzles = Object.values(ANSWER_CATEGORIES).reduce((sum, category) => sum + category.length, 0);
		const categoryStats = Object.entries(ANSWER_CATEGORIES).map(([category, puzzles]) => ({
			category: category.replace(/_/g, " "),
			count: puzzles.length,
			avgDifficulty: puzzles.reduce((sum, p) => sum + p.difficulty, 0) / puzzles.length,
		}));

		return {
			success: true,
			stats: {
				totalPuzzles,
				categories: categoryStats.length,
				categoryBreakdown: categoryStats,
				difficultyRange: {
					min: 1,
					max: 5,
					average: categoryStats.reduce((sum, c) => sum + c.avgDifficulty, 0) / categoryStats.length,
				},
			},
			generatedAt: new Date().toISOString(),
		};
	} catch (error) {
		console.error("Error getting puzzle stats:", error);

		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			generatedAt: new Date().toISOString(),
		};
	}
}

/**
 * Generate next puzzle (used by cron job)
 */
export async function generateNextPuzzle() {
	return getTodaysPuzzle();
}

/**
 * Generate a single puzzle for offline use (used by scripts)
 */
export async function generateSinglePuzzleForOfflineUse(existingKeywords: string[] = []) {
	// Generate a random date-based puzzle
	const randomDate = new Date();
	randomDate.setTime(randomDate.getTime() + Math.random() * 365 * 24 * 60 * 60 * 1000); // Random date within next year

	const puzzle = generatePuzzleForDate(randomDate);

	// Check if this keyword already exists
	if (existingKeywords.includes(puzzle.keyword.toLowerCase())) {
		return null; // Skip duplicate
	}

	return {
		rebusPuzzle: puzzle.rebusPuzzle,
		difficulty: puzzle.difficulty,
		answer: puzzle.answer,
		explanation: puzzle.explanation,
		hints: puzzle.hints,
		topic: puzzle.topic,
		keyword: puzzle.keyword,
		category: puzzle.category,
		relevanceScore: puzzle.relevanceScore,
	};
} 