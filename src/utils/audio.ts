import { Howl } from 'howler'

// Tactical / Cyberpunk Minimalist Sound Set
const SOUNDS = {
  click: 'https://cdn.freesound.org/previews/544/544053_12151120-lq.mp3', // Soft blip
  win: 'https://cdn.freesound.org/previews/337/337049_3232293-lq.mp3',   // Sci-fi success
  lose: 'https://cdn.freesound.org/previews/176/176653_1155071-lq.mp3',  // Error hum
  bonk: 'https://cdn.freesound.org/previews/415/415209_5121236-lq.mp3',  // Thud
  flip: 'https://cdn.freesound.org/previews/684/684124_11516244-lq.mp3'  // Mechanical click
}

class AudioManager {
  private sounds: Map<string, Howl> = new Map()

  constructor() {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      this.sounds.set(key, new Howl({ 
        src: [url], 
        volume: 0.3,
        preload: true
      }))
    })
  }

  play(name: keyof typeof SOUNDS) {
    const sound = this.sounds.get(name)
    if (sound) sound.play()
  }
}

export const audio = new AudioManager()
