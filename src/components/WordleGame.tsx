import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Zap, Bot, User, Cpu, ArrowLeft } from 'lucide-react'
import { useGameStore, LetterStatus } from '../store/useGameStore'
import { useStatsStore } from '../store/useStatsStore'
import { useTimer } from '../hooks/useTimer'
import { audio } from '../utils/audio'

const INTERACTIVE_VARIANTS = {
  tap: {
    scale: 0.95,
    rotate: -1,
    transition: { type: "spring", stiffness: 400, damping: 10 }
  },
  hover: { scale: 1.05, filter: "brightness(1.2)" }
}

const Cell = React.memo(({ letter, status, index }: { letter: string, status: LetterStatus, index: number }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'correct': return 'bg-chaos-green border-chaos-green text-black shadow-[0_0_15px_rgba(0,255,136,0.3)]'
      case 'present': return 'bg-chaos-yellow border-chaos-yellow text-black'
      case 'absent': return 'bg-chaos-gray border-chaos-gray text-white opacity-40'
      default: return 'bg-transparent border-white/10 text-white'
    }
  }

  return (
    <motion.div
      initial={{ scale: 1 }}
      animate={status !== 'empty' ? { scale: [1, 1.1, 1], rotateX: [0, 180, 0] } : {}}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className={`w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-3xl font-black rounded-xl border-2 transition-all duration-500 shadow-xl ${getStatusColor()}`}
    >
      {letter}
    </motion.div>
  )
})

const Row = React.memo(({ word, targetWord, isSubmitted, difficulty }: { word: string, targetWord: string, isSubmitted: boolean, difficulty: string }) => {
  const cells = useMemo(() => {
    const arr = []
    for (let i = 0; i < targetWord.length; i++) {
      const letter = word[i] || ''
      let status: LetterStatus = 'empty'
      if (isSubmitted) {
        if (letter === targetWord[i]) status = 'correct'
        else if (targetWord.includes(letter)) status = difficulty === 'Asian' ? 'absent' : 'present'
        else status = 'absent'
      }
      arr.push(<Cell key={i} letter={letter} status={status} index={i} />)
    }
    return arr
  }, [word, targetWord, isSubmitted, difficulty])

  return <div className="flex gap-2 mb-2 justify-center">{cells}</div>
})

const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
  if (typeof window !== 'undefined' && window.navigator.vibrate) {
    switch (type) {
      case 'light': window.navigator.vibrate(10); break;
      case 'medium': window.navigator.vibrate(20); break;
      case 'success': window.navigator.vibrate([10, 30, 10]); break;
      case 'error': window.navigator.vibrate([50, 20, 50]); break;
    }
  }
}

