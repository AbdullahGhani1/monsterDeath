# MONSTER DEATH — Abyss Reborn ⚔️

A story-driven **2.5D arena fighter / brawler** for the web. Choose one of five
champions and carve your way down through seven chapters of the Abyss — waves
of monsters, a boss at the bottom of every chapter, and the Abyssal Sovereign
waiting on its throne.

Every asset — characters, monsters, animation, stages, sound — is **generated
procedurally in code**. No images, no audio files, no downloads. The game is
always playable from a clean clone.

🔗 **Live Demo:** [https://monster-death.surge.sh/](https://monster-death.surge.sh/)

---

## 🥋 Combat — Tekken 8 inspired

- **Chained strings** — light attacks chain into 3–4 hit strings; buffered
  inputs mean mashing during a swing still combos (input buffer + cancels).
- **Launchers & air juggles** — pop enemies into the air and keep the combo
  going with juggle damage scaling, exactly like the big fighting games.
- **Heat System** — land hits to build the Heat meter; burst (`Q`) for 8
  seconds of bonus damage and chip damage through blocks.
- **Rage Arts** — below 30% HP, every champion has a once-per-fight cinematic
  super (`E`) with armor and slow-motion impact.
- **Power Crush** — Brom's heavy attacks armor straight through enemy hits.
- **Wall splats** — heavy knockback into the arena walls staggers enemies for
  a free follow-up.
- **Movement** — 8-way arena movement, double-tap dashes, backdashes,
  blocking, counter-hits, hitstop and screen shake for impact feel.

### Controls

| Input                | Action                      |
| -------------------- | --------------------------- |
| `WASD` / Arrows      | Move (up/down changes lane) |
| `J` / `Z`            | Light attack (chains)       |
| `K` / `X`            | Heavy attack                |
| `L` / `C`            | Launcher (starts juggles)   |
| `U` / `V`            | Special move                |
| `Shift`              | Block                       |
| `Space` / double-tap | Dash (Nyx teleports)        |
| `Q`                  | Heat Burst                  |
| `E`                  | Rage Art                    |
| `P` / `Esc`          | Pause                       |

Full touch controls appear automatically on mobile.

## 🦴 Procedural rigging

Every fighter is a **13-joint skeletal rig** animated with forward kinematics:

- Poses are joint-angle keyframes; locomotion (walk/run/dash) is generated
  parametrically so it adapts to any movement speed.
- 12 attack animation tracks (slash, overhead, uppercut, smash, cast, lunge…)
  are shared across the cast and styled per character.
- Renderer draws tapered limb capsules, shaped torsos, 8 head types, 9 weapon
  types, capes, robes, auras and weapon trails — all Canvas2D, zero sprites.

## 🧝 The five champions

| Champion                     | Archetype | Signature                     |
| ---------------------------- | --------- | ----------------------------- |
| **KAEL** — The Last Vanguard | Balanced  | Abyss Rend (sword wave)       |
| **MARA** — Ash Maiden        | Rushdown  | 4-hit strings, Cinder Flurry  |
| **BROM** — Ironhide          | Power     | Power-crush armor, Quake Slam |
| **NYX** — Shade Dancer       | Trickster | Teleport dash, Reaper's Waltz |
| **SERAPHINE** — Stormcaller  | Keepout   | Longest reach, Tempest Bolt   |

## 📖 Story mode

Seven chapters, each with its own procedurally rendered biome, monster roster,
dialogue and boss: Ashfall Outskirts → Sunken Catacombs → Iron Foundry →
Plague Gardens → Black Keep → Throat of the Abyss → **The Abyssal Throne**.

Built to be addictive:

- **Souls** drop from every kill — spend them in the Sanctum on permanent
  upgrades (Vitality / Ferocity / Conduit). Death keeps your souls.
- **S/A/B/C chapter grades** from damage taken, max combo and clear time —
  with best grades saved per chapter for replays.
- **Chapter select** unlocks as you progress; progress, upgrades and grades
  persist in localStorage.
- Bosses enrage at half health. The Sovereign would like a word.

## 🛠 Tech

- **TypeScript (strict)** + **Vite**, zero runtime dependencies
- Custom Canvas2D engine: skeletal animation, parallax stages, pooled
  particles, dynamic camera with hitstop/slow-mo timescales
- **Procedural WebAudio**: every SFX synthesized, generative ambient score
- ESLint (flat config, zero `any`) + Prettier, CI deploy to Surge

```text
src/
├── rig/        # Skeleton, FK solver, pose/keyframe library, rig renderer
├── engine/     # Input (buffered, double-tap), camera, particles, audio synth
├── data/       # Characters, monsters, chapters, stage themes
├── game/       # Fighter state machine, combat, AI, director, stages, saves
├── ui/         # HUD + menu screens
└── main.ts     # Game flow + main loop
```

## 🚀 Development

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build
npm run lint     # strict lint
npm test         # headless gameplay simulation (rig, combat, AI, director)
```

## 📜 License

ISC License. Built with 🩸 and ⚙️ by Abdullah Ghani.
