import {
  Anchor,
  Apple,
  Baby,
  Banana,
  BatteryFull,
  Bed,
  Bell,
  Bike,
  Bird,
  Bomb,
  Bone,
  BookOpen,
  BoomBox,
  Box,
  Brain,
  Briefcase,
  Bug,
  Bus,
  CakeSlice,
  Camera,
  Candy,
  Car,
  Castle,
  Cat,
  CircleDollarSign,
  Clock,
  Cloud,
  CloudRain,
  Coffee,
  Compass,
  Cookie,
  CookingPot,
  Crown,
  CupSoda,
  Dog,
  DoorOpen,
  Droplets,
  Drum,
  Ear,
  Egg,
  Eye,
  Feather,
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
  Hammer,
  Hand,
  HardHat,
  Headphones,
  Heart,
  Hourglass,
  House,
  IceCreamBowl,
  Key,
  Lamp,
  Leaf,
  Lightbulb,
  Lock,
  Mail,
  Map as MapIcon,
  Medal,
  Megaphone,
  Milk,
  Moon,
  Mountain,
  Mouse,
  Music2,
  Newspaper,
  Palette,
  PawPrint,
  Pencil,
  PiggyBank,
  Pizza,
  Plane,
  Puzzle,
  Rabbit,
  Rainbow,
  Rat,
  Ribbon,
  Rocket,
  Sailboat,
  Scissors,
  Settings,
  Shell,
  Shield,
  ShipWheel,
  Shirt,
  ShoppingBag,
  Skull,
  Smartphone,
  Snowflake,
  Sprout,
  Star,
  Sun,
  Sword,
  Tent,
  Ticket,
  TrafficCone,
  TrainFront,
  Trash2,
  TreeDeciduous,
  Trophy,
  Truck,
  Tv,
  Umbrella,
  Watch,
  Waves,
  Wheat,
  Wine,
  Wrench,
  Zap,
} from "lucide";
import { sanitizePictogramSvg } from "./sanitize-svg";
import { INK_PICTOGRAM_PALETTE } from "./style";

