<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { getFrequencyData, resumeAudioContext } from '../utils/audioVisualizer';

const props = defineProps({
    playing: {
        type: Boolean,
        default: false,
    },
    bars: {
        type: Number,
        default: 48,
    },
});

const canvasRef = ref(null);
let ctx = null;
let frameId = null;
let currentValues = null;

function ensureCanvasSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * ratio));
    const height = Math.max(1, Math.floor(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
}

function drawFrame() {
    if (!canvasRef.value || !ctx) return;

    ensureCanvasSize(canvasRef.value);
    const width = canvasRef.value.width;
    const height = canvasRef.value.height;

    ctx.clearRect(0, 0, width, height);

    const frequency = getFrequencyData(props.bars);
    if (!currentValues || currentValues.length !== frequency.length) {
        currentValues = new Float32Array(frequency.length);
    }

    const smoothing = props.playing ? 0.25 : 0.08;
    for (let i = 0; i < frequency.length; i++) {
        const target = props.playing ? frequency[i] : 0;
        currentValues[i] += (target - currentValues[i]) * smoothing;
    }

    const barCount = frequency.length;
    const barGap = 2 * (window.devicePixelRatio || 1);
    const barWidth = Math.max(1, (width - (barCount - 1) * barGap) / barCount);

    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.28)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.55)');
    ctx.fillStyle = gradient;

    for (let i = 0; i < barCount; i++) {
        const value = currentValues[i] / 255;
        const barHeight = Math.max(height * 0.05, value * height);
        const x = i * (barWidth + barGap);
        const y = height - barHeight;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        } else {
            ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
    }

    frameId = window.requestAnimationFrame(drawFrame);
}

onMounted(() => {
    resumeAudioContext();
    if (canvasRef.value) {
        ctx = canvasRef.value.getContext('2d');
        drawFrame();
    }
});

onUnmounted(() => {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = null;
    ctx = null;
});
</script>

<template>
    <canvas ref="canvasRef" class="audio-visualizer"></canvas>
</template>

<style scoped>
.audio-visualizer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    opacity: 0.9;
    filter: blur(0.4px);
}
</style>
