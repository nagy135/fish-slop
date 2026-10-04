import { test } from "node:test";
import assert from "node:assert/strict";
import { AquariumSimulation, SPECIES } from "./simulation.ts";
import { SubmarinePilot, cameraPose } from "./pilot.ts";

const make = () => new AquariumSimulation(() => 0.5);

test("pilot movement follows the view and strafing keeps the same heading", () => {
  const pilot = new SubmarinePilot({ x: 1, y: 0, z: 0 });
  pilot.turn(Math.PI / 2);
  const heading = pilot.facing;
  const forward = pilot.movement(1, 0, 0),
    right = pilot.movement(0, 1, 0),
    back = pilot.movement(-1, 0, 0);
  assert.ok(Math.abs(forward.x) < 0.00001);
  assert.ok(forward.z > 0.99);
  assert.ok(right.x < -0.99);
  assert.ok(Math.abs(right.z) < 0.00001);
  assert.ok(back.z < -0.99);
  assert.deepEqual(pilot.facing, heading);
});

test("pilot pitch stays bounded and looking down allows forward diving", () => {
  const pilot = new SubmarinePilot({ x: 1, y: 0, z: 0 });
  pilot.turn(0, -100);
  assert.equal(pilot.pitch, -1);
  assert.ok(pilot.movement(1, 0, 0).y < 0);
  assert.ok(Math.abs(Math.hypot(...Object.values(pilot.facing)) - 1) < 0.00001);
  pilot.turn(0, 200);
  assert.equal(pilot.pitch, 1);
});

test("both camera modes stay attached to the sub and look forward through turns", () => {
  const sub = { x: 4, y: 6, z: 1 };
  for (const facing of [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 0, z: -1 },
    { x: -1, y: 0, z: 0 },
  ]) {
    const chase = cameraPose(sub, facing, "chase");
    const cockpit = cameraPose(sub, facing, "cockpit");
    const projection = (p: typeof sub) =>
      (p.x - sub.x) * facing.x + (p.z - sub.z) * facing.z;
    assert.ok(projection(chase.position) < -5);
    assert.ok(chase.position.y > sub.y);
    assert.ok(projection(cockpit.position) > 1.6);
    assert.ok(projection(chase.target) > 8);
    assert.ok(projection(cockpit.target) > 8);
    const shifted = cameraPose(
      { x: sub.x + 3, y: sub.y + 2, z: sub.z - 4 },
      facing,
      "chase",
    );
    assert.ok(Math.abs(shifted.position.x - chase.position.x - 3) < 0.00001);
    assert.ok(Math.abs(shifted.position.y - chase.position.y - 2) < 0.00001);
    assert.ok(Math.abs(shifted.position.z - chase.position.z + 4) < 0.00001);
  }
});
function advance(game: AquariumSimulation, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / 0.02); i++) game.update(0.02);
}

test("food purchases are atomic, cooldown-limited, and recoverable with supply pearls", () => {
  const g = make();
  assert.equal(g.feed(), true);
  assert.equal(g.coins, 174);
  assert.equal(g.food.length, 5);
  assert.equal(g.feed(), false);
  assert.equal(g.coins, 174);
  g.food = [];
  g.coins = 0;
  assert.equal(g.feed(), false);
  advance(g, 12.1);
  assert.equal(g.coins, 12);
  assert.equal(g.feed(), true);
});

test("fish chase and consume pellets once, grow into adults, and earn meal rewards", () => {
  const g = make();
  g.active = true;
  g.nextWave = 1000;
  const fish = g.fish[0];
  g.fish = [fish];
  fish.pos = { x: 0, y: 6, z: 0 };
  const start = g.coins;
  for (let i = 0; i < 4; i++) {
    g.food = [{ id: 100 + i, pos: { ...fish.pos }, age: 0 }];
    g.update(0.02);
  }
  assert.equal(g.stats.meals, 4);
  assert.equal(g.stats.grown, 1);
  assert.ok(fish.growth >= 1);
  assert.equal(g.food.length, 0);
  assert.equal(g.coins, start + 4 * SPECIES.clown.income + 20);
});

test("settled, fed adult pairs breed one baby and cannot immediately breed again", () => {
  const g = make();
  g.active = true;
  g.time = 36;
  g.nextWave = 1000;
  const parents = g.fish.slice(0, 2);
  g.fish = parents;
  parents.forEach((f) => {
    f.growth = 1.1;
    f.meals = 7;
  });
  g.update(0.02);
  assert.equal(g.fish.length, 3);
  assert.equal(g.stats.births, 1);
  assert.equal(g.fish[2].species, "clown");
  assert.equal(g.fish[2].growth, 0.36);
  g.update(0.02);
  assert.equal(g.fish.length, 3);
  assert.ok(parents.every((f) => f.breedAt > g.time));
});

