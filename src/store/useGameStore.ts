import { create } from 'zustand'
import { audio } from '../utils/audio'

export type Difficulty = 'EZ' | 'Normal' | 'Asian'
export type LetterStatus = 'empty' | 'absent' | 'present' | 'correct'
export type GameTheme = 'SPACE' | 'UNIVERSE' | 'NEON_FLUID' | 'HALLUCINATION' | 'CHAOS'

interface Player {
  id: string
  name: string
  isHost: boolean
  isReady: boolean
  gridState?: string[]
  currentGuess?: string 
}

interface GameState {
  playerName: string
  players: Player[]
  wordLength: number
  maxAttempts: number
  targetWord: string
  wordHint: string
  guesses: string[]
  currentGuess: string
  status: 'playing' | 'won' | 'lost'
  difficulty: Difficulty
  hintsUsed: number
  faqTaps: number
  theme: GameTheme
  useTimer: boolean
  godMode: boolean
  wordStartTime: number
  multiplayerRoomId: string | null
  isHost: boolean
  
  // Actions
  setPlayerName: (name: string) => void
  setReady: (id: string, ready: boolean) => void
  updatePlayerGrid: (id: string, guesses: string[], currentGuess?: string) => void 
  addPlayer: (player: Player) => void
  removePlayer: (id: string) => void
  setPlayers: (players: Player[]) => void
  initGame: (difficulty: Difficulty, word: string, hint: string, useTimer?: boolean, roomId?: string | null, isHost?: boolean) => void
  addLetter: (letter: string) => void
  removeLetter: () => void
  submitGuess: () => boolean
  tapFaq: () => boolean 
  setTheme: (theme: GameTheme) => void
  cycleTheme: () => void
  setTimerOption: (val: boolean) => void
  setWordLength: (len: number) => void
  resetWordTimer: () => void
}

const FRUITS = ['APPLE', 'MANGO', 'CHERRY', 'BANANA', 'PAPAYA', 'BERRY', 'MELON', 'PEACH', 'GRAPE', 'KIWI', 'LEMON', 'LIME', 'COCO', 'FIG', 'PLUM']
const THEMES: GameTheme[] = ['SPACE', 'UNIVERSE', 'NEON_FLUID', 'HALLUCINATION', 'CHAOS']

export const useGameStore = create<GameState>((set, get) => ({
  playerName: FRUITS[Math.floor(Math.random() * FRUITS.length)] + '_' + Math.floor(Math.random() * 99),
  players: [{ id: 'me', name: 'INITIALIZING...', isHost: true, isReady: true }], 
  wordLength: 5,
  maxAttempts: 6,
  targetWord: '',
  wordHint: '',
  guesses: [],
  currentGuess: '',
  status: 'playing',
  difficulty: 'Normal',
  hintsUsed: 0,
  faqTaps: 0,
  theme: 'CHAOS',
  useTimer: true,
  godMode: false,
  wordStartTime: Date.now(),
  multiplayerRoomId: null,
  isHost: true,

  setPlayerName: (name) => set({ playerName: name }),

  setReady: (id, ready) => set((state) => ({
    players: state.players.map(p => p.id === id ? { ...p, isReady: ready } : p)
  })),

  updatePlayerGrid: (id, guesses, currentGuess) => set((state) => {
    const playerIndex = state.players.findIndex(p => p.id === id || p.name === id)
    if (playerIndex === -1) return state
    
    const newPlayers = [...state.players]
    newPlayers[playerIndex] = { 
        ...newPlayers[playerIndex], 
        gridState: guesses, 
        currentGuess: currentGuess 
    }
    return { players: newPlayers }
  }),

  addPlayer: (player) => set((state) => {
      if (state.players.find(p => p.id === player.id)) return state
      return { players: [...state.players, player] }
  }),

  removePlayer: (id) => set((state) => ({
      players: state.players.filter(p => p.id !== id)
  })),

  setPlayers: (players) => set({ players }),

  initGame: (difficulty, word, hint, useTimer = true, roomId = null, isHost = true) => {
    let maxAttempts = 6
    if (difficulty === 'Asian') maxAttempts = 5

    set({
      difficulty,
      targetWord: word.toUpperCase(),
      wordHint: hint,
      wordLength: word.length, 
      maxAttempts,
      guesses: [],
      currentGuess: '',
      status: 'playing',
      hintsUsed: 0,
      useTimer,
      godMode: get().godMode, 
      wordStartTime: Date.now(),
      multiplayerRoomId: roomId,
      isHost: isHost,
      players: [], 
      faqTaps: 0 
    })
  },

  addLetter: (letter) => {
    const { currentGuess, wordLength, status } = get()
    if (status !== 'playing') return
    if (currentGuess.length < wordLength) {
      set({ currentGuess: currentGuess + letter.toUpperCase() })
    }
  },

  removeLetter: () => {
    const { currentGuess, status } = get()
    if (status !== 'playing') return
    set({ currentGuess: currentGuess.slice(0, -1) })
  },

  submitGuess: () => {
    const { currentGuess, wordLength, guesses, targetWord, maxAttempts, status } = get()
    if (status !== 'playing' || currentGuess.length !== wordLength) return false

    const newGuesses = [...guesses, currentGuess]
    let newStatus: 'playing' | 'won' | 'lost' = 'playing'

    if (currentGuess === targetWord) newStatus = 'won'
    else if (newGuesses.length >= maxAttempts) newStatus = 'lost'

    set({ guesses: newGuesses, currentGuess: '', status: newStatus })
    return true
  },

  tapFaq: () => {
    const { faqTaps } = get()
    const nextTaps = faqTaps + 1
    set({ faqTaps: nextTaps })
    if (nextTaps >= 5) {
      set({ godMode: true })
      audio.play('win') 
      return true
    }
    return false
  },

  setTheme: (theme) => set({ theme }),
  cycleTheme: () => set((state) => {
      const idx = THEMES.indexOf(state.theme)
      return { theme: THEMES[(idx + 1) % THEMES.length] }
  }),
  setTimerOption: (val) => set({ useTimer: val }),
  setWordLength: (len) => set({ wordLength: len }),
  resetWordTimer: () => set({ wordStartTime: Date.now() })
}))
