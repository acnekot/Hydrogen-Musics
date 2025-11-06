import { defineStore } from 'pinia';

const defaultBackground = Object.freeze({
    enabled: false,
    url: '',
    blur: 18,
    opacity: 0.75,
    tintOpacity: 0.4,
    tintColor: '#101522',
});

const defaultVisualizer = Object.freeze({
    enabled: false,
    barCount: 48,
    smoothing: 0.7,
    backgroundOpacity: 0.35,
    glowStrength: 0.45,
});

export const useAppearanceStore = defineStore('appearanceStore', {
    state: () => ({
        customBackground: { ...defaultBackground },
        lyricVisualizer: { ...defaultVisualizer },
    }),
    actions: {
        setCustomBackground(payload = {}) {
            this.customBackground = {
                ...this.customBackground,
                ...payload,
            };
        },
        resetCustomBackground() {
            this.customBackground = { ...defaultBackground };
        },
        setLyricVisualizerEnabled(enabled) {
            this.lyricVisualizer = {
                ...this.lyricVisualizer,
                enabled: !!enabled,
            };
        },
        updateLyricVisualizer(payload = {}) {
            this.lyricVisualizer = {
                ...this.lyricVisualizer,
                ...payload,
            };
        },
        resetLyricVisualizer() {
            this.lyricVisualizer = { ...defaultVisualizer };
        },
    },
    persist: {
        storage: localStorage,
        paths: ['customBackground', 'lyricVisualizer'],
    },
});
