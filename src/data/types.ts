// ─── Shared type definitions ────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface Palette {
  skin: string;
  primary: string; // torso / armor
  secondary: string; // limbs / pants
  accent: string; // trim, belt, details
  glow: string; // magic / heat accent
  weapon: string;
  weaponEdge: string;
}

export type HeadType = 'helm' | 'hood' | 'hair' | 'horns' | 'skull' | 'crown' | 'beast' | 'wisp';

export type WeaponType =
  | 'sword'
  | 'greatsword'
  | 'daggers'
  | 'hammer'
  | 'scythe'
  | 'spear'
  | 'claws'
  | 'staff'
  | 'none';

export interface Proportions {
  scale: number; // overall size multiplier
  torso: number; // torso length (px at scale 1)
  headR: number; // head radius
  upperArm: number;
  foreArm: number;
  thigh: number;
  shin: number;
  shoulderW: number; // visual shoulder width
  bulk: number; // limb thickness
}

export interface RigStyle {
  palette: Palette;
  head: HeadType;
  weapon: WeaponType;
  proportions: Proportions;
  cape?: boolean;
  robe?: boolean; // robe hides legs (casters)
  float?: boolean; // hovers above the ground
}

// ─── Combat ─────────────────────────────────────────────────────────────────

export type AttackAnimId =
  | 'jab'
  | 'cross'
  | 'slash'
  | 'overhead'
  | 'thrust'
  | 'uppercut'
  | 'spin'
  | 'kick'
  | 'smash'
  | 'cast'
  | 'lunge'
  | 'claw';

export type SfxId =
  | 'light'
  | 'heavy'
  | 'magic'
  | 'block'
  | 'launch'
  | 'ko'
  | 'heat'
  | 'rage'
  | 'select'
  | 'blip'
  | 'soul'
  | 'hurt';

export interface MoveDef {
  id: string;
  name: string;
  anim: AttackAnimId;
  startup: number; // ms before hit window
  active: number; // ms hit window stays live
  recovery: number; // ms after hit window
  damage: number;
  reach: number; // px in front of fighter origin
  knockback: number; // horizontal shove on hit
  hitstun: number; // ms target is staggered
  launch?: number; // upward velocity → juggle starter
  knockdown?: boolean;
  armor?: boolean; // power crush: no hitstun during move
  projectile?: boolean; // fires a bolt on active frames
  lungeSpeed?: number; // forward drift while attacking
  heatGain: number;
  sfx: 'light' | 'heavy' | 'magic';
  chain?: string; // next move id when same button is pressed again
}

export interface FighterStats {
  hp: number;
  walkSpeed: number; // px/s
  dashSpeed: number;
  damageScale: number;
  heatRate: number; // heat meter gain multiplier
}

export interface ButtonMap {
  light: string;
  heavy: string;
  launcher: string;
  special: string;
  rage: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  archetype: string;
  desc: string;
  quote: string;
  style: RigStyle;
  stats: FighterStats;
  moves: Record<string, MoveDef>;
  buttons: ButtonMap;
  teleportDash?: boolean; // Nyx: dash is a short blink
}

export interface MonsterDef {
  id: string;
  name: string;
  style: RigStyle;
  hp: number;
  speed: number;
  damageScale: number;
  souls: number;
  moves: MoveDef[];
  ai: {
    aggression: number; // 0..1 chance to attack when in range
    range: number; // preferred engage distance
    blockChance: number;
    cooldown: number; // ms between decisions
  };
  boss?: boolean;
}

// ─── Story / Stages ─────────────────────────────────────────────────────────

export interface StageTheme {
  id: string;
  name: string;
  skyTop: string;
  skyBottom: string;
  horizon: string; // far silhouette color
  mid: string; // mid silhouette color
  ground: string;
  groundFar: string;
  fog: string;
  ember: string;
  props: 'ruins' | 'crypt' | 'foundry' | 'garden' | 'keep' | 'maw' | 'throne';
}

export interface WaveDef {
  spawns: { type: string; count: number }[];
}

export interface DialogueLine {
  speaker: string;
  text: string;
  tone: 'hero' | 'villain' | 'narrator';
}

export interface ChapterDef {
  id: number;
  title: string;
  subtitle: string;
  theme: StageTheme;
  intro: DialogueLine[];
  outro: DialogueLine[];
  waves: WaveDef[];
  boss: string;
  soulsBonus: number;
}
