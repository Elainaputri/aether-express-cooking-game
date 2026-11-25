# Aether Express: Grand Dining Car

![make.fun bounty](https://make.fun/badge/best-cooking-game-20261125-0137.svg)
![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Elainaputri/aether-express-cooking-game/rank.svg)
![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Elainaputri/aether-express-cooking-game/reward.svg)

An entry for make.fun's [Best Cooking Game](https://make.fun/bounty/best-cooking-game-20261125-0137)
bounty. A vintage brass-and-mahogany train dining car, drawn entirely in code: take each passenger's
order, cook every step at the glowing brass stations while the doneness arc crosses the golden zone,
plate the dish on the pass and serve it before patience runs out. Build a combo to ignite FEVER RUSH,
spend your tips on upgrades between shifts, and keep the buffet car rolling.

## Run it

```sh
node serve.ts          # serves game/ at http://localhost:8080
```

Open <http://localhost:8080> in a desktop browser. Mouse: click an order card to take it, hold a
station to cook, release in the golden zone, click the pass to serve, click the shop to buy upgrades.
Keyboard: `1`–`4` pick a station, `Space` cooks/releases the active station, `Enter` serves, `U`
opens the upgrade shop, `R` restarts.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with
`buildDossier` from `vendor/makefun-game.ts`.

## Layout

- `game/src/` — the engine: `GameEngine`, `CookingStations`, `RecipeSystem`, `CustomerAI`,
  `ParticleAndFX`, `SoundSynthesizer`, `ProgressionManager`, `Renderer`, `Input`, `random`,
  `config` and the `shots.js` scene stager.
- `screenshots/` — four stills of the game: mid-service, a dish ready on the pass, FEVER RUSH and
  the upgrade shop.
- `shots.json` — the query string for each screenshot.
