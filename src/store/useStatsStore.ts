import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MatchHistory {
  id: string
  date: string
  word: string
  difficulty: string
  won: boolean
  attempts: number
  time: string
}

interface StatsState {
  gamesPlayed: number
  gamesWon: number
  currentStreak: number
  maxStreak: number
  history: MatchHistory[]
  addMatch: (match: Omit<MatchHistory, 'id'>) => void
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      history: [],
      addMatch: (matchData) => {
        const { gamesPlayed, gamesWon, currentStreak, maxStreak, history } = get()
        const won = matchData.won
        const newStreak = won ? currentStreak + 1 : 0
        const newMatch = { ...matchData, id: Math.random().toString(36).substr(2, 9) }
        
        set({
          gamesPlayed: gamesPlayed + 1,
          gamesWon: gamesWon + (won ? 1 : 0),
          currentStreak: newStreak,
          maxStreak: Math.max(maxStreak, newStreak),
          history: [newMatch, ...history].slice(0, 15) // Keep last 15 matches
        })
      }
    }),
    {
      name: 'shobdosh-player-stats',
    }
  )
)
