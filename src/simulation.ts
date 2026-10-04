export type Species = "clown" | "tang" | "butterfly" | "puffer";
export type Vec = { x: number; y: number; z: number };
export type Fish = {
  id: number;
  species: Species;
  pos: Vec;
  dir: Vec;
  wander: Vec;
  growth: number;
  meals: number;
  health: number;
  breedAt: number;
  phase: number;
};
export type Food = { id: number; pos: Vec; age: number };
export type Enemy = {
  id: number;
  pos: Vec;
  health: number;
  biteAt: number;
  phase: number;
};
export type Bullet = { id: number; pos: Vec; velocity: Vec; age: number };
export type GameEvent = {
  type:
    | "meal"
    | "birth"
    | "growth"
    | "coin"
    | "hit"
    | "kill"
    | "wave"
    | "loss"
    | "purchase"
    | "mission"
    | "level";
  pos?: Vec;
  text: string;
  amount?: number;
};
export const SPECIES: Record<
  Species,
  {
    name: string;
    label: string;
    price: number;
    income: number;
    color: string;
    description: string;
  }
> = {
  clown: {
    name: "Clownfish",
    label: "THE FRIENDLY ONE",
    price: 60,
    income: 3,
    color: "#f9a267",
    description: "A little sunshine. Grows quickly and loves company.",
  },
  tang: {
    name: "Blue tang",
    label: "THE CURIOUS ONE",
    price: 110,
    income: 5,
    color: "#79bdf0",
    description: "A bright blue explorer with a golden tail.",
  },
  butterfly: {
    name: "Butterflyfish",
    label: "THE FANCY ONE",
    price: 160,
    income: 7,
    color: "#efd389",
    description: "Elegant fins and a generous pearl bonus.",
  },
  puffer: {
    name: "Pufferfish",
    label: "THE ROUND ONE",
    price: 220,
    income: 9,
    color: "#ced995",
    description: "Small, spiky, and surprisingly good company.",
  },
};
export const MISSIONS = [
  {
    name: "Dinner is served",
    description: "Feed your fish 8 meals",
    target: 8,
    reward: 40,
    stat: "meals",
  },
  {
    name: "Room to grow",
    description: "Raise 3 fish to adulthood",
    target: 3,
    reward: 80,
    stat: "grown",
  },
  {
    name: "Reef guardian",
    description: "Defeat 2 reef intruders",
    target: 2,
    reward: 120,
    stat: "kills",
  },
  {
    name: "A growing family",
    description: "Welcome 2 baby fish",
    target: 2,
    reward: 180,
    stat: "births",
  },
  {
    name: "A thriving little world",
    description: "Collect 12 fish in your tank",
    target: 12,
    reward: 200,
    stat: "population",
  },
] as const;
export const distance = (a: Vec, b: Vec) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const copy = (v: Vec) => ({ ...v });
export function direction(a: Vec, b: Vec): Vec {
  const len = distance(a, b) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len, z: (b.z - a.z) / len };
}

