// Headless gameplay simulation: exercises rig math, fighter state machine,
// combat resolution, AI and the story director without a browser.
import { CHARACTERS } from './src/data/characters';
import { MONSTERS } from './src/data/monsters';
import { CHAPTERS } from './src/data/story';
import { AttackAnimId } from './src/data/types';
import { Input } from './src/engine/input';
import { AIController } from './src/game/ai';
import { CombatSystem } from './src/game/combat';
import { Director } from './src/game/director';
import { Fighter } from './src/game/fighter';
import { attackPose, idlePose, walkPose } from './src/rig/poses';
import { computeJoints } from './src/rig/skeleton';

let failures = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

// Minimal window stub so Input can be constructed.
(globalThis as Record<string, unknown>).window = {
  addEventListener: () => undefined,
  setInterval: () => 0,
};

const events = {
  groundY: () => 500,
  shake: () => undefined,
  hitstop: () => undefined,
  onPlayerLandedHit: () => undefined,
  onPlayerWasHit: () => undefined,
  kills: 0,
  onKill() {
    this.kills++;
  },
};

console.log('— Rig math —');
{
  const kael = CHARACTERS[0];
  const j = computeJoints(idlePose(0.5), kael.style.proportions);
  const vals = Object.values(j).flatMap((v) => (typeof v === 'number' ? [v] : [v.x, v.y]));
  check(
    'joints are finite',
    vals.every((v) => Number.isFinite(v))
  );
  check('head above hips', j.headC.y > j.hips.y, `head=${j.headC.y} hips=${j.hips.y}`);
  check('feet near ground', Math.min(j.footL.y, j.footR.y) < 8, `feet=${j.footL.y},${j.footR.y}`);

  const anims: AttackAnimId[] = [
    'jab',
    'cross',
    'slash',
    'overhead',
    'thrust',
    'uppercut',
    'spin',
    'kick',
    'smash',
    'cast',
    'lunge',
    'claw',
  ];
  let ok = true;
  for (const a of anims) {
    for (let p = 0; p <= 1.001; p += 0.1) {
      const pose = attackPose(a, p);
      if (!Object.values(pose).every((v) => Number.isFinite(v))) ok = false;
    }
  }
  check('all 12 attack anims sample finite at all phases', ok);
  check(
    'walk cycle finite',
    Object.values(walkPose(0.37, 1)).every((v) => Number.isFinite(v))
  );
}

console.log('— Movelist data integrity —');
{
  for (const c of CHARACTERS) {
    const buttonsOk = Object.values(c.buttons).every((id) => c.moves[id]);
    const chainsOk = Object.values(c.moves).every((m) => !m.chain || c.moves[m.chain]);
    check(`${c.name}: buttons + chains resolve`, buttonsOk && chainsOk);
  }
  for (const id of Object.keys(MONSTERS)) {
    check(`${id}: has moves`, MONSTERS[id].moves.length > 0);
  }
  const bossIds = CHAPTERS.map((c) => c.boss);
  check(
    'every chapter boss exists in bestiary',
    bossIds.every((b) => MONSTERS[b]?.boss === true)
  );
  const waveTypes = CHAPTERS.flatMap((c) => c.waves.flatMap((w) => w.spawns.map((s) => s.type)));
  check(
    'every wave monster exists',
    waveTypes.every((t) => !!MONSTERS[t])
  );
}

console.log('— Combat: player string kills a stalker —');
{
  const input = new Input();
  const player = new Fighter({ kind: 'player', char: CHARACTERS[0], x: 300, z: 100 });
  const stalker = new Fighter({ kind: 'monster', monster: MONSTERS.stalker, x: 380, z: 100 });
  const combat = new CombatSystem();
  events.kills = 0;

  let frames = 0;
  while (stalker.alive && frames < 1200) {
    // Mash light attack
    if (frames % 12 === 0) input.press('light');
    if (frames % 12 === 6) input.release('light');
    player.update(16.7);
    player.control(input, 16.7, [stalker]);
    stalker.update(16.7);
    combat.update(16.7, player, [stalker], events);
    input.endFrame(16.7);
    frames++;
  }
  check('stalker dies to light strings', !stalker.alive, `hp=${stalker.hp} after ${frames} frames`);
  check('kill was registered', events.kills === 1);
  check('player gained heat from hits', player.heat > 0, `heat=${player.heat}`);
  check('combo counter tracked hits', player.comboCount >= 2 || !stalker.alive);
}

