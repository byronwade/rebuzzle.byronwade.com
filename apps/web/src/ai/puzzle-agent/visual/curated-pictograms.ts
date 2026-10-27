import {
  AlarmClock,
  Anchor,
  Apple,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Axe,
  Baby,
  Backpack,
  Banana,
  BatteryFull,
  Bean,
  Bed,
  Beer,
  Bell,
  Bike,
  Binoculars,
  Bird,
  Bomb,
  Bone,
  BookOpen,
  BoomBox,
  Bot,
  Box,
  Brain,
  BrickWall,
  Briefcase,
  Brush,
  Bug,
  Bus,
  CakeSlice,
  Calendar,
  Camera,
  Candy,
  Car,
  Castle,
  Cat,
  Cherry,
  CircleDollarSign,
  Citrus,
  Clock,
  Cloud,
  CloudRain,
  Clover,
  Coffee,
  Coins,
  Compass,
  Cookie,
  CookingPot,
  Crown,
  CupSoda,
  Dice5,
  Dog,
  DoorOpen,
  Droplets,
  Drum,
  Drumstick,
  Dumbbell,
  Ear,
  Egg,
  Eye,
  Feather,
  FerrisWheel,
  Fish,
  Flame,
  Flower2,
  Footprints,
  Gem,
  Ghost,
  Gift,
  Glasses,
  Globe,
  GraduationCap,
  Guitar,
  Hammer,
  Hand,
  HardHat,
  Headphones,
  Heart,
  Hourglass,
  House,
  IceCreamBowl,
  Key,
  Keyboard,
  Lamp,
  Leaf,
  Lightbulb,
  Lock,
  Lollipop,
  Magnet,
  Mail,
  Map as MapIcon,
  Medal,
  Megaphone,
  Mic,
  Microscope,
  Milk,
  Moon,
  Mountain,
  Mouse,
  Music2,
  Newspaper,
  Nut,
  Orbit,
  Package,
  Palette,
  PawPrint,
  Pencil,
  Piano,
  PiggyBank,
  Pill,
  Pin,
  Pizza,
  Plane,
  Popcorn,
  Puzzle,
  Rabbit,
  Rainbow,
  Rat,
  Ribbon,
  Rocket,
  Sailboat,
  Scale,
  Scissors,
  Settings,
  Shell,
  Shield,
  ShipWheel,
  Shirt,
  ShoppingBag,
  Shovel,
  Skull,
  Smartphone,
  Smile,
  Snail,
  Snowflake,
  Sofa,
  Sprout,
  Squirrel,
  Star,
  Stethoscope,
  Sun,
  Sword,
  Target,
  Tent,
  Thermometer,
  Ticket,
  Tractor,
  TrafficCone,
  TrainFront,
  Trash2,
  TreeDeciduous,
  Trophy,
  Truck,
  Tv,
  Umbrella,
  Wallet,
  WandSparkles,
  Watch,
  Waves,
  Wheat,
  Wine,
  Worm,
  Wrench,
  Zap,
} from "lucide";
import { resolveMaterialSymbolCandidate } from "./material-symbol-candidates";
import { sanitizePictogramSvg } from "./sanitize-svg";
import { INK_PICTOGRAM_PALETTE } from "./style";

export const CURATED_PICTOGRAM_CATALOG_VERSION = "lucide-v2";

export const CURATED_PICTOGRAM_READING_POLICY_VERSION = "readings-v1";

type CuratedPictogramEntry = {
  id: string;
  approvedReadings: string[];
  searchAliases?: string[];
  commonConfusions?: string[];
  icon: IconNode;
};

type IconAttributes = Record<string, string | number>;
type IconNodeChild = readonly [tag: string, attrs: IconAttributes];
type IconNode = readonly [tag: string, attrs: IconAttributes, children?: readonly IconNodeChild[]];

