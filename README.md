# CyberHack 5250

A cozy cyberpunk heist you play in the browser. You are a hacker in a warm, plant-filled
twelfth-floor apartment on a rainy night. Orchid leaves you a job, the key is hidden in your
garden, and the only way across to Kingsley Row is a maintenance span you have to talk the
building into deploying.

Everything runs locally in the browser: no backend, no accounts, no network calls. The
"hacking" is a fictional four-digit puzzle inside the game world.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run typecheck`, `npm run lint`.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrows | Move (camera-relative) |
| `Shift` | Run |
| Mouse | Look — click the canvas to capture the pointer |
| `R` | Recentre the camera behind her |
| `E` | Interact (terminal, plant tags, objects, doorbell) |
| `Esc` | Close a panel, or pause |
| `M` | Mute / unmute |

## The route

1. Pick a look, step inside.
2. Read Orchid's message on the terminal (`E` at the desk).
3. Inspect the four plant tags along the window — each has a bloom date and a number.
4. Order the numbers by bloom date: `5250`. Enter it on the terminal's **Access** tab.
   Wrong codes are fine and unlimited; hints unlock as you go.
5. The balcony gate drops and the maintenance span extends. Walk out, cross it.
6. Ring the bell at the Kingsley Row door for the skyline reveal and the next job.
7. Free roam continues afterwards. Progress saves automatically; the title screen offers
   **Continue** or **New night** (which wipes the save).

The terminal's **Display** tab re-themes the phosphor (amber, green, magenta, ice) and the
setting persists with the save, as do the music/effects volumes, reduced motion and quality.

## Generated assets and attribution

- Character model and locomotion clips (`public/models/heroine5-web.glb`, `anim5-*.glb`):
  generated with [Tripo 3D](https://www.tripo3d.ai/) v3.0 from reference images generated
  with [Higgsfield](https://higgsfield.ai/), then rigged, retargeted and optimised with
  `@gltf-transform/cli` (Draco + WebP, 1024px textures).
- Title key art (`public/art/title-keyart.jpg`), menu icons (`public/art/icons/*.png`) and
  wall art (`public/tex/art-*.jpg`): generated with Higgsfield.
- Everything else — apartment, city, skybridge, lighting, UI and the entire soundtrack —
  is procedural: Three.js geometry, canvas-drawn textures and Web Audio synthesis. There
  are no sampled audio files in the repo.

No third-party game assets, logos or branded material are used.

## Limitations

- **Performance is GPU-bound.** Development and testing happened on a VM with software
  WebGL (SwiftShader), which renders this scene at roughly 4–7 fps at 1440×900. On real
  hardware it is a different game; the quality tier auto-drops to `low` when a software
  renderer is detected, and can be set manually in the pause menu.
- One apartment, one span, one destination — the loop is deliberately small and finished
  rather than a large unfinished city.
- Credits, shops and friend messages are not implemented yet.
- Saves live in `localStorage` under `cyberhack5250.save.v1`; private-browsing sessions
  simply will not persist.

## License

MIT — see [LICENSE](LICENSE).
