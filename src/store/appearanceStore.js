import { defineStore } from 'pinia';

const DEFAULTS = {
    enableCustomBackground: false,
    backgroundImage: '',
    backgroundBlur: 22,
    backgroundDim: 0.35,
    enableAudioVisualizer: false,
    visualizerColor: '#ffffff',
    visualizerOpacity: 0.55,
    visualizerFftSize: 512,
    visualizerSmoothing: 0.85,
};

export const useAppearanceStore = defineStore('appearanceStore', {
    state: () => ({
        ...DEFAULTS,
    }),
    actions: {
        resetBackground() {
            this.backgroundImage = DEFAULTS.backgroundImage;
            this.enableCustomBackground = DEFAULTS.enableCustomBackground;
            this.backgroundBlur = DEFAULTS.backgroundBlur;
            this.backgroundDim = DEFAULTS.backgroundDim;
        },
        resetVisualizer() {
            this.enableAudioVisualizer = DEFAULTS.enableAudioVisualizer;
            this.visualizerColor = DEFAULTS.visualizerColor;
            this.visualizerOpacity = DEFAULTS.visualizerOpacity;
            this.visualizerFftSize = DEFAULTS.visualizerFftSize;
            this.visualizerSmoothing = DEFAULTS.visualizerSmoothing;
        },
    },
    persist: {
        storage: localStorage,
        paths: [
            'enableCustomBackground',
            'backgroundImage',
            'backgroundBlur',
            'backgroundDim',
            'enableAudioVisualizer',
            'visualizerColor',
            'visualizerOpacity',
            'visualizerFftSize',
            'visualizerSmoothing',
        ],
    },
});

