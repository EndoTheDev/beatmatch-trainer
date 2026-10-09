# beatmatch-trainer

Two drum decks, pitch faders, hold-to-bend nudging - practice beatmatching by ear, in your browser.

Live at [endothe.dev/tools/beatmatch-trainer](https://endothe.dev/tools/beatmatch-trainer).

- Angular 22 (zoneless, signals) + Web Audio lookahead scheduler on the AudioContext clock
- Two decks: play/pause, stop, cue, pitch faders +-8%, volume, mute, swappable kits (house, techno, hip hop, dnb)
- Hold-to-bend push/drag like a CDJ platter, adjustable bend rate (0.5-4%/s)
- Practice mode (free play) + challenge mode: hidden tempo offset, blind phase meter, time-in-phase scoring (S/A/B/C), 10 difficulty levels
- Auto dark/light with a tri-state toggle
- No backend, no assets - everything is synthesized

Self-check of the engine math:

```bash
npx vitest run
```

Part of the endothe.dev tools series - each tool is a standalone repo, deployed from a Raspberry Pi.
