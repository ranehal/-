import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Users, Play, Music, Layers, Timer, TimerOff, ArrowLeft, Share2, Rocket, Info, X, Hash, UserCircle2, CheckCircle2 } from 'lucide-react'
import { Game } from './components/WordleGame'
import { ShaderBackground } from './components/ShaderBackground'
import { Difficulty, useGameStore } from './store/useGameStore'
import { useStatsStore } from './store/useStatsStore'
import { getRandomWord } from './utils/words'
import { audio } from './utils/audio'

const INTERACTIVE_VARIANTS = {
  tap: {
    scale: 0.95,
    rotate: -1,
    transition: { type: "spring", stiffness: 400, damping: 10 }
  },
  hover: { scale: 1.05, filter: "brightness(1.2)" }
}

import { supabase } from './utils/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useRef } from 'react'

function App() {
  const [view, setView] = useState<'home' | 'game' | 'multiplayer-lobby' | 'stats'>('home')
  const [difficulty, setDifficulty] = useState<Difficulty>('Normal')
  const [showFaq, setShowFaq] = useState(false)
  const [tempWordLen, setTempWordLen] = useState(5)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const sessionId = useRef(Math.random().toString(36).substring(7)).current
  
  const { 
    initGame, cycleTheme, theme, useTimer, setTimerOption, 
    multiplayerRoomId, godMode, tapFaq, isHost, playerName, setPlayerName, players, setReady,
    updatePlayerGrid, setPlayers, guesses, currentGuess, targetWord, wordHint
  } = useGameStore()

  const { gamesPlayed, gamesWon, currentStreak, maxStreak, history } = useStatsStore()

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())

  const goHome = () => {
    audio.play('click')
    // Reset multiplayer ID if we leave lobby/game
    if (view === 'multiplayer-lobby' || view === 'game') {
        initGame('Normal', '', '', true, null, true)
    }
    setView('home')
    // Clear URL params
    window.history.replaceState({}, document.title, "/")
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  // SUPABASE REALTIME SYNC
  useEffect(() => {
    if (!multiplayerRoomId) return

    const channel = supabase.channel(`room_${multiplayerRoomId}`, {
        config: { broadcast: { self: false }, presence: { key: sessionId } }
    })
    channelRef.current = channel

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState()
            const syncedPlayers = Object.entries(state).map(([key, val]: [string, any]) => ({
                id: key === sessionId ? 'me' : key, 
                name: val[0]?.playerName || 'UNKNOWN_NODE',
                isHost: val[0]?.isHost || false,
                isReady: val[0]?.isReady || false,
                gridState: val[0]?.gridState || [],
                currentGuess: val[0]?.currentGuess || ''
            }))
            setPlayers(syncedPlayers)
        })
        .on('broadcast', { event: 'sync_view' }, ({ payload }) => {
            if (payload.view === 'game') {
                initGame(payload.difficulty, payload.word, payload.hint, payload.useTimer, multiplayerRoomId, isHost)
                setView('game')
            }
        })
        .on('broadcast', { event: 'sync_grid' }, ({ payload }) => {
            updatePlayerGrid(payload.playerName, payload.guesses, payload.currentGuess)
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ isHost, isReady: isHost, playerName, sessionId })
            }
        })

    return () => { 
        channel.unsubscribe() 
        channelRef.current = null
    }
  }, [multiplayerRoomId, playerName, isHost, setPlayers, updatePlayerGrid, setView, initGame, sessionId])

  // BROADCAST LOOP: High-frequency sync
  useEffect(() => {
      if (!multiplayerRoomId || view !== 'game' || !channelRef.current) return
      
      channelRef.current.send({
          type: 'broadcast',
          event: 'sync_grid',
          payload: { playerName: sessionId, guesses, currentGuess }
      })
  }, [currentGuess, guesses, multiplayerRoomId, view, sessionId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomId = params.get('room')
    if (roomId && view === 'home') {
      initGame('Normal', '', '', true, roomId, false)
      setView('multiplayer-lobby')
    }
  }, [])

  const startGame = () => {
    audio.play('win')
    const wordData = getRandomWord(difficulty, tempWordLen)
    initGame(difficulty, wordData.word, wordData.hint, useTimer, null, true)
    setView('game')
  }

  const createMultiplayerRoom = () => {
    audio.play('click')
    const roomId = Math.random().toString(36).substring(2, 9).toUpperCase()
    const wordData = getRandomWord(difficulty, tempWordLen)
    initGame(difficulty, wordData.word, wordData.hint, useTimer, roomId, true)
    setView('multiplayer-lobby')
  }

  const startMultiplayerBattle = () => {
      const wordData = getRandomWord(difficulty, tempWordLen)
      initGame(difficulty, wordData.word, wordData.hint, useTimer, multiplayerRoomId, true)
      
      // Broadcast to all guests
      channelRef.current?.send({
          type: 'broadcast',
          event: 'sync_view',
          payload: { 
              view: 'game', 
              difficulty, 
              word: wordData.word, 
              hint: wordData.hint, 
              useTimer 
          }
      })
      
      setView('game')
  }

  const copyRoomLink = () => {
    if (!multiplayerRoomId) return
    // Respect the base path and ensure trailing slash for GH Pages compatibility
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '') + '/'
    const url = `${baseUrl}?room=${multiplayerRoomId}`
    navigator.clipboard.writeText(url)
    audio.play('click')
    alert(`Link Copied: ${multiplayerRoomId}`)
  }

  const allPlayersReady = players.length > 1 && players.every(p => p.isReady)

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 relative overflow-x-hidden bg-[#050505] text-white">
      <ShaderBackground mode={0} />
      
      {/* Global Navigation */}
      <div className="fixed top-4 left-4 sm:top-8 sm:left-8 z-[100]">
        <AnimatePresence>
            {view !== 'home' && (
                <motion.button
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    whileHover={INTERACTIVE_VARIANTS.hover} whileTap={INTERACTIVE_VARIANTS.tap}
                    onClick={goHome}
                    className="p-4 sm:p-5 glass-panel rounded-2xl sm:rounded-3xl border-white/10 hover:bg-chaos-red/20 transition-all group shadow-2xl flex items-center gap-2 sm:gap-3"
                >
                    <ArrowLeft size={18} className="sm:w-6 sm:h-6 group-hover:text-chaos-red transition-colors" />
                    <span className="font-black text-[8px] sm:text-[10px] tracking-widest uppercase">DISCONNECT</span>
                </motion.button>
            )}
        </AnimatePresence>
      </div>

      <div className="fixed top-4 right-4 sm:top-8 sm:right-8 font-mono text-chaos-green/40 text-[8px] sm:text-[10px] tracking-[0.3em] sm:tracking-[0.5em] z-50">
        RT_{currentTime}
      </div>

      {/* Global Utilities */}
      <div className="fixed bottom-4 left-4 sm:bottom-8 sm:left-8 z-[100] flex gap-2 sm:gap-4 items-center">
        <div className="flex flex-col items-center gap-1 sm:gap-2">
            <span className="text-[7px] sm:text-[9px] font-black text-chaos-green tracking-widest uppercase">{theme}</span>
            <motion.button 
                whileHover={INTERACTIVE_VARIANTS.hover}
                whileTap={INTERACTIVE_VARIANTS.tap}
                onClick={() => { audio.play('click'); cycleTheme(); }}
                className="p-4 sm:p-5 glass-panel rounded-2xl sm:rounded-3xl border-white/10 hover:bg-chaos-green/20 transition-all group shadow-2xl"
            >
                <Layers size={18} className="sm:w-6 sm:h-6 group-hover:text-chaos-green transition-colors" />
            </motion.button>
        </div>
        
        <div className="flex flex-col items-center gap-1 sm:gap-2">
            <span className="text-[7px] sm:text-[9px] font-black text-gray-500 tracking-widest uppercase">INFO_CORE</span>
            <motion.button 
                whileHover={INTERACTIVE_VARIANTS.hover}
                whileTap={INTERACTIVE_VARIANTS.tap}
                onClick={() => { audio.play('click'); tapFaq(); setShowFaq(true); }}
                className={`p-4 sm:p-5 glass-panel rounded-2xl sm:rounded-3xl border-white/10 transition-all group ${godMode ? 'text-chaos-red animate-pulse' : ''}`}
            >
                <Info size={18} className="sm:w-6 sm:h-6" />
            </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
            className="glass-panel p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] max-w-md w-full text-center space-y-6 sm:space-y-10 relative z-10 border-white/5 shadow-2xl"
          >
            <div className="space-y-4">
              <motion.h1 
                whileHover={{ scale: 1.1, skewX: [0, -5, 5, 0], color: ["#ffffff", "#00ff88", "#ff3366", "#ffffff"] }}
                transition={{ duration: 0.5 }}
                onClick={() => { tapFaq(); audio.play('click'); }}
                className="text-6xl sm:text-8xl font-black italic tracking-tighter neon-text leading-none font-serif cursor-pointer select-none"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                শব্দদোষ
              </motion.h1>
              
              <div className="relative group max-w-xs mx-auto">
                <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-chaos-green" size={18} />
                <input 
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                    placeholder="ENTER_NAME"
                    className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl outline-none focus:border-chaos-green/50 focus:bg-white/10 transition-all font-mono text-xs sm:text-sm tracking-widest text-center"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <motion.button 
                  whileHover={INTERACTIVE_VARIANTS.hover} whileTap={INTERACTIVE_VARIANTS.tap}
                  onClick={() => { audio.play('click'); setDifficulty(difficulty === 'EZ' ? 'Normal' : difficulty === 'Normal' ? 'Asian' : 'EZ'); }}
                  className="glass-panel p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center hover:bg-white/5 border-white/5"
                >
                  <span className="text-[7px] sm:text-[8px] text-gray-400 font-bold uppercase mb-1">Risk</span>
                  <span className={`font-black text-[9px] sm:text-[10px] ${difficulty === 'Asian' ? 'text-chaos-red' : 'text-white'}`}>{difficulty.toUpperCase()}</span>
                </motion.button>

                <motion.button 
                  whileHover={INTERACTIVE_VARIANTS.hover} whileTap={INTERACTIVE_VARIANTS.tap}
                  onClick={() => { audio.play('click'); setTimerOption(!useTimer); }}
                  className="glass-panel p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center hover:bg-white/5 border-white/5"
                >
                  <span className="text-[7px] sm:text-[8px] text-gray-400 font-bold uppercase mb-1">Sync</span>
                  {useTimer ? <Timer size={12} className="sm:w-3.5 sm:h-3.5 text-chaos-green" /> : <TimerOff size={12} className="sm:w-3.5 sm:h-3.5 text-chaos-red" />}
                </motion.button>

                <motion.button 
                  whileHover={INTERACTIVE_VARIANTS.hover} whileTap={INTERACTIVE_VARIANTS.tap}
                  onClick={() => { audio.play('click'); setTempWordLen(tempWordLen >= 9 ? 5 : tempWordLen + 1); }}
                  className="glass-panel p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center hover:bg-white/5 border-white/5"
                >
                  <span className="text-[7px] sm:text-[8px] text-gray-400 font-bold uppercase mb-1">Len</span>
                  <div className="flex items-center gap-1 font-black text-[9px] sm:text-[10px]"><Hash size={8} /> {tempWordLen}</div>
                </motion.button>
              </div>

              <motion.button 
                whileHover={INTERACTIVE_VARIANTS.hover} whileTap={INTERACTIVE_VARIANTS.tap}
                onClick={startGame}
                className="group relative px-4 sm:px-6 py-4 sm:py-6 bg-white text-black font-black text-lg sm:text-xl rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 transition-all shadow-xl"
              >
                <Play fill="black" size={20} className="sm:w-6 sm:h-6" /> INITIALIZE_SINGLE
              </motion.button>

              <motion.button 
                whileHover={INTERACTIVE_VARIANTS.hover} whileTap={INTERACTIVE_VARIANTS.tap}
                onClick={createMultiplayerRoom}
                className="px-4 sm:px-6 py-4 sm:py-6 glass-panel border-white/10 hover:bg-white/5 text-white font-black text-lg sm:text-xl rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 transition-all"
              >
                <Users size={20} className="sm:w-6 sm:h-6" /> CLUSTER_SYNC
              </motion.button>
            </div>

            <div className="flex justify-center gap-8 pt-2 sm:pt-4">
              <motion.button whileHover={INTERACTIVE_VARIANTS.hover} whileTap={INTERACTIVE_VARIANTS.tap} onClick={() => { audio.play('click'); setView('stats'); }} className="p-3 sm:p-4 glass-panel rounded-xl sm:rounded-2xl hover:bg-white/10 border-white/5 group">
                <Trophy size={16} className="sm:w-[18px] sm:h-[18px] group-hover:text-chaos-green" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {view === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
            className="glass-panel p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] max-w-lg w-full text-center space-y-6 sm:space-y-8 z-10 border-white/5 shadow-2xl relative"
          >
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase text-chaos-green">Global Sync</h2>
              <p className="text-[8px] sm:text-[10px] text-gray-500 font-mono tracking-widest uppercase">Player Records & Leaderboard</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
               <div className="bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5">
                  <div className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 sm:mb-2">Win Rate</div>
                  <div className="text-2xl sm:text-4xl font-black text-white">{gamesPlayed > 0 ? Math.round((gamesWon/gamesPlayed)*100) : 0}%</div>
               </div>
               <div className="bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5">
                  <div className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 sm:mb-2">Max Streak</div>
                  <div className="text-2xl sm:text-4xl font-black text-chaos-green">{maxStreak}</div>
               </div>
               <div className="bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5">
                  <div className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 sm:mb-2">Played</div>
                  <div className="text-2xl sm:text-4xl font-black">{gamesPlayed}</div>
               </div>
               <div className="bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5">
                  <div className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 sm:mb-2">Cur Streak</div>
                  <div className="text-2xl sm:text-4xl font-black text-chaos-red">{currentStreak}</div>
               </div>
            </div>

            <div className="space-y-3 sm:space-y-4 text-left">
                <h3 className="text-xs sm:text-sm font-black tracking-widest uppercase text-gray-500 border-b border-white/5 pb-2">Recent Decryptions</h3>
                <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {history.length === 0 && <p className="text-[10px] sm:text-xs text-gray-600 italic">No decryptions logged.</p>}
                    {history.map(match => (
                        <div key={match.id} className="flex justify-between items-center bg-white/5 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-white/5">
                            <div>
                                <span className={`font-black tracking-widest uppercase text-xs sm:text-sm mr-2 ${match.won ? 'text-chaos-green' : 'text-chaos-red'}`}>{match.word}</span>
                                <span className="text-[7px] sm:text-[9px] text-gray-500 font-mono">[{match.difficulty}]</span>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] sm:text-xs font-bold">{match.time}</div>
                                <div className="text-[7px] sm:text-[9px] text-gray-500 font-mono">Atmpts: {match.attempts}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </motion.div>
        )}

        {view === 'multiplayer-lobby' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] max-w-lg w-full text-center space-y-6 sm:space-y-8 z-10 border-white/5 shadow-2xl"
          >
            <div className="space-y-2 sm:space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase">Cluster Network</h2>
              <div className="bg-chaos-green/10 py-1 sm:py-2 px-6 sm:px-8 rounded-full inline-block border border-chaos-green/20">
                <span className="font-mono text-chaos-green text-xs sm:text-sm font-bold tracking-[0.3em] sm:tracking-[0.4em] uppercase">ROOM_{multiplayerRoomId}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4">
                {players.map(player => (
                    <motion.div 
                        key={player.id} 
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-white/5"
                    >
                        <div className="flex items-center gap-3 sm:gap-5">
                            <div className={`w-10 h-10 sm:w-14 sm:h-14 ${player.isHost ? 'bg-chaos-green shadow-[0_0_20px_rgba(0,255,136,0.2)]' : 'bg-chaos-red'} rounded-xl sm:rounded-2xl flex items-center justify-center text-black font-black text-xl sm:text-2xl`}>
                              {player.name[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="text-left">
                                <span className="font-black tracking-tight text-sm sm:text-lg block">{player.name.toUpperCase()}</span>
                                <span className="text-[7px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest">{player.isHost ? 'SYSTEM_NODE (HOST)' : 'GUEST_NODE'}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 sm:gap-2">
                             <span className={`${player.isReady ? 'text-chaos-green' : 'text-gray-500'} text-[7px] sm:text-[10px] font-black tracking-widest uppercase`}>
                                {player.isReady ? 'READY_SYNC' : 'WAITING...'}
                             </span>
                             {player.isReady ? <CheckCircle2 size={14} className="sm:w-[18px] sm:h-[18px] text-chaos-green" /> : <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white/10" />}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <motion.button 
                  whileHover={INTERACTIVE_VARIANTS.hover} whileTap={INTERACTIVE_VARIANTS.tap}
                  onClick={copyRoomLink}
                  className="py-4 sm:py-5 glass-panel border-white/10 hover:bg-white/5 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center gap-2 sm:gap-3 font-black transition-all text-[9px] sm:text-xs tracking-widest"
                >
                    <Share2 size={16} className="sm:w-5 sm:h-5" /> SYNC LINK
                </motion.button>
                
                {isHost ? (
                    <motion.button 
                        whileHover={allPlayersReady ? INTERACTIVE_VARIANTS.hover : {}}
                        whileTap={allPlayersReady ? INTERACTIVE_VARIANTS.tap : {}}
                        onClick={() => allPlayersReady && startMultiplayerBattle()}
                        disabled={!allPlayersReady}
                        className={`py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center gap-2 sm:gap-3 font-black transition-all shadow-xl ${allPlayersReady ? 'bg-chaos-green text-black shadow-chaos-green/30' : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'}`}
                    >
                        <Rocket size={16} className="sm:w-5 sm:h-5" /> {allPlayersReady ? 'START BATTLE' : 'WAITING GUEST'}
                    </motion.button>
                ) : (
                    <motion.button 
                        whileHover={INTERACTIVE_VARIANTS.hover}
                        whileTap={INTERACTIVE_VARIANTS.tap}
                        onClick={async () => {
                            const me = players.find(p => p.id === 'me')
                            if (me && channelRef.current) {
                                const newReady = !me.isReady
                                setReady('me', newReady) 
                                await channelRef.current.track({ isHost, isReady: newReady, playerName })
                                audio.play('click')
                            }
                        }}
                        className={`py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center gap-2 sm:gap-3 font-black transition-all shadow-xl ${players.find(p => p.id === 'me')?.isReady ? 'bg-chaos-green text-black' : 'bg-white/10 text-white'}`}
                    >
                        <CheckCircle2 size={16} className="sm:w-5 sm:h-5" /> {players.find(p => p.id === 'me')?.isReady ? 'READY' : 'GO READY'}
                    </motion.button>
                )}
            </div>
          </motion.div>
        )}

        {view === 'game' && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full flex justify-center z-10"
          >
            <Game onBack={() => setView('home')} isMultiplayer={!!multiplayerRoomId} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFaq && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="glass-panel p-12 rounded-[4rem] max-w-lg w-full relative border-white/5 shadow-2xl"
            >
              <button onClick={() => setShowFaq(false)} className="absolute top-10 right-10 p-4 hover:bg-white/10 rounded-full transition-all">
                <X size={32} />
              </button>
              
              <div className="space-y-10">
                <div className="space-y-2 text-center">
                  <h2 className="text-6xl font-black italic tracking-tighter text-chaos-green uppercase">Neural System</h2>
                  <p className="text-[10px] text-gray-500 font-mono tracking-[0.5em] uppercase border-b border-white/5 pb-6">Protocol FAQ v2.6.2</p>
                </div>

                <div className="space-y-8 text-sm text-gray-400 font-bold">
                   <div className="flex gap-6">
                       <span className="text-chaos-green">01</span>
                       <p className="leading-relaxed"><span className="text-white uppercase italic">Input:</span>শব্দদোষ is a high-speed word decryption interface. Use physical keyboard for maximum pulse sync.</p>
                   </div>
                   <div className="flex gap-6">
                       <span className="text-chaos-green">02</span>
                       <p className="leading-relaxed"><span className="text-white uppercase italic">Rules:</span>In Asian mode, yellow hints are purged. You only receive green verification data.</p>
                   </div>
                   <div className="flex gap-6">
                       <span className="text-chaos-green">03</span>
                       <p className="leading-relaxed"><span className="text-white uppercase italic">Lobby:</span>Cluster Sync requires Guest to be READY before the Host can INITIATE the battle.</p>
                   </div>
                </div>

                <div className={`p-10 rounded-[3rem] border ${godMode ? 'border-chaos-red bg-chaos-red/5' : 'border-white/10 bg-white/5'} text-center shadow-inner`}>
                   <p className="text-[11px] text-gray-500 font-mono tracking-[0.5em] uppercase mb-4">ACCESS_LEVEL</p>
                   <p className={`font-black italic text-3xl tracking-[0.2em] ${godMode ? 'text-chaos-red animate-pulse' : 'text-white'}`}>
                      {godMode ? 'GOD_MODE_ACTIVE' : 'RESTRICTED'}
                   </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
