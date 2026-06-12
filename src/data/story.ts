// ─── Story mode: seven chapters into the Abyss ──────────────────────────────
//
// "{hero}" in dialogue is replaced with the selected champion's name at
// runtime. Each chapter = themed arena + monster waves + a boss + dialogue.

import { ChapterDef, StageTheme } from './types';

const THEMES: Record<string, StageTheme> = {
  outskirts: {
    id: 'outskirts',
    name: 'Ashfall Outskirts',
    skyTop: '#1a1022',
    skyBottom: '#52283a',
    horizon: '#241526',
    mid: '#36203a',
    ground: '#3c2a2e',
    groundFar: '#251a20',
    fog: '#52283a',
    ember: '#ff9d5c',
    props: 'ruins',
  },
  catacombs: {
    id: 'catacombs',
    name: 'Sunken Catacombs',
    skyTop: '#0a0f14',
    skyBottom: '#1d3328',
    horizon: '#101a16',
    mid: '#1a2c24',
    ground: '#23332b',
    groundFar: '#141f1a',
    fog: '#1d3328',
    ember: '#8aff9d',
    props: 'crypt',
  },
  foundry: {
    id: 'foundry',
    name: 'The Iron Foundry',
    skyTop: '#190f0a',
    skyBottom: '#5e2c12',
    horizon: '#2a1710',
    mid: '#40220f',
    ground: '#3d2a1c',
    groundFar: '#261a12',
    fog: '#5e2c12',
    ember: '#ffb347',
    props: 'foundry',
  },
  gardens: {
    id: 'gardens',
    name: 'The Plague Gardens',
    skyTop: '#0c1408',
    skyBottom: '#3a5220',
    horizon: '#16220e',
    mid: '#243816',
    ground: '#2e401e',
    groundFar: '#1b2613',
    fog: '#3a5220',
    ember: '#c6ff4f',
    props: 'garden',
  },
  keep: {
    id: 'keep',
    name: 'The Black Keep',
    skyTop: '#0b0e1d',
    skyBottom: '#2c3560',
    horizon: '#131830',
    mid: '#1e2546',
    ground: '#272e4a',
    groundFar: '#171c30',
    fog: '#2c3560',
    ember: '#7da2ff',
    props: 'keep',
  },
  maw: {
    id: 'maw',
    name: 'Throat of the Abyss',
    skyTop: '#150820',
    skyBottom: '#4a1457',
    horizon: '#1f0c2c',
    mid: '#321244',
    ground: '#341a42',
    groundFar: '#20102a',
    fog: '#4a1457',
    ember: '#ff6bf0',
    props: 'maw',
  },
  throne: {
    id: 'throne',
    name: 'The Abyssal Throne',
    skyTop: '#0a0512',
    skyBottom: '#3a1158',
    horizon: '#160a24',
    mid: '#26103c',
    ground: '#2a1640',
    groundFar: '#190d28',
    fog: '#3a1158',
    ember: '#b65eff',
    props: 'throne',
  },
};

