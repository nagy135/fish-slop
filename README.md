# Little Depths

A 3D aquarium game with a camera behind your submarine and a first-person cockpit view, built with TypeScript, Three.js, and Vite. Custom procedural assets include four articulated fish species, a riveted research submarine, predators, branching coral, ribbon kelp, stone ruins, and a treasure chest.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Controls

- **W / S**: move forward / backward
- **A / D**: strafe left / right
- **Drag / left and right arrows**: look around
- **Up / down arrows**: move forward / backward
- **Q / E**: dive / rise
- **Shift**: boost
- **C / camera button**: switch between chase and cockpit views
- **F**: drop food in front of the submarine
- **Shift-click**: drop food at a specific point
- **Space / right-click**: shoot an automatically aimed harpoon
- **P**: pause

Each food drop costs 6 pearls and contains 5 bites. Fish earn pearls for meals and grow to adulthood. Fed adult pairs of the same species breed after their settling time. Adults produce additional pearls every 12 seconds. Predators appear every 55 seconds of active play; defeated predators reward pearls. The market sells fish, stronger harpoons, a reinforced hull, and larger food portions. Completing goals and leveling up adds more rewards and tank capacity.

Progress saves locally every 5 seconds. The reef starts when you interact and pauses when you leave the browser tab. Controls and the field guide are available in the game. New game replaces the local save after confirmation.

```sh
npm run build
npm test
```

The browser needs WebGL. All 3D art is generated locally; there are no remote model dependencies. Google Fonts are optional and have local fallbacks. Sound is synthesized in the browser and muted by default.

## Deployment

The production game is served directly by nixpi's Nginx at **https://fish.infiniter.tech**. Its hostname, HTTPS certificate, and dynamic DNS are declared in the `nix-server` configuration for `nixpi`.

Commit your changes, then deploy from the Mac:

```sh
npm run deploy
```

The script tests and builds locally, pushes committed source over SSH to `/home/infiniter/services/fish-slop`, uploads the static output to `/var/www/fish/releases/<commit>-<timestamp>`, and atomically switches `/var/www/fish/current`. The Pi's checkout uses `receive.denyCurrentBranch=updateInstead`, allowing the deployment push to update a clean working tree. Deployment leaves the GitHub `origin` unchanged.

Nginx caches hashed `/assets/` files for one year and revalidates other files. Existing releases remain available for rollback. Choose a previous release from `ls /var/www/fish/releases`, then switch it:

```sh
ssh infiniter@nixpi.tail6650cb.ts.net 'ln -s releases/<release> /var/www/fish/.rollback && mv -Tf /var/www/fish/.rollback /var/www/fish/current'
```

Deployment does not start a Vite development or preview server.
