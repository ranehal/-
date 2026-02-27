# Wordle Chaos Multiplayer 🌪️

A real-time competitive Wordle platform with high-stakes difficulty modes.

## Tech Stack
- **Frontend:** React, Vite, TailwindCSS, Framer Motion, Zustand
- **Backend:** Supabase (Realtime, Auth, Postgres)
- **Difficulty:** EZ, Normal, ASIAN (Hardest)

## Asian Mode Features 😈
- 7-9 letter words only
- 4-5 attempts max
- No yellow hints (Green or nothing)
- 5s penalty for wrong guesses
- 60s total time limit
- Heartbeat animation & Neon-red UI

## Development
1. `npm install`
2. `npm run dev`

## Phase 2: Multiplayer (Roadmap)
To enable multiplayer:
1. Create a Supabase project.
2. Run the SQL schema provided in `supabase/schema.sql`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
4. Implement `src/store/useMultiplayerStore.ts`.

## Scoring Formula
`Final Score = Base (100) × Speed Multiplier × Attempt Multiplier × Difficulty Multiplier`
- EZ: 1x
- Normal: 1.5x
- Asian: 2.5x
