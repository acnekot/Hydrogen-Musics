import { defineStore } from 'pinia'

export const useAppearanceStore = defineStore('appearanceStore', {
    state: () => ({
        useCustomBackground: false,
        backgroundImage: null,
        backgroundBlur: 10,
        backgroundBrightness: 80,
        playerBackgroundEnabled: true,
    }),
    actions: {
        setBackgroundImage(image) {
            this.backgroundImage = image
        },
        setBlur(value) {
            this.backgroundBlur = value
        },
        setBrightness(value) {
            this.backgroundBrightness = value
        },
    },
    persist: {
        storage: localStorage,
        pick: ['useCustomBackground', 'backgroundImage', 'backgroundBlur', 'backgroundBrightness', 'playerBackgroundEnabled']
    }
})