export const CHAPTERS: ChapterDef[] = [
  {
    id: 1,
    title: 'CHAPTER I',
    subtitle: 'Ashfall Outskirts',
    theme: THEMES.outskirts,
    intro: [
      {
        speaker: 'Narrator',
        tone: 'narrator',
        text: 'The Abyss tore the sky open above the Last Bastion. Whatever crawled out has been eating the world ever since.',
      },
      {
        speaker: '{hero}',
        tone: 'hero',
        text: 'The outskirts are crawling with stalkers. If the Bastion is to survive the night, they die first.',
      },
      {
        speaker: 'Narrator',
        tone: 'narrator',
        text: 'Somewhere beyond the ash, something enormous laughed.',
      },
    ],
    outro: [
      {
        speaker: '{hero}',
        tone: 'hero',
        text: 'The alpha is down. But these were only scavengers... something is herding them.',
      },
      {
        speaker: 'Narrator',
        tone: 'narrator',
        text: 'The trail of ash leads down — into the catacombs of the old city.',
      },
    ],
    waves: [
      { spawns: [{ type: 'stalker', count: 2 }] },
      { spawns: [{ type: 'stalker', count: 3 }] },
    ],
    boss: 'alpha',
    soulsBonus: 60,
  },
  {
    id: 2,
    title: 'CHAPTER II',
    subtitle: 'Sunken Catacombs',
    theme: THEMES.catacombs,
    intro: [
      {
        speaker: 'Narrator',
        tone: 'narrator',
        text: 'Beneath the city, the dead no longer sleep. The catacombs glow with grave-light.',
      },
      {
        speaker: 'The Bonelord',
        tone: 'villain',
        text: 'A living thing... here? Your bones will make a fine throne, little champion.',
      },
      {
        speaker: '{hero}',
        tone: 'hero',
        text: 'Keep talking. I will carve my way through every corpse you throw at me.',
      },
    ],
    outro: [
      {
        speaker: '{hero}',
        tone: 'hero',
        text: 'The Bonelord spoke of a forge that never cools. The monsters are being *made*.',
      },
    ],
    waves: [
      { spawns: [{ type: 'ghoul', count: 3 }] },
      {
        spawns: [
          { type: 'ghoul', count: 2 },
          { type: 'cultist', count: 1 },
        ],
      },
      {
        spawns: [
          { type: 'cultist', count: 2 },
          { type: 'ghoul', count: 1 },
        ],
      },
    ],
    boss: 'bonelord',
    soulsBonus: 90,
  },
  {
    id: 3,
    title: 'CHAPTER III',
    subtitle: 'The Iron Foundry',
    theme: THEMES.foundry,
    intro: [
      {
        speaker: 'Narrator',
        tone: 'narrator',
        text: 'The Foundry burns day and night, hammering abyssal flesh into iron shells.',
      },
      {
        speaker: '{hero}',
        tone: 'hero',
        text: 'So this is where the constructs come from. Time to shut the furnace down — permanently.',
      },
      { speaker: 'Behemoth', tone: 'villain', text: 'INTRUDER. THE FORGE DEMANDS FUEL.' },
    ],
    outro: [
      {
        speaker: '{hero}',
        tone: 'hero',
        text: 'The Behemoth was guarding a gate wreathed in spores. The Gardens... I hate the Gardens.',
      },
    ],
    waves: [
      {
        spawns: [
          { type: 'construct', count: 1 },
          { type: 'stalker', count: 2 },
        ],
      },
      { spawns: [{ type: 'construct', count: 2 }] },
      {
        spawns: [
          { type: 'construct', count: 2 },
          { type: 'stalker', count: 2 },
        ],
      },
    ],
    boss: 'behemoth',
    soulsBonus: 130,
  },
  {
    id: 4,
    title: 'CHAPTER IV',
    subtitle: 'The Plague Gardens',
    theme: THEMES.gardens,
    intro: [
      {
        speaker: 'Narrator',
        tone: 'narrator',
        text: 'Once the royal gardens. Now a green hell where the air itself is hungry.',
      },
      {
        speaker: 'Plague Weaver',
        tone: 'villain',
        text: 'Breathe deep, champion. My children already bloom in your lungs.',
      },
      { speaker: '{hero}', tone: 'hero', text: 'Then I will finish this before my next breath.' },
    ],
    outro: [
      {
        speaker: '{hero}',
        tone: 'hero',
        text: 'With the Weaver gone the spores are dying. The path to the Black Keep stands open.',
      },
    ],
    waves: [
      {
        spawns: [
          { type: 'cultist', count: 2 },
          { type: 'ghoul', count: 2 },
        ],
      },
      { spawns: [{ type: 'cultist', count: 3 }] },
      {
        spawns: [
          { type: 'ghoul', count: 3 },
          { type: 'cultist', count: 1 },
        ],
      },
    ],
    boss: 'weaver',
    soulsBonus: 170,
  },
  {
    id: 5,
    title: 'CHAPTER V',
    subtitle: 'The Black Keep',
    theme: THEMES.keep,
    intro: [
      {
        speaker: 'Narrator',
        tone: 'narrator',
        text: 'The Keep was built to hold the line against the Abyss. Its garrison still stands watch — on the wrong side.',
      },
      {
        speaker: 'Corrupted Warden',
        tone: 'villain',
        text: 'I guarded this gate for forty years. The Abyss only asked me to keep guarding it.',
      },
      {
        speaker: '{hero}',
        tone: 'hero',
        text: 'Then I am sorry, Warden. You will be buried with honors.',
      },
    ],
    outro: [
      { speaker: 'Corrupted Warden', tone: 'villain', text: 'Thank... you...' },
      {
        speaker: 'Narrator',
        tone: 'narrator',
        text: 'Beyond the Keep, the ground itself descends into a screaming dark: the Throat of the Abyss.',
      },
    ],
    waves: [
      { spawns: [{ type: 'revenant', count: 2 }] },
      {
        spawns: [
          { type: 'revenant', count: 2 },
          { type: 'construct', count: 1 },
        ],
      },
      {
        spawns: [
          { type: 'revenant', count: 3 },
          { type: 'cultist', count: 1 },
        ],
      },
    ],
    boss: 'warden',
    soulsBonus: 220,
  },
  {
    id: 6,
    title: 'CHAPTER VI',
    subtitle: 'Throat of the Abyss',
    theme: THEMES.maw,
    intro: [
      {
        speaker: 'Narrator',
        tone: 'narrator',
        text: 'No map marks this place. The walls breathe. The dark has a heartbeat.',
      },
      {
        speaker: 'Herald of the Maw',
        tone: 'villain',
        text: 'The Sovereign has watched your little crusade with great amusement, champion.',
      },
      {
        speaker: '{hero}',
        tone: 'hero',
        text: 'Good. Then it has seen exactly what is coming for it.',
      },
    ],
    outro: [
      {
        speaker: 'Narrator',
        tone: 'narrator',
        text: 'The Herald dissolved into screaming smoke. Ahead, a throne of void and bone awaits its visitor.',
      },
    ],
    waves: [
      {
        spawns: [
          { type: 'stalker', count: 2 },
          { type: 'revenant', count: 1 },
          { type: 'cultist', count: 1 },
        ],
      },
      {
        spawns: [
          { type: 'construct', count: 1 },
          { type: 'ghoul', count: 2 },
          { type: 'cultist', count: 1 },
        ],
      },
      {
        spawns: [
          { type: 'revenant', count: 2 },
          { type: 'construct', count: 1 },
          { type: 'stalker', count: 1 },
        ],
      },
    ],
    boss: 'herald',
    soulsBonus: 300,
  },
  {
    id: 7,
    title: 'FINAL CHAPTER',
    subtitle: 'The Abyssal Throne',
    theme: THEMES.throne,
    intro: [
      {
        speaker: 'The Sovereign',
        tone: 'villain',
        text: 'You climbed down through my whole kingdom just to die at my feet. I am almost flattered.',
      },
      {
        speaker: '{hero}',
        tone: 'hero',
        text: 'I did not come to kneel, Sovereign. I came to bring the sky back.',
      },
      {
        speaker: 'The Sovereign',
        tone: 'villain',
        text: 'THEN COME, CHAMPION OF NOTHING. THE ABYSS IS ETERNAL.',
      },
    ],
    outro: [
      {
        speaker: 'Narrator',
        tone: 'narrator',
        text: 'The Sovereign fell, and the dark fell with it. Far above, for the first time in a generation — dawn.',
      },
      {
        speaker: '{hero}',
        tone: 'hero',
        text: 'It is done. Let the world remember what one blade refused to surrender.',
      },
    ],
    waves: [
      {
        spawns: [
          { type: 'revenant', count: 2 },
          { type: 'cultist', count: 2 },
        ],
      },
      {
        spawns: [
          { type: 'construct', count: 2 },
          { type: 'revenant', count: 1 },
        ],
      },
    ],
    boss: 'sovereign',
    soulsBonus: 500,
  },
];
