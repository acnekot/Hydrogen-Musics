<template>
    <div class="lyric-visualizer">
        <div class="visualizer-background" :style="backgroundStyle"></div>
        <div class="visualizer-bars" aria-hidden="true">
            <div
                v-for="(value, index) in bars"
                :key="index"
                class="visualizer-bar"
                :style="getBarStyle(index, value)"
            ></div>
        </div>
        <div class="visualizer-lyrics">
            <Transition name="lyric-fade" mode="out-in">
                <p class="current-line" :key="currentLineKey" v-text="formattedCurrent"></p>
            </Transition>
            <Transition name="lyric-fade" mode="out-in">
                <p class="next-line" :key="nextLineKey" v-if="showNextLine" v-text="formattedNext"></p>
            </Transition>
        </div>
    </div>
</template>

<script setup>
import { Howler } from 'howler';
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { usePlayerStore } from '@/store/playerStore';
import { storeToRefs } from 'pinia';
import { useAppearanceStore } from '@/store/appearanceStore';

const props = defineProps({
    currentLine: {
        type: String,
        default: '',
    },
    nextLine: {
        type: String,
        default: '',
    },
});

const playerStore = usePlayerStore();
const { playing } = storeToRefs(playerStore);
const appearanceStore = useAppearanceStore();

const visualizerState = reactive({
    analyser: null,
    dataArray: null,
    frameId: 0,
    connected: false,
});

const bars = ref(new Array(Math.max(appearanceStore.lyricVisualizer.barCount || 48, 8)).fill(0));

const barCount = computed(() => {
    const count = Number.parseInt(appearanceStore.lyricVisualizer.barCount ?? 48, 10);
    return Number.isNaN(count) ? 48 : Math.min(Math.max(count, 16), 96);
});

watch(barCount, (count) => {
    if (!Array.isArray(bars.value) || bars.value.length !== count) {
        bars.value = new Array(count).fill(0);
    }
});

const formattedCurrent = computed(() => (props.currentLine || '').trim() || '♪♪♪');
const formattedNext = computed(() => (props.nextLine || '').trim());
const showNextLine = computed(() => !!formattedNext.value);

const currentLineKey = computed(() => `${formattedCurrent.value}-${playing.value ? 'p' : 's'}`);
const nextLineKey = computed(() => `${formattedNext.value}-${playing.value ? 'p' : 's'}`);

const backgroundStyle = computed(() => {
    const opacity = Math.min(Math.max(appearanceStore.lyricVisualizer.backgroundOpacity ?? 0.35, 0), 1);
    return {
        opacity,
    };
});

const glowStrength = computed(() => {
    const value = appearanceStore.lyricVisualizer.glowStrength ?? 0.45;
    return Math.min(Math.max(value, 0), 1);
});

const getBarStyle = (index, value) => {
    const normalized = Math.min(Math.max(value, 0), 1);
    const height = 18 + normalized * 82;
    const delay = (index / barCount.value) * 40;
    return {
        height: `${height}%`,
        transitionDelay: `${delay}ms`,
        boxShadow: `0 0 ${20 * glowStrength.value}px rgba(255, 255, 255, ${0.15 + glowStrength.value * 0.6})`,
        opacity: 0.25 + normalized * 0.75,
    };
};

const detachAnalyser = () => {
    cancelAnimationFrame(visualizerState.frameId);
    visualizerState.frameId = 0;
    if (visualizerState.analyser && visualizerState.connected) {
        try {
            Howler.masterGain?.disconnect(visualizerState.analyser);
        } catch (_) {}
    }
    visualizerState.connected = false;
    visualizerState.analyser?.disconnect?.();
    visualizerState.analyser = null;
    visualizerState.dataArray = null;
};

const updateBars = () => {
    if (!visualizerState.analyser || !visualizerState.dataArray) return;
    visualizerState.analyser.getByteFrequencyData(visualizerState.dataArray);
    const sliceLength = Math.floor(visualizerState.dataArray.length / barCount.value) || 1;
    const nextValues = new Array(barCount.value).fill(0).map((_, idx) => {
        let total = 0;
        const start = idx * sliceLength;
        for (let i = 0; i < sliceLength && start + i < visualizerState.dataArray.length; i++) {
            total += visualizerState.dataArray[start + i];
        }
        const avg = total / sliceLength;
        return Math.min(avg / 255, 1);
    });
    bars.value = nextValues;
    visualizerState.frameId = requestAnimationFrame(updateBars);
};

const attachAnalyser = () => {
    detachAnalyser();
    try {
        const ctx = Howler.ctx;
        if (!ctx || !Howler.masterGain) return;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = Math.min(Math.max(appearanceStore.lyricVisualizer.smoothing ?? 0.7, 0.2), 0.95);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        Howler.masterGain.connect(analyser);
        visualizerState.analyser = analyser;
        visualizerState.dataArray = dataArray;
        visualizerState.connected = true;
        updateBars();
    } catch (error) {
        console.warn('Lyric visualizer initialisation failed:', error);
    }
};

watch(
    () => appearanceStore.lyricVisualizer.smoothing,
    () => {
        if (visualizerState.analyser) {
            visualizerState.analyser.smoothingTimeConstant = Math.min(
                Math.max(appearanceStore.lyricVisualizer.smoothing ?? 0.7, 0.2),
                0.95,
            );
        }
    },
);

watch(
    () => appearanceStore.lyricVisualizer.enabled,
    (enabled) => {
        if (enabled) {
            attachAnalyser();
        } else {
            detachAnalyser();
        }
    },
    { immediate: true },
);

onMounted(() => {
    if (appearanceStore.lyricVisualizer.enabled) {
        attachAnalyser();
    }
});

onUnmounted(() => {
    detachAnalyser();
});
</script>

<style scoped lang="scss">
.lyric-visualizer {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 2vh;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 0;
}

.visualizer-background {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.45));
    filter: blur(20px);
    pointer-events: none;
    transition: opacity 0.4s ease;
}

.visualizer-bars {
    position: absolute;
    inset: 0;
    padding: 0 6%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(6px, 1fr));
    align-items: end;
    gap: 6px;
    opacity: 0.9;
}

.visualizer-bar {
    width: 100%;
    border-radius: 6px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.3) 60%, rgba(255, 255, 255, 0.12) 100%);
    transform-origin: bottom;
    transition: height 0.22s ease, opacity 0.2s ease;
}

.visualizer-lyrics {
    position: relative;
    z-index: 1;
    max-width: 76%;
    text-align: center;
    color: #fff;
    text-shadow: 0 12px 42px rgba(0, 0, 0, 0.6);
}

.current-line {
    font-size: 28px;
    font-weight: 600;
    letter-spacing: 0.04em;
    margin: 0;
}

.next-line {
    margin: 12px 0 0;
    font-size: 18px;
    opacity: 0.8;
}

.lyric-fade-enter-active,
.lyric-fade-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.lyric-fade-enter-from,
.lyric-fade-leave-to {
    opacity: 0;
    transform: translateY(8px);
}

@media screen and (max-width: 1280px) {
    .current-line {
        font-size: 22px;
    }
    .next-line {
        font-size: 16px;
    }
}
</style>