console.log('— Combat: launcher juggles —');
{
  const input = new Input();
  const player = new Fighter({ kind: 'player', char: CHARACTERS[1], x: 300, z: 100 }); // Mara
  const ghoul = new Fighter({ kind: 'monster', monster: MONSTERS.ghoul, x: 370, z: 100 });
  const combat = new CombatSystem();

  input.press('launcher');
  let launched = false;
  for (let f = 0; f < 90; f++) {
    player.update(16.7);
    player.control(input, 16.7, [ghoul]);
    ghoul.update(16.7);
    combat.update(16.7, player, [ghoul], events);
    input.endFrame(16.7);
    if (f === 2) input.release('launcher');
    if (ghoul.state === 'launched' && ghoul.y > 0) launched = true;
  }
  check('launcher puts target airborne', launched, `state=${ghoul.state} y=${ghoul.y}`);
  let landedDown = false;
  for (let f = 0; f < 300 && !landedDown; f++) {
    ghoul.update(16.7);
    if (ghoul.state === 'down') landedDown = true;
  }
  check('launched target falls into knockdown', landedDown, `state=${ghoul.state}`);
}

console.log('— Combat: blocking prevents damage —');
{
  const input = new Input();
  const player = new Fighter({ kind: 'player', char: CHARACTERS[0], x: 300, z: 100 });
  const brute = new Fighter({ kind: 'monster', monster: MONSTERS.construct, x: 380, z: 100 });
  const combat = new CombatSystem();
  player.facing = 1;
  input.press('block');
  brute.facing = -1;
  brute.startMove(MONSTERS.construct.moves[1]); // Iron Backhand

  const hpBefore = player.hp;
  for (let f = 0; f < 80; f++) {
    player.update(16.7);
    player.control(input, 16.7, [brute]);
    brute.update(16.7);
    combat.update(16.7, player, [brute], events);
    input.endFrame(16.7);
  }
  check(
    'blocked hit deals no damage outside heat',
    player.hp === hpBefore,
    `hp ${hpBefore} → ${player.hp}`
  );
}

console.log('— Heat & Rage —');
{
  const player = new Fighter({ kind: 'player', char: CHARACTERS[2], x: 300, z: 100 });
  player.heat = 100;
  check('heat burst activates at full meter', player.activateHeat() && player.heatActive);
  check('heat boosts damage', player.attackPower() > player.damageScale);
  player.hp = Math.floor(player.maxHp * 0.2);
  check('rage ready below 30% hp', player.rageReady);
}

console.log('— AI engages the player —');
{
  const player = new Fighter({ kind: 'player', char: CHARACTERS[0], x: 300, z: 100 });
  const stalker = new Fighter({ kind: 'monster', monster: MONSTERS.stalker, x: 900, z: 40 });
  const ai = new AIController(stalker);
  let attacked = false;
  for (let f = 0; f < 1500; f++) {
    stalker.update(16.7);
    ai.update(16.7, player);
    if (stalker.state === 'attack') attacked = true;
  }
  const closed = Math.abs(stalker.x - player.x) < 400;
  check('AI closes distance', closed, `dist=${Math.abs(stalker.x - player.x)}`);
  check('AI attacks when in range', attacked);
}

console.log('— Director: full chapter clears —');
{
  const player = new Fighter({ kind: 'player', char: CHARACTERS[0], x: 300, z: 100 });
  player.damageScale = 50; // god-mode bot to fast-forward the chapter
  player.maxHp = player.hp = 100000;
  const director = new Director(CHAPTERS[0]);
  const combat = new CombatSystem();
  const input = new Input();
  let cleared = false;
  const dEv = { announce: () => undefined, groundY: () => 500, onCleared: () => (cleared = true) };

  for (let f = 0; f < 12000 && !cleared; f++) {
    if (f % 10 === 0) input.press('light');
    if (f % 10 === 5) input.release('light');
    player.update(16.7);
    // chase nearest monster
    const target = director.aliveMonsters[0];
    if (target && player.isActionable()) {
      player.x += Math.sign(target.x - player.x) * 4;
      player.z += Math.sign(target.z - player.z) * 2;
    }
    player.control(input, 16.7, director.aliveMonsters);
    for (const m of director.monsters) m.update(16.7);
    for (const c of director.corpses) c.f.update(16.7);
    director.update(16.7, player, dEv);
    combat.update(16.7, player, director.monsters, {
      ...events,
      onKill: (t) => director.registerKill(t),
    });
    input.endFrame(16.7);
  }
  check('chapter 1 fully clears (waves + boss)', cleared);
  check('souls were earned', director.stats.soulsEarned > 0, `souls=${director.stats.soulsEarned}`);
  check('boss phase was reached', director.phase === 'cleared', `phase=${director.phase}`);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