const MiniCell = ({ letter, status }: { letter?: string, status: LetterStatus }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'correct': return 'bg-chaos-green shadow-[0_0_8px_rgba(0,255,136,0.6)] border-chaos-green'
            case 'present': return 'bg-chaos-yellow shadow-[0_0_8px_rgba(255,255,0,0.4)] border-chaos-yellow'
            case 'absent': return 'bg-chaos-gray border-chaos-gray opacity-40'
            default: return 'bg-white/5 border-white/10'
        }
    }
    return (
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center text-sm sm:text-base font-black ${getStatusColor()} transition-all duration-300`}>
            {letter?.toUpperCase()}
        </div>
    )
}

const MiniGrid = ({ guesses, currentGuess, targetWord, difficulty, maxAttempts }: { guesses: string[], currentGuess?: string, targetWord: string, difficulty: string, maxAttempts: number }) => {
    return (
        <div className="flex flex-col gap-2 p-6 glass-panel border-white/10 bg-white/5 rounded-[2rem] shadow-2xl scale-110 origin-top-left">
            {Array.from({ length: maxAttempts }).map((_, i) => {
                const isCurrentRow = i === guesses.length
                const word = isCurrentRow ? (currentGuess || '') : (guesses[i] || '')
                const isSubmitted = i < guesses.length

                return (
                    <div key={i} className="flex gap-2">
                        {Array.from({ length: targetWord.length }).map((_, j) => {
                            const letter = word[j] || ''
                            let status: LetterStatus = 'empty'
                            
                            if (isSubmitted) {
                                if (letter === targetWord[j]) status = 'correct'
                                else if (targetWord.includes(letter)) status = difficulty === 'Asian' ? 'absent' : 'present'
                                else status = 'absent'
                            } else if (isCurrentRow && letter) {
                                status = 'empty' // Show typing letters without colors
                            }

                            return <MiniCell key={j} letter={letter} status={status} />
                        })}
                    </div>
                )
            })}
        </div>
    )
}

const Keyboard = ({ usedLetters, onKey }: { usedLetters: Record<string, LetterStatus>, onKey: (key: string) => void }) => {
    const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
    ]

    return (
        <div className="flex flex-col gap-2 items-center w-full mt-10">
            {rows.map((row, i) => (
                <div key={i} className="flex gap-1 sm:gap-2">
                    {row.map(key => {
                        const status = usedLetters[key] || 'empty'
                        const isAction = key === 'ENTER' || key === 'DEL'
                        
                        return (
                            <motion.button
                                key={key}
                                whileHover={{ scale: 1.05, filter: "brightness(1.2)" }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onKey(key)}
                                className={`
                                    ${isAction ? 'px-3 sm:px-6' : 'w-8 sm:w-12'} 
                                    h-12 sm:h-14 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-sm flex items-center justify-center transition-all duration-300 border-b-4
                                    ${status === 'correct' ? 'bg-chaos-green border-green-700 text-black' :
                                      status === 'present' ? 'bg-chaos-yellow border-yellow-700 text-black' :
                                      status === 'absent' ? 'bg-chaos-gray border-gray-800 text-white opacity-50' :
                                      'bg-white/10 border-white/5 text-white hover:bg-white/20'}
                                `}
                            >
                                {key}
                            </motion.button>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}

export const Game = ({ onBack, isMultiplayer }: { onBack: () => void, isMultiplayer?: boolean }) => {
  const { 
    guesses, currentGuess, maxAttempts, status, targetWord, 
    difficulty, addLetter, removeLetter, submitGuess: storeSubmitGuess,
    wordHint, godMode, wordStartTime, players, updatePlayerGrid
  } = useGameStore()

  const { addMatch } = useStatsStore()
  const [matchSaved, setMatchSaved] = useState(false)

  const usedLetters = useMemo(() => {
      const map: Record<string, LetterStatus> = {}
      guesses.forEach(word => {
          for (let i = 0; i < word.length; i++) {
              const letter = word[i]
              const status = letter === targetWord[i] ? 'correct' : targetWord.includes(letter) ? (difficulty === 'Asian' ? 'absent' : 'present') : 'absent'
              if (status === 'correct' || (status === 'present' && map[letter] !== 'correct') || (status === 'absent' && !map[letter])) {
                  map[letter] = status
              }
          }
      })
      return map
  }, [guesses, targetWord, difficulty])

  const [hintMsg, setHintMsg] = useState<string | null>(null)
  const [wordTimer, setWordTimer] = useState("0.0s")
  
  // Real-time POV Broadcast Sync
  useEffect(() => {
      // In production, sync is handled by App.tsx Supabase hooks.
      // This useEffect is now just a placeholder for local-only side effects if needed.
  }, [guesses, isMultiplayer, players, status, updatePlayerGrid, maxAttempts])

  useEffect(() => {
    if (status !== 'playing') return
    const interval = setInterval(() => {
      const diff = (Date.now() - wordStartTime) / 1000
      setWordTimer(diff.toFixed(1) + "s")
    }, 100)
    return () => clearInterval(interval)
  }, [wordStartTime, status])

  const { formatTime, start, timeLeft, stop } = useTimer(
    difficulty === 'Asian' ? 60 : 300, 
    () => { if (status === 'playing') audio.play('lose') }
  )

  useEffect(() => { start(); return () => stop(); }, [start, stop])

  useEffect(() => {
    if (status !== 'playing' && !matchSaved) {
      addMatch({
        date: new Date().toLocaleDateString(),
        word: targetWord,
        difficulty,
        won: status === 'won',
        attempts: guesses.length,
        time: formatTime()
      })
      setMatchSaved(true)
    }
  }, [status, matchSaved, addMatch, targetWord, difficulty, guesses.length, formatTime])

  const handleEnter = useCallback(() => { 
    const success = storeSubmitGuess()
    if (!success) {
        audio.play('bonk')
        triggerHaptic('error')
    } else {
        audio.play('click')
        triggerHaptic('medium')
        if (currentGuess === targetWord) {
            audio.play('win')
            triggerHaptic('success')
        }
    }
  }, [storeSubmitGuess, currentGuess, targetWord])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleEnter()
      else if (e.key === 'Backspace') { audio.play('click'); triggerHaptic('light'); removeLetter(); }
      else if (/^[a-zA-Z]$/.test(e.key)) { audio.play('click'); triggerHaptic('light'); addLetter(e.key); }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleEnter, removeLetter, addLetter])

  const onKey = (key: string) => {
      if (key === 'ENTER') handleEnter()
      else if (key === 'DEL') { audio.play('click'); triggerHaptic('light'); removeLetter(); }
      else { audio.play('click'); triggerHaptic('light'); addLetter(key); }
  }

  const onDecrypt = () => {
    audio.play('click')
    triggerHaptic('medium')
    setHintMsg(`WORD_CONTEXT: ${wordHint}`)
    setTimeout(() => setHintMsg(null), 4000)
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full max-w-7xl h-full relative p-4">
      
      {/* Mobile Actions Sidebar (Minimized) */}
      <div className="fixed right-4 bottom-32 flex flex-col gap-6 md:hidden z-50">
        <motion.button 
          whileTap={INTERACTIVE_VARIANTS.tap}
          onClick={onDecrypt} 
          className="flex flex-col items-center gap-1 group"
        >
            <div className="p-4 bg-chaos-green/20 rounded-full backdrop-blur-xl text-chaos-green group-active:scale-90 transition-all">
                <Cpu size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase">DECRYPT</span>
        </motion.button>
      </div>

      {/* LEFT: Cluster Status */}
      {isMultiplayer && (
        <div className="hidden lg:flex flex-col gap-4 w-64 glass-panel p-8 rounded-[2rem] border-white/5 backdrop-blur-3xl">
            <h3 className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-6">Neural Cluster Status</h3>
            <div className="space-y-6">
                {players.map(player => (
                    <div key={player.id} className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="flex items-center gap-2 uppercase tracking-tighter">
                                {player.isHost ? <Bot size={12}/> : <User size={12}/>} 
                                {player.name}
                            </span>
                            <span className="text-chaos-green">{Math.min(30 + (guesses.length * 15), 100)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                animate={{ width: `${Math.min(30 + (guesses.length * 15), 100)}%` }}
                                className={`h-full ${player.isHost ? 'bg-chaos-green' : 'bg-chaos-red'} shadow-[0_0_10px_rgba(0,255,136,0.3)]`}
                            />
                        </div>
                        
                        {/* OPPONENT POV MINI GRID */}
                        {player.id !== 'me' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <MiniGrid 
                                    guesses={player.gridState || []} 
                                    targetWord={targetWord} 
                                    difficulty={difficulty} 
                                    maxAttempts={maxAttempts} 
                                />
                            </motion.div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* CENTER: Game */}
      <div className="flex flex-col items-center flex-grow">
        <div className="w-full flex justify-between items-end px-4 mb-8">
          <div className="text-left">
            <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mb-1">Pulse Sync</div>
            <div className="text-3xl font-black italic neon-text">{wordTimer}</div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className={`font-black text-6xl italic leading-none ${timeLeft < 20 ? 'text-chaos-red animate-pulse' : 'text-white'}`}>
              {formatTime()}
            </div>
            <div className="text-[9px] text-chaos-green font-mono uppercase tracking-[0.4em] mt-2">CYC: {difficulty} // {guesses.length}/{maxAttempts}</div>
          </div>

          <div className="text-right">
             <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mb-1">XP Gain</div>
             <div className="text-3xl font-black italic neon-text">{(guesses.length * 450).toLocaleString()}</div>
          </div>
        </div>

        <div className="relative group">
            <AnimatePresence>
                {godMode && (
                    <motion.div 
                        initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        className="absolute -top-12 left-0 right-0 text-center text-chaos-red font-black text-sm tracking-[0.5em] animate-pulse z-50"
                    >
                        GOD_MODE_ACTIVE // TARGET: {targetWord}
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="flex flex-col gap-2 p-10 rounded-[4rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl transition-transform group-hover:scale-[1.01]">
            {Array.from({ length: maxAttempts }).map((_, i) => (
                <Row 
                key={i} 
                word={i === guesses.length ? currentGuess : (guesses[i] || '')} 
                targetWord={targetWord} 
                isSubmitted={i < guesses.length} 
                difficulty={difficulty}
                />
            ))}
            </div>
        </div>

        <Keyboard usedLetters={usedLetters} onKey={onKey} />

        <AnimatePresence>
          {hintMsg && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              className="mt-6 px-8 py-4 glass-panel border-chaos-green/50 text-chaos-green font-black italic rounded-2xl shadow-2xl z-50 text-center max-w-sm"
            >
              {hintMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT: Desktop Tools */}
      <div className="hidden md:flex flex-col gap-6 w-80">
        <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 space-y-6 backdrop-blur-3xl shadow-xl">
           <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Cpu className="text-chaos-green" size={20} />
              <h3 className="font-black italic text-lg tracking-tight">SOLVER CORE</h3>
           </div>
           <motion.button 
             whileHover={INTERACTIVE_VARIANTS.hover}
             whileTap={INTERACTIVE_VARIANTS.tap}
             onClick={onDecrypt} 
             className="w-full py-5 bg-chaos-green/10 hover:bg-chaos-green/20 text-chaos-green rounded-2xl flex items-center justify-between px-6 font-black transition-all border border-chaos-green/10 shadow-lg shadow-chaos-green/5"
           >
              <span>DECRYPT PROTOCOL</span>
              <Zap size={16} />
           </motion.button>
           <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
               <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Protocol Tip</p>
               <p className="text-xs text-gray-300 font-medium leading-tight opacity-70">Use context clues from DECRYPT to bypass security layers faster.</p>
           </div>
        </div>

        <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 backdrop-blur-3xl shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-black italic text-lg tracking-tight uppercase">Session Data</h3>
                <User size={18} className="text-gray-500" />
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Efficiency</span>
                    <span className="text-white font-black italic">89%</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sync State</span>
                    <span className="text-chaos-green font-black italic">OPTIMAL</span>
                </div>
            </div>
        </div>
      </div>

      {/* Victory/Defeat Overlay */}
      <AnimatePresence>
        {status !== 'playing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4">
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-panel p-16 rounded-[4rem] max-w-lg w-full text-center space-y-10 border-white/10 shadow-[0_0_100px_rgba(0,255,136,0.1)]">
              <div className="space-y-2">
                <h2 className={`text-8xl font-black italic tracking-tighter ${status === 'won' ? 'text-chaos-green neon-text' : 'text-chaos-red'}`}>
                  {status === 'won' ? 'BYPASSED' : 'VOIDED'}
                </h2>
                <p className="text-gray-400 font-mono text-[10px] tracking-[0.8em] uppercase leading-none">Access Terminated</p>
              </div>

              <div className="space-y-3 bg-white/5 p-8 rounded-[3.5rem] border border-white/5 shadow-inner">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Neural Target</p>
                <p className="text-6xl font-black tracking-[0.2em] text-white underline decoration-chaos-green decoration-4 underline-offset-8 uppercase">{targetWord}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Time Sync</div>
                  <div className="text-2xl font-black italic">{formatTime()}</div>
                </div>
                <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">XP Gain</div>
                  <div className="text-2xl font-black italic">+{status === 'won' ? '5.2k' : '0'}</div>
                </div>
              </div>

              <motion.button 
                whileHover={INTERACTIVE_VARIANTS.hover}
                whileTap={INTERACTIVE_VARIANTS.tap}
                onClick={onBack} 
                className="w-full py-8 bg-white text-black font-black text-3xl rounded-[2.5rem] transition-all shadow-2xl"
              >
                REBOOT SYSTEM
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