export const CURATED_PICTOGRAM_CATALOG_VERSION = "lucide-v1";

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
  { id: "anchor", aliases: ["anchor"], icon: Anchor },
  { id: "apple", aliases: ["apple", "fruit"], icon: Apple },
  { id: "baby", aliases: ["baby", "infant"], icon: Baby },
  { id: "banana", aliases: ["banana"], icon: Banana },
  { id: "battery", aliases: ["battery"], icon: BatteryFull },
  { id: "bed", aliases: ["bed"], icon: Bed },
  { id: "bell", aliases: ["bell"], icon: Bell },
  { id: "bicycle", aliases: ["bicycle", "bike"], icon: Bike },
  { id: "bird", aliases: ["bird"], icon: Bird },
  { id: "bomb", aliases: ["bomb"], icon: Bomb },
  { id: "bone", aliases: ["bone"], icon: Bone },
  { id: "book", aliases: ["book", "open book"], icon: BookOpen },
  { id: "box", aliases: ["box", "package"], icon: Box },
  { id: "brain", aliases: ["brain"], icon: Brain },
  { id: "briefcase", aliases: ["briefcase"], icon: Briefcase },
  { id: "bug", aliases: ["bug", "insect"], icon: Bug },
  { id: "bus", aliases: ["bus"], icon: Bus },
  { id: "cake", aliases: ["cake", "cake slice"], icon: CakeSlice },
  { id: "camera", aliases: ["camera"], icon: Camera },
  { id: "candy", aliases: ["candy", "sweet"], icon: Candy },
  { id: "car", aliases: ["car", "automobile", "auto", "sedan"], icon: Car },
  { id: "castle", aliases: ["castle"], icon: Castle },
  { id: "cat", aliases: ["cat", "kitten"], icon: Cat },
  { id: "clock", aliases: ["clock", "timepiece"], icon: Clock },
  { id: "cloud", aliases: ["cloud"], icon: Cloud },
  { id: "coffee", aliases: ["coffee", "coffee cup"], icon: Coffee },
  { id: "compass", aliases: ["compass"], icon: Compass },
  { id: "cookie", aliases: ["cookie", "biscuit"], icon: Cookie },
  { id: "cooking-pot", aliases: ["cooking pot", "pot"], icon: CookingPot },
  { id: "crown", aliases: ["crown"], icon: Crown },
  { id: "diamond", aliases: ["diamond", "gem", "gemstone"], icon: Gem },
  { id: "dog", aliases: ["dog", "puppy"], icon: Dog },
  { id: "door", aliases: ["door", "open door"], icon: DoorOpen },
  { id: "drum", aliases: ["drum"], icon: Drum },
  { id: "ear", aliases: ["ear"], icon: Ear },
  { id: "egg", aliases: ["egg"], icon: Egg },
  { id: "envelope", aliases: ["envelope", "mail", "letter"], icon: Mail },
  { id: "eye", aliases: ["eye", "eyeball"], icon: Eye },
  { id: "feather", aliases: ["feather"], icon: Feather },
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
  { id: "hand", aliases: ["hand", "palm"], icon: Hand },
  { id: "hammer", aliases: ["hammer"], icon: Hammer },
  { id: "hard-hat", aliases: ["hard hat", "construction helmet"], icon: HardHat },
  { id: "headphones", aliases: ["headphones", "headset"], icon: Headphones },
  { id: "heart", aliases: ["heart"], icon: Heart },
  { id: "hourglass", aliases: ["hourglass", "sandglass"], icon: Hourglass },
  { id: "house", aliases: ["house", "home"], icon: House },
  { id: "ice-cream", aliases: ["ice cream", "ice cream bowl"], icon: IceCreamBowl },
  { id: "key", aliases: ["key"], icon: Key },
  { id: "lamp", aliases: ["lamp"], icon: Lamp },
  { id: "leaf", aliases: ["leaf"], icon: Leaf },
  { id: "lightbulb", aliases: ["lightbulb", "light bulb", "bulb"], icon: Lightbulb },
  { id: "lock", aliases: ["lock", "padlock"], icon: Lock },
  { id: "map", aliases: ["map"], icon: MapIcon },
  { id: "medal", aliases: ["medal"], icon: Medal },
  { id: "megaphone", aliases: ["megaphone", "loudspeaker"], icon: Megaphone },
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
  { id: "paint-palette", aliases: ["paint palette", "palette"], icon: Palette },
  { id: "paw-print", aliases: ["paw print", "paw"], icon: PawPrint },
  { id: "pencil", aliases: ["pencil"], icon: Pencil },
  { id: "phone", aliases: ["phone", "smartphone", "mobile phone"], icon: Smartphone },
  { id: "piggy-bank", aliases: ["piggy bank"], icon: PiggyBank },
  { id: "pizza", aliases: ["pizza", "pizza slice"], icon: Pizza },
  { id: "plane", aliases: ["plane", "airplane", "jet"], icon: Plane },
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
  { id: "scissors", aliases: ["scissors"], icon: Scissors },
  { id: "shell", aliases: ["shell", "seashell"], icon: Shell },
  { id: "shield", aliases: ["shield"], icon: Shield },
  { id: "shirt", aliases: ["shirt", "t-shirt"], icon: Shirt },
  { id: "shopping-bag", aliases: ["shopping bag", "bag"], icon: ShoppingBag },
  { id: "ship-wheel", aliases: ["ship wheel", "steering wheel"], icon: ShipWheel },
  { id: "skull", aliases: ["skull"], icon: Skull },
  { id: "snowflake", aliases: ["snowflake", "snow"], icon: Snowflake },
  { id: "soda", aliases: ["soda", "soft drink", "drink cup"], icon: CupSoda },
  { id: "sprout", aliases: ["sprout", "seedling"], icon: Sprout },
  { id: "star", aliases: ["star"], icon: Star },
  { id: "sun", aliases: ["sun", "sunshine"], icon: Sun },
  { id: "sword", aliases: ["sword"], icon: Sword },
  { id: "tent", aliases: ["tent"], icon: Tent },
  { id: "ticket", aliases: ["ticket"], icon: Ticket },
  { id: "traffic-cone", aliases: ["traffic cone", "cone"], icon: TrafficCone },
  { id: "train", aliases: ["train", "locomotive"], icon: TrainFront },
  { id: "tree", aliases: ["tree"], icon: TreeDeciduous },
  { id: "trash", aliases: ["trash", "garbage", "trash can"], icon: Trash2 },
  { id: "truck", aliases: ["truck"], icon: Truck },
  { id: "trophy", aliases: ["trophy"], icon: Trophy },
  { id: "television", aliases: ["television", "tv"], icon: Tv },
  { id: "umbrella", aliases: ["umbrella"], icon: Umbrella },
  { id: "water", aliases: ["water", "droplets", "drops"], icon: Droplets },
  { id: "watch", aliases: ["watch", "wristwatch"], icon: Watch },
  { id: "waves", aliases: ["waves", "wave", "ocean"], icon: Waves },
  { id: "wheat", aliases: ["wheat", "grain"], icon: Wheat },
  { id: "wine-glass", aliases: ["wine glass", "wine"], icon: Wine },
  { id: "wrench", aliases: ["wrench", "spanner"], icon: Wrench },
  { id: "lightning", aliases: ["lightning", "lightning bolt"], icon: Zap },
  { id: "boat", aliases: ["boat", "sailboat"], icon: Sailboat },
];

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
export function resolveCuratedPictogram(concept: string): CuratedPictogram | null {
  const normalized = normalizeConcept(concept);
  const entry = CATALOG.find((candidate) =>
    candidate.aliases.some((alias) => normalizeConcept(alias) === normalized)
  );
  if (!entry) return null;

  const raw = serializeIconNode(entry.icon, {
    width: 64,
    height: 64,
    stroke: INK_PICTOGRAM_PALETTE.ink,
    fill: "none",
    "stroke-width": 0.84375,
    "aria-hidden": "true",
  });
  const svg = sanitizePictogramSvg(raw);
  if (!svg) return null;

  return {
    assetId: `lucide:${entry.id}:v1`,
    canonicalConcept: entry.id,
    svg,
  };
}

export function listCuratedPictogramIds(): string[] {
  return CATALOG.map((entry) => entry.id);
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
