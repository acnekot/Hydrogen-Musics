import { defineStore } from 'pinia'

const STORAGE_KEY = 'app.appearance'

const defaultState = () => ({
  enabled: false,
  image: '',
  blur: 0,
  brightness: 1,
  applyToPlayPageOnly: false,
  opacity: 1,
})

export const useAppearanceStore = defineStore('appearance', {
  state: defaultState,
  actions: {
    hydrate() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          Object.assign(this.$state, { ...defaultState(), ...parsed })
        }
      } catch (error) {
        console.error('Failed to hydrate appearance store', error)
        Object.assign(this.$state, defaultState())
      }
    },
    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.$state))
      } catch (error) {
        console.error('Failed to persist appearance store', error)
      }
    },
    setEnabled(value) {
      this.enabled = !!value
    },
    setImage(dataUrl) {
      this.image = dataUrl || ''
    },
    clearImage() {
      this.image = ''
    },
    setBlur(value) {
      const num = Math.min(30, Math.max(0, Number(value) || 0))
      this.blur = num
    },
    setBrightness(value) {
      const num = Math.min(1.8, Math.max(0.2, Number(value) || 0))
      this.brightness = num
    },
    setApplyToPlayPageOnly(value) {
      this.applyToPlayPageOnly = !!value
    },
    setOpacity(value) {
      const num = Math.min(1, Math.max(0, Number(value) || 0))
      this.opacity = num
    },
  },
})
