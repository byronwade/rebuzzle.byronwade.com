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

type CuratedPictogramEntry = {
  id: string;
  aliases: string[];
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
  { id: "alarm-clock", aliases: ["alarm clock", "alarm"], icon: AlarmClock },
  { id: "anchor", aliases: ["anchor"], icon: Anchor },
  { id: "apple", aliases: ["apple", "fruit"], icon: Apple },
  { id: "arrow-down", aliases: ["arrow down", "down arrow"], icon: ArrowDown },
  { id: "arrow-left", aliases: ["arrow left", "left arrow"], icon: ArrowLeft },
  { id: "arrow-right", aliases: ["arrow right", "right arrow"], icon: ArrowRight },
  { id: "arrow-up", aliases: ["arrow up", "up arrow"], icon: ArrowUp },
  { id: "axe", aliases: ["axe", "hatchet"], icon: Axe },
  { id: "baby", aliases: ["baby", "infant"], icon: Baby },
  { id: "backpack", aliases: ["backpack", "rucksack"], icon: Backpack },
  { id: "banana", aliases: ["banana"], icon: Banana },
  { id: "battery", aliases: ["battery"], icon: BatteryFull },
  { id: "bean", aliases: ["bean"], icon: Bean },
  { id: "bed", aliases: ["bed"], icon: Bed },
  { id: "beer", aliases: ["beer", "mug"], icon: Beer },
  { id: "bell", aliases: ["bell"], icon: Bell },
  { id: "bicycle", aliases: ["bicycle", "bike"], icon: Bike },
  { id: "binoculars", aliases: ["binoculars"], icon: Binoculars },
  { id: "bird", aliases: ["bird"], icon: Bird },
  { id: "bomb", aliases: ["bomb"], icon: Bomb },
  { id: "bone", aliases: ["bone"], icon: Bone },
  { id: "book", aliases: ["book", "open book"], icon: BookOpen },
  { id: "bot", aliases: ["bot", "robot"], icon: Bot },
  { id: "box", aliases: ["box", "crate"], icon: Box },
  { id: "brain", aliases: ["brain"], icon: Brain },
  { id: "brick-wall", aliases: ["brick wall", "bricks", "wall"], icon: BrickWall },
  { id: "briefcase", aliases: ["briefcase"], icon: Briefcase },
  { id: "brush", aliases: ["brush", "paintbrush"], icon: Brush },
  { id: "bug", aliases: ["bug", "insect"], icon: Bug },
  { id: "bus", aliases: ["bus"], icon: Bus },
  { id: "cake", aliases: ["cake", "cake slice"], icon: CakeSlice },
  { id: "calendar", aliases: ["calendar", "date"], icon: Calendar },
  { id: "camera", aliases: ["camera"], icon: Camera },
  { id: "candy", aliases: ["candy", "sweet"], icon: Candy },
  { id: "car", aliases: ["car", "automobile", "auto", "sedan"], icon: Car },
  { id: "castle", aliases: ["castle"], icon: Castle },
  { id: "cat", aliases: ["cat", "kitten"], icon: Cat },
  { id: "cherry", aliases: ["cherry", "cherries"], icon: Cherry },
  { id: "citrus", aliases: ["citrus", "orange", "lemon"], icon: Citrus },
  { id: "clock", aliases: ["clock", "timepiece"], icon: Clock },
  { id: "cloud", aliases: ["cloud"], icon: Cloud },
  { id: "clover", aliases: ["clover", "shamrock"], icon: Clover },
  { id: "coffee", aliases: ["coffee", "coffee cup"], icon: Coffee },
  { id: "coins", aliases: ["coins", "change"], icon: Coins },
  { id: "compass", aliases: ["compass"], icon: Compass },
  { id: "cookie", aliases: ["cookie", "biscuit"], icon: Cookie },
  { id: "cooking-pot", aliases: ["cooking pot", "pot"], icon: CookingPot },
  { id: "crown", aliases: ["crown"], icon: Crown },
  { id: "dice", aliases: ["dice", "die"], icon: Dice5 },
  { id: "diamond", aliases: ["diamond", "gem", "gemstone"], icon: Gem },
  { id: "dog", aliases: ["dog", "puppy"], icon: Dog },
  { id: "door", aliases: ["door", "open door"], icon: DoorOpen },
  { id: "drum", aliases: ["drum"], icon: Drum },
  { id: "drumstick", aliases: ["drumstick", "chicken leg"], icon: Drumstick },
  { id: "dumbbell", aliases: ["dumbbell", "weights"], icon: Dumbbell },
  { id: "ear", aliases: ["ear"], icon: Ear },
  { id: "egg", aliases: ["egg"], icon: Egg },
  { id: "envelope", aliases: ["envelope", "mail", "letter"], icon: Mail },
  { id: "eye", aliases: ["eye", "eyeball"], icon: Eye },
  { id: "feather", aliases: ["feather"], icon: Feather },
  { id: "ferris-wheel", aliases: ["ferris wheel"], icon: FerrisWheel },
  { id: "fire", aliases: ["fire", "flame"], icon: Flame },
  { id: "fish", aliases: ["fish"], icon: Fish },
  { id: "flower", aliases: ["flower", "blossom"], icon: Flower2 },
  { id: "footprints", aliases: ["footprints", "footsteps"], icon: Footprints },
  { id: "gear", aliases: ["gear", "cog"], icon: Settings },
  { id: "ghost", aliases: ["ghost"], icon: Ghost },
  { id: "gift", aliases: ["gift", "present"], icon: Gift },
  { id: "glasses", aliases: ["glasses", "eyeglasses", "spectacles"], icon: Glasses },
  { id: "globe", aliases: ["globe", "world", "earth"], icon: Globe },
  {
    id: "graduation-cap",
    aliases: ["graduation cap", "mortarboard"],
    icon: GraduationCap,
  },
  { id: "guitar", aliases: ["guitar"], icon: Guitar },
  { id: "hand", aliases: ["hand", "palm"], icon: Hand },
  { id: "hammer", aliases: ["hammer"], icon: Hammer },
  { id: "hard-hat", aliases: ["hard hat", "construction helmet"], icon: HardHat },
  { id: "headphones", aliases: ["headphones", "headset"], icon: Headphones },
  { id: "heart", aliases: ["heart"], icon: Heart },
  { id: "hourglass", aliases: ["hourglass", "sandglass"], icon: Hourglass },
  { id: "house", aliases: ["house", "home"], icon: House },
  { id: "ice-cream", aliases: ["ice cream", "ice cream bowl"], icon: IceCreamBowl },
  { id: "key", aliases: ["key"], icon: Key },
  { id: "keyboard", aliases: ["keyboard"], icon: Keyboard },
  { id: "lamp", aliases: ["lamp"], icon: Lamp },
  { id: "leaf", aliases: ["leaf"], icon: Leaf },
  { id: "lightbulb", aliases: ["lightbulb", "light bulb", "bulb"], icon: Lightbulb },
  { id: "lock", aliases: ["lock", "padlock"], icon: Lock },
  { id: "lollipop", aliases: ["lollipop", "sucker"], icon: Lollipop },
  { id: "magnet", aliases: ["magnet"], icon: Magnet },
  { id: "map", aliases: ["map"], icon: MapIcon },
  { id: "medal", aliases: ["medal"], icon: Medal },
  { id: "megaphone", aliases: ["megaphone", "loudspeaker"], icon: Megaphone },
  { id: "mic", aliases: ["mic", "microphone"], icon: Mic },
  { id: "microscope", aliases: ["microscope"], icon: Microscope },
  { id: "milk", aliases: ["milk", "milk carton"], icon: Milk },
  { id: "money", aliases: ["money", "dollar", "coin"], icon: CircleDollarSign },
  { id: "moon", aliases: ["moon", "crescent"], icon: Moon },
  { id: "mountain", aliases: ["mountain", "peak"], icon: Mountain },
  {
    id: "computer-mouse",
    aliases: ["computer mouse", "mouse device"],
    icon: Mouse,
  },
  { id: "music", aliases: ["music", "musical note"], icon: Music2 },
  { id: "newspaper", aliases: ["newspaper", "news"], icon: Newspaper },
  { id: "nut", aliases: ["nut", "acorn"], icon: Nut },
  { id: "orbit", aliases: ["orbit", "planet"], icon: Orbit },
  { id: "package", aliases: ["package", "parcel", "shipment"], icon: Package },
  { id: "paint-palette", aliases: ["paint palette", "palette"], icon: Palette },
  { id: "paw-print", aliases: ["paw print", "paw"], icon: PawPrint },
  { id: "pencil", aliases: ["pencil"], icon: Pencil },
  { id: "phone", aliases: ["phone", "smartphone", "mobile phone"], icon: Smartphone },
  { id: "piano", aliases: ["piano", "keyboard instrument"], icon: Piano },
  { id: "piggy-bank", aliases: ["piggy bank"], icon: PiggyBank },
  { id: "pill", aliases: ["pill", "medicine"], icon: Pill },
  { id: "pin", aliases: ["pin", "pushpin"], icon: Pin },
  { id: "pizza", aliases: ["pizza", "pizza slice"], icon: Pizza },
  { id: "plane", aliases: ["plane", "airplane", "jet"], icon: Plane },
  { id: "popcorn", aliases: ["popcorn"], icon: Popcorn },
  { id: "puzzle", aliases: ["puzzle", "jigsaw"], icon: Puzzle },
  { id: "rabbit", aliases: ["rabbit", "bunny"], icon: Rabbit },
  { id: "radio", aliases: ["radio", "boombox"], icon: BoomBox },
  {
    id: "rain",
    aliases: [
      "rain",
      "rain cloud",
      "cloud with rain",
      "cloud with falling lines",
      "cloud with raindrops",
    ],
    icon: CloudRain,
  },
  { id: "rainbow", aliases: ["rainbow"], icon: Rainbow },
  { id: "rat", aliases: ["rat", "rodent"], icon: Rat },
  { id: "ribbon", aliases: ["ribbon"], icon: Ribbon },
  { id: "rocket", aliases: ["rocket"], icon: Rocket },
  { id: "scale", aliases: ["scale", "balance"], icon: Scale },
  { id: "scissors", aliases: ["scissors"], icon: Scissors },
  { id: "shell", aliases: ["shell", "seashell"], icon: Shell },
  { id: "shield", aliases: ["shield"], icon: Shield },
  { id: "shirt", aliases: ["shirt", "t-shirt"], icon: Shirt },
  { id: "shopping-bag", aliases: ["shopping bag", "bag"], icon: ShoppingBag },
  { id: "ship-wheel", aliases: ["ship wheel", "steering wheel"], icon: ShipWheel },
  { id: "shovel", aliases: ["shovel"], icon: Shovel },
  { id: "skull", aliases: ["skull"], icon: Skull },
  { id: "smile", aliases: ["smile", "smiley", "happy face"], icon: Smile },
  { id: "snail", aliases: ["snail"], icon: Snail },
  { id: "snowflake", aliases: ["snowflake", "snow"], icon: Snowflake },
  { id: "soda", aliases: ["soda", "soft drink", "drink cup"], icon: CupSoda },
  { id: "sofa", aliases: ["sofa", "couch"], icon: Sofa },
  { id: "sprout", aliases: ["sprout", "seedling"], icon: Sprout },
  { id: "squirrel", aliases: ["squirrel"], icon: Squirrel },
  { id: "star", aliases: ["star"], icon: Star },
  { id: "stethoscope", aliases: ["stethoscope"], icon: Stethoscope },
  { id: "sun", aliases: ["sun", "sunshine"], icon: Sun },
  { id: "sword", aliases: ["sword"], icon: Sword },
  { id: "target", aliases: ["target", "bullseye"], icon: Target },
  { id: "tent", aliases: ["tent"], icon: Tent },
  { id: "thermometer", aliases: ["thermometer", "temperature"], icon: Thermometer },
  { id: "ticket", aliases: ["ticket"], icon: Ticket },
  { id: "tractor", aliases: ["tractor"], icon: Tractor },
  { id: "traffic-cone", aliases: ["traffic cone", "cone"], icon: TrafficCone },
  { id: "train", aliases: ["train", "locomotive"], icon: TrainFront },
  { id: "tree", aliases: ["tree"], icon: TreeDeciduous },
  { id: "trash", aliases: ["trash", "garbage", "trash can"], icon: Trash2 },
  { id: "truck", aliases: ["truck"], icon: Truck },
  { id: "trophy", aliases: ["trophy"], icon: Trophy },
  { id: "television", aliases: ["television", "tv"], icon: Tv },
  { id: "umbrella", aliases: ["umbrella"], icon: Umbrella },
  { id: "wallet", aliases: ["wallet"], icon: Wallet },
  { id: "wand", aliases: ["wand", "magic wand"], icon: WandSparkles },
  { id: "water", aliases: ["water", "droplets", "drops"], icon: Droplets },
  { id: "watch", aliases: ["watch", "wristwatch"], icon: Watch },
  { id: "waves", aliases: ["waves", "wave", "ocean"], icon: Waves },
  { id: "wheat", aliases: ["wheat", "grain"], icon: Wheat },
  { id: "wine-glass", aliases: ["wine glass", "wine"], icon: Wine },
  { id: "worm", aliases: ["worm"], icon: Worm },
  { id: "wrench", aliases: ["wrench", "spanner"], icon: Wrench },
  { id: "lightning", aliases: ["lightning", "lightning bolt"], icon: Zap },
  { id: "boat", aliases: ["boat", "sailboat"], icon: Sailboat },
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
    candidate.aliases.some((alias) => normalizeConcept(alias) === normalized)
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

/** Share the catalog's reviewed synonym ontology with blind-label matching. */
export function getCuratedPictogramAliases(concept: string): string[] {
  const normalized = normalizeConcept(concept);
  return (
    CATALOG.find((candidate) =>
      candidate.aliases.some((alias) => normalizeConcept(alias) === normalized)
    )?.aliases ?? []
  );
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
