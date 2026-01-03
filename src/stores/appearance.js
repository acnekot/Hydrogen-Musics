import { defineStore } from 'pinia'

const defaultState = {
  enabled: false,
  image: '',
  blur: 0,
  brightness: 1,
  applyToPlayPageOnly: false,
  opacity: 1,
}

export const useAppearanceStore = defineStore('appearance', {
  state: () => ({
    ...defaultState,
  }),
  actions: {
    hydrate() {
      try {
        const saved = localStorage.getItem('app.appearance')
        if (saved) {
          const parsed = JSON.parse(saved)
          Object.assign(this, { ...defaultState, ...parsed })
          return
        }
      } catch (error) {
        console.error('Failed to hydrate appearance store:', error)
      }
      Object.assign(this, { ...defaultState })
    },
    persist() {
      const payload = {
        enabled: this.enabled,
        image: this.image,
        blur: this.blur,
        brightness: this.brightness,
        applyToPlayPageOnly: this.applyToPlayPageOnly,
        opacity: this.opacity,
      }
      try {
        localStorage.setItem('app.appearance', JSON.stringify(payload))
      } catch (error) {
        console.error('Failed to persist appearance store:', error)
      }
    },
    setEnabled(val) {
      this.enabled = val
    },
    setImage(val) {
      this.image = val
    },
    clearImage() {
      this.image = ''
    },
    setBlur(val) {
      this.blur = val
    },
    setBrightness(val) {
      this.brightness = val
    },
    setApplyToPlayPageOnly(val) {
      this.applyToPlayPageOnly = val
    },
    setOpacity(val) {
      this.opacity = val
    },
  },
})
