<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Howler } from 'howler';
import { usePlayerStore } from '@/store/playerStore';
import { storeToRefs } from 'pinia';

const props = defineProps({
    active: {
        type: Boolean,
        default: false,
    },
    hidden: {
        type: Boolean,
        default: false,
    },
});

const canvasRef = ref(null);
let analyser = null;
let dataArray = null;
let animationId = null;
let connected = false;
let barValues = [];
let activeColor = 'rgba(255, 255, 255, 0.5)';
let inactiveColor = 'rgba(255, 255, 255, 0.2)';
let themeObserver = null;

const playerStore = usePlayerStore();
const { playing } = storeToRefs(playerStore);

const shouldAnimate = computed(() => props.active && playing.value && !props.hidden);

function toRGBA(color, alpha = 0.6) {
    if (!color) return `rgba(255,255,255,${alpha})`;
    const trimmed = color.trim();
    const clamp = v => Math.min(Math.max(v, 0), 255);
    if (trimmed.startsWith('#')) {
        const hex = trimmed.slice(1);
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return `rgba(${clamp(r)},${clamp(g)},${clamp(b)},${alpha})`;
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${clamp(r)},${clamp(g)},${clamp(b)},${alpha})`;
        }
    }
    if (trimmed.startsWith('rgb')) {
        const nums = trimmed.replace(/rgba?\(/, '').replace(')', '').split(',').map(n => Number(n));
        const [r = 255, g = 255, b = 255] = nums;
        return `rgba(${clamp(r)},${clamp(g)},${clamp(b)},${alpha})`;
    }
    return `rgba(255,255,255,${alpha})`;
}

function updateColors() {
    try {
        const styles = getComputedStyle(document.documentElement);
        const textColor = styles.getPropertyValue('--text');
        activeColor = toRGBA(textColor, 0.6);
        inactiveColor = toRGBA(textColor, 0.18);
    } catch (_) {
        activeColor = 'rgba(255,255,255,0.6)';
        inactiveColor = 'rgba(255,255,255,0.2)';
    }
}

function ensureAnalyser() {
    if (analyser || !Howler.ctx || !Howler.masterGain) return;
    analyser = Howler.ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    barValues = new Array(60).fill(0);
    try {
        Howler.masterGain.connect(analyser);
        connected = true;
    } catch (error) {
        connected = false;
    }
}

function cleanup() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (analyser && connected) {
        try {
            Howler.masterGain.disconnect(analyser);
        } catch (_) {}
    }
    analyser = null;
    connected = false;
    dataArray = null;
    barValues = [];
}

function drawFrame() {
    animationId = requestAnimationFrame(drawFrame);
    const canvas = canvasRef.value;
    if (!canvas || !analyser || !dataArray) {
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * dpr;
    const height = canvas.clientHeight * dpr;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    analyser.getByteFrequencyData(dataArray);

    const barCount = barValues.length;
    const sampleStep = Math.max(1, Math.floor(dataArray.length / barCount));

    for (let i = 0; i < barCount; i++) {
        const raw = dataArray[i * sampleStep] / 255;
        const target = shouldAnimate.value ? raw : raw * 0.2;
        barValues[i] += (target - barValues[i]) * (shouldAnimate.value ? 0.3 : 0.12);
    }

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);

    const radius = Math.min(width, height) * 0.32;
    const maxLen = Math.min(width, height) * 0.26;
    const baseLen = Math.min(width, height) * 0.1;
    const lineWidth = Math.min(width, height) * 0.012;

    ctx.lineCap = 'round';
    const color = shouldAnimate.value ? activeColor : inactiveColor;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.shadowBlur = Math.min(width, height) * 0.04;
    ctx.shadowColor = color;

    const totalBars = barCount;
    for (let i = 0; i < totalBars; i++) {
        const value = barValues[i];
        const angle = (i / totalBars) * Math.PI * 2;
        const length = baseLen + Math.pow(value, 1.2) * maxLen;
        const innerRadius = radius - baseLen * 0.3;
        const x0 = Math.cos(angle) * innerRadius;
        const y0 = Math.sin(angle) * innerRadius;
        const x1 = Math.cos(angle) * (innerRadius + length);
        const y1 = Math.sin(angle) * (innerRadius + length);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }

    ctx.restore();
}

onMounted(() => {
    updateColors();
    ensureAnalyser();
    drawFrame();
    try {
        themeObserver = new MutationObserver(() => updateColors());
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    } catch (_) {
        themeObserver = null;
    }
});

onUnmounted(() => {
    try {
        themeObserver?.disconnect();
    } catch (_) {}
    themeObserver = null;
    cleanup();
});

watch(shouldAnimate, () => {
    if (!shouldAnimate.value && analyser) {
        // allow smooth fade-out by keeping animation running
        return;
    }
    if (shouldAnimate.value && !analyser) {
        ensureAnalyser();
    }
});
</script>

<template>
    <canvas ref="canvasRef" class="audio-visualizer"></canvas>
</template>

<style scoped>
.audio-visualizer {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0.85;
    transition: opacity 0.25s ease;
}
</style>