test("breeding requires the same species and respects tank capacity", () => {
  const g = make();
  g.active = true;
  g.time = 36;
  g.nextWave = 1000;
  g.fish = [g.fish[0], g.fish[2]];
  g.fish.forEach((f) => {
    f.growth = 1.1;
    f.meals = 8;
  });
  g.update(0.02);
  assert.equal(g.stats.births, 0);
  while (g.fish.length < g.capacity) g.addFish("clown");
  g.fish.forEach((f) => {
    f.growth = 1.1;
    f.meals = 8;
    f.breedAt = 0;
  });
  g.update(0.02);
  assert.equal(g.stats.births, 0);
  assert.equal(g.buyFish("clown"), false);
});

test("auto-aimed harpoons defeat a predator and pay both kill and wave rewards", () => {
  const g = make();
  g.active = true;
  g.nextWave = 1000;
  g.submarine = { x: 0, y: 6, z: 0 };
  g.enemies = [
    { id: 50, pos: { x: 4, y: 6, z: 0 }, health: 3, biteAt: 1000, phase: 0 },
  ];
  const start = g.coins;
  for (let i = 0; i < 3; i++) {
    assert.equal(g.shoot(), true);
    advance(g, 0.42);
  }
  assert.equal(g.enemies.length, 0);
  assert.equal(g.stats.kills, 1);
  assert.equal(g.coins, start + 60);
});

test("intruders can damage fish and the submarine, ending a lost game", () => {
  const g = make();
  g.active = true;
  g.nextWave = 1000;
  g.fish = [g.fish[0]];
  g.fish[0].pos = { x: 8, y: 5, z: 0 };
  g.fish[0].health = 1;
  g.enemies = [
    { id: 50, pos: { x: 8, y: 5, z: 0 }, health: 3, biteAt: -1, phase: 0 },
  ];
  g.update(0.02);
  assert.equal(g.fish.length, 0);
  assert.equal(g.gameOver, true);
  const sub = make();
  sub.active = true;
  sub.health = 10;
  sub.enemies = [
    { id: 50, pos: { ...sub.submarine }, health: 3, biteAt: -1, phase: 0 },
  ];
  sub.update(0.02);
  assert.equal(sub.health, 0);
  assert.equal(sub.gameOver, true);
});

test("pause stops movement, food purchases, shots, threats, and game time", () => {
  const g = make();
  g.active = true;
  g.paused = true;
  const before = { ...g.submarine };
  g.move({ x: 1, y: 1, z: 1 }, 1);
  advance(g, 60);
  assert.deepEqual(g.submarine, before);
  assert.equal(g.time, 0);
  assert.equal(g.wave, 0);
  assert.equal(g.feed(), false);
  assert.equal(g.shoot(), false);
});

test("shop charges correct prices, refuses unaffordable purchases, and hull upgrades repair", () => {
  const g = make();
  assert.equal(g.buyFish("tang"), true);
  assert.equal(g.coins, 70);
  assert.equal(g.fish.length, 5);
  assert.equal(g.buyFish("butterfly"), false);
  assert.equal(g.coins, 70);
  assert.equal(g.fish.length, 5);
  g.coins = 100;
  g.health = 12;
  assert.equal(g.upgrade("hull"), true);
  assert.equal(g.health, 140);
  assert.equal(g.coins, 0);
});

test("goals reward real feeding progress exactly once", () => {
  const g = make();
  g.active = true;
  g.nextWave = 1000;
  g.fish = [g.fish[0]];
  g.fish[0].growth = 1.2;
  const start = g.coins;
  for (let i = 0; i < 8; i++) {
    g.food = [{ id: 200 + i, pos: { ...g.fish[0].pos }, age: 0 }];
    g.update(0.02);
  }
  assert.equal(g.mission, 1);
  assert.equal(g.coins, start + 8 * SPECIES.clown.income + 40);
  g.update(0.02);
  assert.equal(g.coins, start + 8 * SPECIES.clown.income + 40);
});

test("progress round-trips while malformed saves are safely rejected", () => {
  const g = make();
  g.buyFish("clown");
  g.feed();
  advance(g, 3);
  const loaded = make();
  assert.equal(loaded.restore(JSON.parse(JSON.stringify(g.snapshot()))), true);
  assert.equal(loaded.coins, g.coins);
  assert.equal(loaded.fish.length, g.fish.length);
  assert.equal(loaded.time, g.time);
  assert.equal(loaded.active, false);
  assert.equal(
    make().restore({
      version: 1,
      fish: [{ species: "bad" }],
      coins: 100,
      health: 100,
      time: 0,
      xp: 0,
    }),
    false,
  );
  assert.equal(make().restore({ ...g.snapshot(), coins: NaN }), false);
});

test("the natural feeding loop grows the starter fish, breeds a baby, and funds the shop", () => {
  const g = make();
  g.nextWave = 1000;
  for (let frame = 0; frame < 3000; frame++) {
    if (frame % 100 === 0) g.feed({ x: 0, y: 9, z: 0 });
    g.update(0.02);
  }
  assert.ok(g.stats.grown >= 4);
  assert.ok(g.stats.births >= 1);
  assert.ok(g.fish.length > 4);
  assert.ok(g.coins > 180);
  assert.ok(g.level > 1);
  assert.equal(g.buyFish("puffer"), true);
});