function escapeAttribute(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function serializeIconNode(node: IconNode | IconNodeChild, overrides?: IconAttributes): string {
  const [tag, attributes, children = []] = node;
  const merged = { ...attributes, ...overrides };
  const attrs = Object.entries(merged)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ");
  const body = children.map((child) => serializeIconNode(child)).join("");
  return body ? `<${tag} ${attrs}>${body}</${tag}>` : `<${tag} ${attrs}/>`;
}

const CATALOG: CuratedPictogramEntry[] = [
  { id: "alarm-clock", approvedReadings: ["alarm clock", "alarm"], icon: AlarmClock },
  { id: "anchor", approvedReadings: ["anchor"], icon: Anchor },
  { id: "apple", approvedReadings: ["apple", "fruit"], icon: Apple },
  { id: "arrow-down", approvedReadings: ["arrow down", "down arrow"], icon: ArrowDown },
  { id: "arrow-left", approvedReadings: ["arrow left", "left arrow"], icon: ArrowLeft },
  { id: "arrow-right", approvedReadings: ["arrow right", "right arrow"], icon: ArrowRight },
  { id: "arrow-up", approvedReadings: ["arrow up", "up arrow"], icon: ArrowUp },
  { id: "axe", approvedReadings: ["axe", "hatchet"], icon: Axe },
  { id: "baby", approvedReadings: ["baby", "infant"], icon: Baby },
  { id: "backpack", approvedReadings: ["backpack", "rucksack"], icon: Backpack },
  { id: "banana", approvedReadings: ["banana"], icon: Banana },
  { id: "battery", approvedReadings: ["battery"], icon: BatteryFull },
  { id: "bean", approvedReadings: ["bean"], icon: Bean },
  { id: "bed", approvedReadings: ["bed"], icon: Bed },
  { id: "beer", approvedReadings: ["beer", "mug"], icon: Beer },
  { id: "bell", approvedReadings: ["bell"], icon: Bell },
  { id: "bicycle", approvedReadings: ["bicycle", "bike"], icon: Bike },
  { id: "binoculars", approvedReadings: ["binoculars"], icon: Binoculars },
  { id: "bird", approvedReadings: ["bird"], icon: Bird },
  { id: "bomb", approvedReadings: ["bomb"], icon: Bomb },
  { id: "bone", approvedReadings: ["bone"], icon: Bone },
  { id: "book", approvedReadings: ["book", "open book"], icon: BookOpen },
  { id: "bot", approvedReadings: ["bot", "robot"], icon: Bot },
  { id: "box", approvedReadings: ["box", "crate"], icon: Box },
  { id: "brain", approvedReadings: ["brain"], icon: Brain },
  { id: "brick-wall", approvedReadings: ["brick wall", "bricks", "wall"], icon: BrickWall },
  { id: "briefcase", approvedReadings: ["briefcase"], icon: Briefcase },
  { id: "brush", approvedReadings: ["brush", "paintbrush"], icon: Brush },
  { id: "bug", approvedReadings: ["bug", "insect"], icon: Bug },
  { id: "bus", approvedReadings: ["bus"], icon: Bus },
  { id: "cake", approvedReadings: ["cake", "cake slice"], icon: CakeSlice },
  { id: "calendar", approvedReadings: ["calendar", "date"], icon: Calendar },
  { id: "camera", approvedReadings: ["camera"], icon: Camera },
  { id: "candy", approvedReadings: ["candy", "sweet"], icon: Candy },
  {
    id: "car",
    approvedReadings: ["car", "automobile", "auto"],
    searchAliases: ["car", "automobile", "auto", "sedan"],
    commonConfusions: ["sedan"],
    icon: Car,
  },
  { id: "castle", approvedReadings: ["castle"], icon: Castle },
  {
    id: "cat",
    approvedReadings: ["cat"],
    searchAliases: ["cat", "kitten"],
    commonConfusions: ["kitten"],
    icon: Cat,
  },
  { id: "cherry", approvedReadings: ["cherry", "cherries"], icon: Cherry },
  {
    id: "citrus",
    approvedReadings: ["citrus"],
    searchAliases: ["citrus", "orange", "lemon"],
    commonConfusions: ["orange", "lemon"],
    icon: Citrus,
  },
  { id: "clock", approvedReadings: ["clock", "timepiece"], icon: Clock },
  { id: "cloud", approvedReadings: ["cloud"], icon: Cloud },
  {
    id: "clover",
    approvedReadings: ["clover"],
    searchAliases: ["clover", "shamrock"],
    commonConfusions: ["shamrock"],
    icon: Clover,
  },
  { id: "coffee", approvedReadings: ["coffee", "coffee cup"], icon: Coffee },
  { id: "coins", approvedReadings: ["coins", "change"], icon: Coins },
  { id: "compass", approvedReadings: ["compass"], icon: Compass },
  { id: "cookie", approvedReadings: ["cookie", "biscuit"], icon: Cookie },
  { id: "cooking-pot", approvedReadings: ["cooking pot", "pot"], icon: CookingPot },
  { id: "crown", approvedReadings: ["crown"], icon: Crown },
  { id: "dice", approvedReadings: ["dice", "die"], icon: Dice5 },
  { id: "diamond", approvedReadings: ["diamond", "gem", "gemstone"], icon: Gem },
  {
    id: "dog",
    approvedReadings: ["dog"],
    searchAliases: ["dog", "puppy"],
    commonConfusions: ["puppy"],
    icon: Dog,
  },
  { id: "door", approvedReadings: ["door", "open door"], icon: DoorOpen },
  { id: "drum", approvedReadings: ["drum"], icon: Drum },
  { id: "drumstick", approvedReadings: ["drumstick", "chicken leg"], icon: Drumstick },
  { id: "dumbbell", approvedReadings: ["dumbbell", "weights"], icon: Dumbbell },
  { id: "ear", approvedReadings: ["ear"], icon: Ear },
  { id: "egg", approvedReadings: ["egg"], icon: Egg },
  { id: "envelope", approvedReadings: ["envelope", "mail", "letter"], icon: Mail },
  { id: "eye", approvedReadings: ["eye", "eyeball"], icon: Eye },
  { id: "feather", approvedReadings: ["feather"], icon: Feather },
  { id: "ferris-wheel", approvedReadings: ["ferris wheel"], icon: FerrisWheel },
  { id: "fire", approvedReadings: ["fire", "flame"], icon: Flame },
  { id: "fish", approvedReadings: ["fish"], icon: Fish },
  { id: "flower", approvedReadings: ["flower", "blossom"], icon: Flower2 },
  { id: "footprints", approvedReadings: ["footprints", "footsteps"], icon: Footprints },
  { id: "gear", approvedReadings: ["gear", "cog"], icon: Settings },
  { id: "ghost", approvedReadings: ["ghost"], icon: Ghost },
  { id: "gift", approvedReadings: ["gift", "present"], icon: Gift },
  { id: "glasses", approvedReadings: ["glasses", "eyeglasses", "spectacles"], icon: Glasses },
  { id: "globe", approvedReadings: ["globe", "world", "earth"], icon: Globe },
  {
    id: "graduation-cap",
    approvedReadings: ["graduation cap", "mortarboard"],
    icon: GraduationCap,
  },
  { id: "guitar", approvedReadings: ["guitar"], icon: Guitar },
  { id: "hand", approvedReadings: ["hand", "palm"], icon: Hand },
  { id: "hammer", approvedReadings: ["hammer"], icon: Hammer },
  { id: "hard-hat", approvedReadings: ["hard hat", "construction helmet"], icon: HardHat },
  {
    id: "headphones",
    approvedReadings: ["headphones"],
    searchAliases: ["headphones", "headset"],
    commonConfusions: ["headset"],
    icon: Headphones,
  },
  { id: "heart", approvedReadings: ["heart"], icon: Heart },
  { id: "hourglass", approvedReadings: ["hourglass", "sandglass"], icon: Hourglass },
  { id: "house", approvedReadings: ["house", "home"], icon: House },
  { id: "ice-cream", approvedReadings: ["ice cream", "ice cream bowl"], icon: IceCreamBowl },
  { id: "key", approvedReadings: ["key"], icon: Key },
  { id: "keyboard", approvedReadings: ["keyboard"], icon: Keyboard },
  { id: "lamp", approvedReadings: ["lamp"], icon: Lamp },
  { id: "leaf", approvedReadings: ["leaf"], icon: Leaf },
  { id: "lightbulb", approvedReadings: ["lightbulb", "light bulb", "bulb"], icon: Lightbulb },
  { id: "lock", approvedReadings: ["lock", "padlock"], icon: Lock },
  { id: "lollipop", approvedReadings: ["lollipop", "sucker"], icon: Lollipop },
  { id: "magnet", approvedReadings: ["magnet"], icon: Magnet },
  { id: "map", approvedReadings: ["map"], icon: MapIcon },
  { id: "medal", approvedReadings: ["medal"], icon: Medal },
  { id: "megaphone", approvedReadings: ["megaphone", "loudspeaker"], icon: Megaphone },
  { id: "mic", approvedReadings: ["mic", "microphone"], icon: Mic },
  { id: "microscope", approvedReadings: ["microscope"], icon: Microscope },
  { id: "milk", approvedReadings: ["milk", "milk carton"], icon: Milk },
  { id: "money", approvedReadings: ["money", "dollar", "coin"], icon: CircleDollarSign },
  { id: "moon", approvedReadings: ["moon", "crescent"], icon: Moon },
  { id: "mountain", approvedReadings: ["mountain", "peak"], icon: Mountain },
  {
    id: "computer-mouse",
    approvedReadings: ["computer mouse", "mouse device"],
    icon: Mouse,
  },
  { id: "music", approvedReadings: ["music", "musical note"], icon: Music2 },
  { id: "newspaper", approvedReadings: ["newspaper", "news"], icon: Newspaper },
  { id: "nut", approvedReadings: ["nut", "acorn"], icon: Nut },
  {
    id: "orbit",
    approvedReadings: ["orbit"],
    searchAliases: ["orbit", "planet"],
    commonConfusions: ["planet"],
    icon: Orbit,
  },
  { id: "package", approvedReadings: ["package", "parcel", "shipment"], icon: Package },
  { id: "paint-palette", approvedReadings: ["paint palette", "palette"], icon: Palette },
  { id: "paw-print", approvedReadings: ["paw print", "paw"], icon: PawPrint },
  { id: "pencil", approvedReadings: ["pencil"], icon: Pencil },
  { id: "phone", approvedReadings: ["phone", "smartphone", "mobile phone"], icon: Smartphone },
  { id: "piano", approvedReadings: ["piano", "keyboard instrument"], icon: Piano },
  { id: "piggy-bank", approvedReadings: ["piggy bank"], icon: PiggyBank },
  { id: "pill", approvedReadings: ["pill", "medicine"], icon: Pill },
  { id: "pin", approvedReadings: ["pin", "pushpin"], icon: Pin },
  { id: "pizza", approvedReadings: ["pizza", "pizza slice"], icon: Pizza },
  { id: "plane", approvedReadings: ["plane", "airplane", "jet"], icon: Plane },
  { id: "popcorn", approvedReadings: ["popcorn"], icon: Popcorn },
  { id: "puzzle", approvedReadings: ["puzzle", "jigsaw"], icon: Puzzle },
  { id: "rabbit", approvedReadings: ["rabbit", "bunny"], icon: Rabbit },
  { id: "radio", approvedReadings: ["radio", "boombox"], icon: BoomBox },
  {
    id: "rain",
    approvedReadings: [
      "rain",
      "rain cloud",
      "cloud with rain",
      "cloud with falling lines",
      "cloud with raindrops",
    ],
    icon: CloudRain,
  },
  { id: "rainbow", approvedReadings: ["rainbow"], icon: Rainbow },
  { id: "rat", approvedReadings: ["rat", "rodent"], icon: Rat },
  { id: "ribbon", approvedReadings: ["ribbon"], icon: Ribbon },
  { id: "rocket", approvedReadings: ["rocket"], icon: Rocket },
  { id: "scale", approvedReadings: ["scale", "balance"], icon: Scale },
  { id: "scissors", approvedReadings: ["scissors"], icon: Scissors },
  { id: "shell", approvedReadings: ["shell", "seashell"], icon: Shell },
  { id: "shield", approvedReadings: ["shield"], icon: Shield },
  { id: "shirt", approvedReadings: ["shirt", "t-shirt"], icon: Shirt },
  { id: "shopping-bag", approvedReadings: ["shopping bag", "bag"], icon: ShoppingBag },
  { id: "ship-wheel", approvedReadings: ["ship wheel", "steering wheel"], icon: ShipWheel },
  { id: "shovel", approvedReadings: ["shovel"], icon: Shovel },
  { id: "skull", approvedReadings: ["skull"], icon: Skull },
  { id: "smile", approvedReadings: ["smile", "smiley", "happy face"], icon: Smile },
  { id: "snail", approvedReadings: ["snail"], icon: Snail },
  { id: "snowflake", approvedReadings: ["snowflake", "snow"], icon: Snowflake },
  { id: "soda", approvedReadings: ["soda", "soft drink", "drink cup"], icon: CupSoda },
  { id: "sofa", approvedReadings: ["sofa", "couch"], icon: Sofa },
  { id: "sprout", approvedReadings: ["sprout", "seedling"], icon: Sprout },
  { id: "squirrel", approvedReadings: ["squirrel"], icon: Squirrel },
  { id: "star", approvedReadings: ["star"], icon: Star },
  { id: "stethoscope", approvedReadings: ["stethoscope"], icon: Stethoscope },
  { id: "sun", approvedReadings: ["sun", "sunshine"], icon: Sun },
  { id: "sword", approvedReadings: ["sword"], icon: Sword },
  { id: "target", approvedReadings: ["target", "bullseye"], icon: Target },
  { id: "tent", approvedReadings: ["tent"], icon: Tent },
  { id: "thermometer", approvedReadings: ["thermometer", "temperature"], icon: Thermometer },
  { id: "ticket", approvedReadings: ["ticket"], icon: Ticket },
  { id: "tractor", approvedReadings: ["tractor"], icon: Tractor },
  { id: "traffic-cone", approvedReadings: ["traffic cone", "cone"], icon: TrafficCone },
  { id: "train", approvedReadings: ["train", "locomotive"], icon: TrainFront },
  { id: "tree", approvedReadings: ["tree"], icon: TreeDeciduous },
  { id: "trash", approvedReadings: ["trash", "garbage", "trash can"], icon: Trash2 },
  { id: "truck", approvedReadings: ["truck"], icon: Truck },
  { id: "trophy", approvedReadings: ["trophy"], icon: Trophy },
  { id: "television", approvedReadings: ["television", "tv"], icon: Tv },
  { id: "umbrella", approvedReadings: ["umbrella"], icon: Umbrella },
  { id: "wallet", approvedReadings: ["wallet"], icon: Wallet },
  { id: "wand", approvedReadings: ["wand", "magic wand"], icon: WandSparkles },
  { id: "water", approvedReadings: ["water", "droplets", "drops"], icon: Droplets },
  { id: "watch", approvedReadings: ["watch", "wristwatch"], icon: Watch },
  { id: "waves", approvedReadings: ["waves", "wave", "ocean"], icon: Waves },
  { id: "wheat", approvedReadings: ["wheat", "grain"], icon: Wheat },
  { id: "wine-glass", approvedReadings: ["wine glass", "wine"], icon: Wine },
  { id: "worm", approvedReadings: ["worm"], icon: Worm },
  { id: "wrench", approvedReadings: ["wrench", "spanner"], icon: Wrench },
  { id: "lightning", approvedReadings: ["lightning", "lightning bolt"], icon: Zap },
  { id: "boat", approvedReadings: ["boat", "sailboat"], icon: Sailboat },
];

/**
 * Assets that failed the complete multi-model, multi-size recognition benchmark.
 * Keep them available for diagnostic reruns, but never offer them to generation
 * or accept their provenance until a versioned replacement passes the gate.
 */
export const QUARANTINED_CURATED_PICTOGRAM_IDS = [
  "battery",
  "bomb",
  "box",
  "briefcase",
  "cake",
  "cloud",
  "coffee",
  "compass",
  "milk",
  "mountain",
  "computer-mouse",
  "radio",
  "rainbow",
  "rat",
  "shell",
  "shopping-bag",
  "soda",
  "tent",
  "water",
  "waves",
] as const;

const QUARANTINED_IDS = new Set<string>(QUARANTINED_CURATED_PICTOGRAM_IDS);

function normalizeConcept(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type CuratedPictogram = {
  assetId: string;
  canonicalConcept: string;
  svg: string;
};

/** Resolve common concrete nouns to a stable, versioned local icon. */
export function resolveCuratedPictogram(
  concept: string,
  options: { includeQuarantined?: boolean } = {}
): CuratedPictogram | null {
  const normalized = normalizeConcept(concept);
  const entry = CATALOG.find((candidate) =>
    candidate.approvedReadings.some((alias) => normalizeConcept(alias) === normalized)
  );
  if (!entry || (!options.includeQuarantined && QUARANTINED_IDS.has(entry.id))) return null;
  if (options.includeQuarantined && QUARANTINED_IDS.has(entry.id)) {
    const replacement = resolveMaterialSymbolCandidate(entry.id);
    if (replacement) return replacement;
  }

  const raw = serializeIconNode(entry.icon, {
    width: 64,
    height: 64,
    stroke: INK_PICTOGRAM_PALETTE.ink,
    fill: "none",
    "stroke-width": 1.5,
    "aria-hidden": "true",
  });
  const svg = sanitizePictogramSvg(raw);
  if (!svg) return null;

  return {
    assetId: `lucide:${entry.id}:v2`,
    canonicalConcept: entry.id,
    svg,
  };
}

export function listCuratedPictogramIds(options: { includeQuarantined?: boolean } = {}): string[] {
  return CATALOG.flatMap((entry) =>
    options.includeQuarantined || !QUARANTINED_IDS.has(entry.id) ? [entry.id] : []
  );
}

export type CuratedPictogramReadingPolicy = {
  assetId: string;
  canonicalConcept: string;
  searchAliases: string[];
  approvedReadings: string[];
  commonConfusions: string[];
};

/** Discovery only: finding a search term does not authorize that puzzle reading. */
export function getCuratedPictogramReadingPolicy(
  conceptOrAssetId: string
): CuratedPictogramReadingPolicy | null {
  const normalized = normalizeConcept(conceptOrAssetId);
  const entry = CATALOG.find((candidate) =>
    conceptOrAssetId.startsWith("lucide:")
      ? conceptOrAssetId === `lucide:${candidate.id}:v2`
      : [candidate.id, ...(candidate.searchAliases ?? candidate.approvedReadings)].some(
          (alias) => normalizeConcept(alias) === normalized
        )
  );
  if (!entry) return null;
  return {
    assetId: `lucide:${entry.id}:v2`,
    canonicalConcept: entry.id,
    searchAliases: [...(entry.searchAliases ?? entry.approvedReadings)],
    approvedReadings: [...entry.approvedReadings],
    commonConfusions: [...(entry.commonConfusions ?? [])],
  };
}

/** Compatibility accessor: only supported readings, never discovery aliases. */
export function getCuratedPictogramAliases(concept: string): string[] {
  const policy = getCuratedPictogramReadingPolicy(concept);
  if (
    !policy?.approvedReadings.some(
      (reading) => normalizeConcept(reading) === normalizeConcept(concept)
    )
  )
    return [];
  return policy.approvedReadings;
}

/** Prevent an agent from spoofing catalog provenance to bypass generated-SVG gates. */
export function isAuthenticCuratedPictogram(input: {
  concept: string;
  assetId?: string;
  svg?: string;
}): boolean {
  if (!input.assetId || !input.svg) return false;
  const curated = resolveCuratedPictogram(input.concept);
  return Boolean(curated && curated.assetId === input.assetId && curated.svg === input.svg);
}