export class AquariumSimulation {
  coins = 180;
  xp = 0;
  time = 0;
  active = false;
  paused = false;
  gameOver = false;
  health = 100;
  fish: Fish[] = [];
  food: Food[] = [];
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  events: GameEvent[] = [];
  submarine: Vec = { x: -5.3, y: 6.3, z: 2 };
  heading: Vec = { x: 1, y: 0, z: 0 };
  wave = 0;
  nextWave = 55;
  lastShot = -10;
  lastFeed = -10;
  mission = 0;
  stats = { meals: 0, grown: 0, kills: 0, births: 0 };
  upgrades = { cannon: 0, hull: 0, feeder: 0 };
  private nextId = 1;
  private incomeAt = 12;
  random: () => number;
  constructor(random: () => number = Math.random) {
    this.random = random;
    this.addFish("clown", { x: -2, y: 5.6, z: 2 });
    this.addFish("clown", { x: 2, y: 7.4, z: 0 });
    this.addFish("tang", { x: 6.5, y: 8, z: -2 });
    this.addFish("butterfly", { x: 7, y: 3.8, z: 3 });
  }
  get level() {
    return 1 + Math.floor(this.xp / 160);
  }
  get capacity() {
    return Math.min(28, 12 + this.level * 2);
  }
  get maxHealth() {
    return 100 + this.upgrades.hull * 40;
  }
  get happiness() {
    return Math.round(
      (this.fish.reduce(
        (sum, f) => sum + Math.min(1, 0.65 + f.meals * 0.045),
        0,
      ) /
        Math.max(1, this.fish.length)) *
        100,
    );
  }
  get missionProgress() {
    const m = MISSIONS[this.mission];
    return m
      ? Math.min(
          m.target,
          m.stat === "population" ? this.fish.length : this.stats[m.stat],
        )
      : 1;
  }
  private emit(
    type: GameEvent["type"],
    text: string,
    pos?: Vec,
    amount?: number,
  ) {
    this.events.push({ type, text, pos: pos && copy(pos), amount });
  }
  private awardXp(amount: number) {
    const before = this.level;
    this.xp += amount;
    if (this.level > before) {
      this.coins += 45;
      this.emit("level", `Keeper level ${this.level}! +45 pearls`);
    }
  }
  addFish(species: Species, pos?: Vec, baby = false) {
    const fish: Fish = {
      id: this.nextId++,
      species,
      pos: pos || {
        x: (this.random() - 0.5) * 18,
        y: 4 + this.random() * 5,
        z: (this.random() - 0.5) * 7,
      },
      dir: { x: 1, y: 0, z: 0 },
      wander: this.wanderPoint(),
      growth: baby ? 0.36 : 0.66,
      meals: 0,
      health: 3,
      breedAt: this.time + 35,
      phase: this.random() * 6.28,
    };
    this.fish.push(fish);
    return fish;
  }
  private wanderPoint(): Vec {
    return {
      x: (this.random() - 0.5) * 23,
      y: 2.5 + this.random() * 8.5,
      z: (this.random() - 0.5) * 9,
    };
  }
  buyFish(species: Species): boolean {
    if (
      this.gameOver ||
      this.coins < SPECIES[species].price ||
      this.fish.length >= this.capacity
    )
      return false;
    this.coins -= SPECIES[species].price;
    this.addFish(species);
    this.awardXp(15);
    this.emit("purchase", `A ${SPECIES[species].name.toLowerCase()} moved in!`);
    this.checkMission();
    return true;
  }
  upgrade(type: keyof typeof this.upgrades): boolean {
    const price = this.upgradePrice(type);
    if (this.gameOver || this.coins < price || this.upgrades[type] >= 3)
      return false;
    this.coins -= price;
    this.upgrades[type]++;
    if (type === "hull") this.health = this.maxHealth;
    this.emit(
      "purchase",
      `${{ cannon: "Harpoon", hull: "Hull", feeder: "Feeder" }[type]} upgraded!`,
    );
    return true;
  }
  upgradePrice(type: keyof typeof this.upgrades) {
    return (
      { cannon: 140, hull: 100, feeder: 90 }[type] * (this.upgrades[type] + 1)
    );
  }
  feed(at: Vec = { ...this.submarine, y: 11 }): boolean {
    if (
      this.paused ||
      this.gameOver ||
      this.coins < 6 ||
      this.time - this.lastFeed < 1.3 ||
      this.food.length > 35
    )
      return false;
    this.active = true;
    this.coins -= 6;
    this.lastFeed = this.time;
    for (let i = 0; i < 5 + this.upgrades.feeder * 2; i++) {
      this.food.push({
        id: this.nextId++,
        pos: {
          x: clamp(at.x + (this.random() - 0.5) * 2.8, -12, 12),
          y: clamp(at.y + this.random() * 0.6, 2, 12),
          z: clamp(at.z + (this.random() - 0.5) * 2, -5, 5),
        },
        age: 0,
      });
    }
    return true;
  }
  shoot(at?: Vec): boolean {
    if (this.paused || this.gameOver || this.time - this.lastShot < 0.35)
      return false;
    this.active = true;
    this.lastShot = this.time;
    const nearest = [...this.enemies].sort(
      (a, b) =>
        distance(a.pos, this.submarine) - distance(b.pos, this.submarine),
    )[0];
    const dir = at
      ? direction(this.submarine, at)
      : nearest
        ? direction(this.submarine, nearest.pos)
        : this.heading;
    this.heading = copy(dir);
    this.bullets.push({
      id: this.nextId++,
      pos: {
        x: this.submarine.x + dir.x * 1.5,
        y: this.submarine.y + dir.y * 1.5,
        z: this.submarine.z + dir.z * 1.5,
      },
      velocity: { x: dir.x * 22, y: dir.y * 22, z: dir.z * 22 },
      age: 0,
    });
    return true;
  }
  move(vec: Vec, dt: number, boost = false) {
    if (this.paused || this.gameOver) return;
    if (Math.hypot(vec.x, vec.y, vec.z) > 0) {
      this.active = true;
      const dir = direction({ x: 0, y: 0, z: 0 }, vec);
      const speed = boost ? 9 : 5.5;
      this.submarine.x = clamp(this.submarine.x + dir.x * dt * speed, -12, 12);
      this.submarine.y = clamp(this.submarine.y + dir.y * dt * speed, 2, 11.5);
      this.submarine.z = clamp(this.submarine.z + dir.z * dt * speed, -5, 5);
      this.heading = dir;
    }
  }
  summonWave() {
    if (this.enemies.length || this.gameOver) return false;
    this.active = true;
    this.wave++;
    this.nextWave = this.time + 55;
    for (let i = 0; i < Math.min(4, 1 + Math.floor((this.wave - 1) / 2)); i++) {
      this.enemies.push({
        id: this.nextId++,
        pos: { x: 13, y: 5 + this.random() * 5, z: -3 + this.random() * 6 },
        health: 3 + Math.floor(this.wave / 4),
        biteAt: this.time + 2,
        phase: this.random() * 6.28,
      });
    }
    this.emit(
      "wave",
      `Intruder alert! Protect your fish.`,
      this.enemies[0].pos,
    );
    return true;
  }
  update(dt: number) {
    if (!this.active || this.paused || this.gameOver) return;
    dt = Math.min(dt, 0.06);
    this.time += dt;
    for (const pellet of this.food) {
      pellet.age += dt;
      pellet.pos.y -= 0.33 * dt;
    }
    this.food = this.food.filter((f) => f.age < 30 && f.pos.y > 1.2);
    for (const f of [...this.fish]) {
      let target = f.wander;
      const threat = this.enemies.find((e) => distance(e.pos, f.pos) < 4);
      const meal = [...this.food].sort(
        (a, b) => distance(a.pos, f.pos) - distance(b.pos, f.pos),
      )[0];
      if (threat) {
        const flee = direction(threat.pos, f.pos);
        target = {
          x: clamp(f.pos.x + flee.x * 4, -12, 12),
          y: clamp(f.pos.y + flee.y * 3, 2, 11),
          z: clamp(f.pos.z + flee.z * 3, -5, 5),
        };
      } else if (meal) target = meal.pos;
      else if (distance(f.pos, target) < 0.6 || this.random() < dt * 0.05)
        f.wander = this.wanderPoint();
      const dir = direction(f.pos, target);
      f.dir.x += (dir.x - f.dir.x) * Math.min(1, dt * 3);
      f.dir.y += (dir.y - f.dir.y) * Math.min(1, dt * 3);
      f.dir.z += (dir.z - f.dir.z) * Math.min(1, dt * 3);
      const speed = threat ? 3.4 : meal ? 2.8 : 1.1 + f.growth * 0.35;
      f.pos.x += f.dir.x * dt * speed;
      f.pos.y += f.dir.y * dt * speed;
      f.pos.z += f.dir.z * dt * speed;
      if (!threat && meal && distance(f.pos, meal.pos) < 0.75) {
        this.food = this.food.filter((p) => p.id !== meal.id);
        f.meals++;
        this.stats.meals++;
        f.health = Math.min(3, f.health + 1);
        const oldGrowth = f.growth;
        f.growth = Math.min(1.2, f.growth + 0.095);
        const reward = SPECIES[f.species].income;
        this.coins += reward;
        this.awardXp(7);
        this.emit("meal", `+${reward}`, f.pos, reward);
        if (oldGrowth < 1 && f.growth >= 1) {
          this.stats.grown++;
          this.coins += 20;
          this.emit("growth", `All grown up! +20 pearls`, f.pos);
        }
      }
      if (
        f.growth >= 1 &&
        f.meals >= 7 &&
        this.time > f.breedAt &&
        this.fish.length < this.capacity
      ) {
        const mate = this.fish.find(
          (m) =>
            m.id !== f.id &&
            m.species === f.species &&
            m.growth >= 1 &&
            m.meals >= 5 &&
            this.time > m.breedAt,
        );
        if (mate) {
          f.breedAt = mate.breedAt = this.time + 60;
          f.meals = 0;
          mate.meals = 0;
          const baby = this.addFish(
            f.species,
            { x: f.pos.x + 0.5, y: f.pos.y, z: f.pos.z },
            true,
          );
          this.stats.births++;
          this.coins += 35;
          this.awardXp(35);
          this.emit(
            "birth",
            `A baby ${SPECIES[f.species].name.toLowerCase()}! +35 pearls`,
            baby.pos,
          );
        }
      }
    }
    for (const b of this.bullets) {
      const before = copy(b.pos);
      b.age += dt;
      b.pos.x += b.velocity.x * dt;
      b.pos.y += b.velocity.y * dt;
      b.pos.z += b.velocity.z * dt;
      // Test the whole travel segment so fast harpoons cannot pass through an intruder.
      const travel = distance(before, b.pos);
      const e = this.enemies.find((e) => {
        const dir = direction(before, b.pos);
        const projected = clamp(
          (e.pos.x - before.x) * dir.x +
            (e.pos.y - before.y) * dir.y +
            (e.pos.z - before.z) * dir.z,
          0,
          travel,
        );
        return (
          distance(e.pos, {
            x: before.x + dir.x * projected,
            y: before.y + dir.y * projected,
            z: before.z + dir.z * projected,
          }) < 1.2
        );
      });
      if (e) {
        e.health -= 1 + this.upgrades.cannon;
        b.age = 10;
        this.emit("hit", "Hit!", e.pos);
        if (e.health <= 0) {
          this.enemies = this.enemies.filter((x) => x.id !== e.id);
          this.stats.kills++;
          this.coins += 45;
          this.awardXp(30);
          this.emit("kill", "+45 pearls · reef protected", e.pos, 45);
          if (!this.enemies.length) {
            this.nextWave = this.time + 55;
            this.coins += 15;
            this.emit("coin", "Clear waters. Wave bonus +15 pearls");
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.age < 2);
    for (const e of this.enemies) {
      const targetFish = [...this.fish].sort(
        (a, b) => distance(a.pos, e.pos) - distance(b.pos, e.pos),
      )[0];
      const target =
        distance(this.submarine, e.pos) < 3
          ? this.submarine
          : targetFish?.pos || this.submarine;
      const dir = direction(e.pos, target);
      const speed = 1.35 + this.wave * 0.08;
      e.pos.x += dir.x * dt * speed;
      e.pos.y += dir.y * dt * speed;
      e.pos.z += dir.z * dt * speed;
      if (distance(e.pos, target) < 1.5 && this.time > e.biteAt) {
        e.biteAt = this.time + 2;
        if (target === this.submarine) {
          this.health = Math.max(0, this.health - 12);
          this.emit("hit", "Hull damaged!", this.submarine);
        } else if (targetFish) {
          targetFish.health--;
          this.emit("hit", "Your fish needs help!", targetFish.pos);
          if (targetFish.health <= 0) {
            this.fish = this.fish.filter((f) => f.id !== targetFish.id);
            this.emit("loss", "A fish was lost. Protect the others.");
          }
        }
      }
    }
    if (!this.enemies.length && this.time >= this.nextWave) this.summonWave();
    if (this.time > this.incomeAt) {
      this.incomeAt = this.time + 12;
      const adults = this.fish.filter((f) => f.growth >= 1);
      for (const f of adults) {
        const amount = SPECIES[f.species].income;
        this.coins += amount;
        this.emit("coin", `+${amount}`, f.pos, amount);
      }
      // A supply stipend means feeding is always recoverable, even before fish mature.
      if (this.coins < 6) {
        this.coins += 12;
        this.emit("coin", "Supply delivery: +12 pearls");
      }
    }
    this.checkMission();
    if (this.health <= 0 || this.fish.length === 0) {
      this.gameOver = true;
      this.emit(
        "loss",
        this.health <= 0
          ? "Your submarine needs a fresh start."
          : "The reef is empty. Let’s rebuild.",
      );
    }
  }
  private checkMission() {
    const m = MISSIONS[this.mission];
    if (m && this.missionProgress >= m.target) {
      this.coins += m.reward;
      this.awardXp(35);
      this.mission++;
      this.emit("mission", `${m.name} complete! +${m.reward} pearls`);
    }
  }
  snapshot() {
    return {
      version: 1,
      coins: this.coins,
      xp: this.xp,
      time: this.time,
      health: this.health,
      fish: this.fish,
      submarine: this.submarine,
      heading: this.heading,
      wave: this.wave,
      mission: this.mission,
      stats: this.stats,
      upgrades: this.upgrades,
      nextWave: Math.max(this.time + 20, this.nextWave),
      nextId: this.nextId,
    };
  }
  restore(data: unknown): boolean {
    try {
      const d = data as ReturnType<AquariumSimulation["snapshot"]>;
      if (
        d.version !== 1 ||
        !Array.isArray(d.fish) ||
        !d.fish.length ||
        d.fish.length > 28 ||
        !Number.isFinite(d.coins) ||
        d.coins < 0 ||
        !Number.isFinite(d.health) ||
        d.health <= 0 ||
        !Number.isFinite(d.time) ||
        !Number.isFinite(d.xp)
      )
        return false;
      if (
        !d.fish.every(
          (f) =>
            f &&
            SPECIES[f.species] &&
            [
              f.id,
              f.pos?.x,
              f.pos?.y,
              f.pos?.z,
              f.dir?.x,
              f.dir?.y,
              f.dir?.z,
              f.wander?.x,
              f.wander?.y,
              f.wander?.z,
              f.growth,
              f.meals,
              f.health,
              f.breedAt,
              f.phase,
            ].every(Number.isFinite),
        )
      )
        return false;
      if (
        ![
          d.submarine?.x,
          d.submarine?.y,
          d.submarine?.z,
          d.heading?.x,
          d.heading?.y,
          d.heading?.z,
          d.nextId,
          d.wave,
          d.mission,
          d.stats?.meals,
          d.stats?.grown,
          d.stats?.kills,
          d.stats?.births,
          d.upgrades?.cannon,
          d.upgrades?.hull,
          d.upgrades?.feeder,
        ].every(Number.isFinite)
      )
        return false;
      Object.assign(this, {
        coins: d.coins,
        xp: d.xp,
        time: d.time,
        health: d.health,
        fish: d.fish,
        submarine: d.submarine,
        heading: d.heading,
        wave: d.wave,
        mission: d.mission,
        stats: d.stats,
        upgrades: d.upgrades,
        nextWave: Math.max(d.time + 20, d.nextWave || 0),
        nextId: d.nextId,
      });
      this.incomeAt = this.time + 12;
      return true;
    } catch {
      return false;
    }
  }
}
