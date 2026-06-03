import { Howl } from 'howler'

// Tactical / Cyberpunk Minimalist Sound Set
const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  lose: 'https://assets.mixkit.co/active_storage/sfx/250/250-preview.mp3',
  bonk: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  flip: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
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
