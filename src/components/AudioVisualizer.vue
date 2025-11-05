<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Howler } from 'howler';
import { usePlayerStore } from '../store/playerStore';
import { storeToRefs } from 'pinia';

const containerRef = ref(null);
const canvasRef = ref(null);
let analyser = null;
let dataArray = null;
let animationId = null;
let resizeObserver = null;
let connected = false;

const playerStore = usePlayerStore();
const { playing } = storeToRefs(playerStore);

const ensureAnalyser = () => {
    if (!Howler || !Howler.ctx || !Howler.masterGain) return null;
    if (!analyser) {
        analyser = Howler.ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    if (!connected) {
        try {
            Howler.masterGain.connect(analyser);
            connected = true;
        } catch (_) {
            // ignore duplicate connection errors
        }
    }
    return analyser;
};

const setCanvasSize = () => {
    const el = containerRef.value;
    const canvas = canvasRef.value;
    if (!el || !canvas) return;
    const rect = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }
};

const clearCanvas = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
};

const drawFrame = () => {
    const canvas = canvasRef.value;
    const ctx = canvas ? canvas.getContext('2d') : null;
    const analyserNode = ensureAnalyser();
    if (!canvas || !ctx || !analyserNode || !dataArray) {
        animationId = requestAnimationFrame(drawFrame);
        return;
    }
    analyserNode.getByteFrequencyData(dataArray);
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const baseRadius = Math.min(rect.width, rect.height) * 0.32;
    const bars = 64;
    const step = Math.max(1, Math.floor(dataArray.length / bars));

    for (let i = 0; i < bars; i++) {
        const magnitude = dataArray[i * step] / 255;
        const angle = (i / bars) * Math.PI * 2;
        const innerRadius = baseRadius * 0.85;
        const outerRadius = innerRadius + baseRadius * 0.7 * magnitude + 6;
        const startX = centerX + Math.cos(angle) * innerRadius;
        const startY = centerY + Math.sin(angle) * innerRadius;
        const endX = centerX + Math.cos(angle) * outerRadius;
        const endY = centerY + Math.sin(angle) * outerRadius;
        const alpha = 0.18 + magnitude * 0.65;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    animationId = requestAnimationFrame(drawFrame);
};

const start = () => {
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(drawFrame);
};

const stop = () => {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    clearCanvas();
};

watch(
    playing,
    (val) => {
        if (val) {
            start();
        } else {
            stop();
        }
    },
    { immediate: true }
);

onMounted(() => {
    ensureAnalyser();
    nextTick(() => {
        setCanvasSize();
        if (playing.value) {
            start();
        }
    });
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
            setCanvasSize();
        });
        if (containerRef.value) {
            resizeObserver.observe(containerRef.value);
        }
    }
});

onBeforeUnmount(() => {
    stop();
    if (resizeObserver && containerRef.value) {
        try { resizeObserver.unobserve(containerRef.value); } catch (_) {}
    }
    resizeObserver = null;
});
</script>

<template>
    <div ref="containerRef" class="visualizer">
        <canvas ref="canvasRef"></canvas>
    </div>
</template>

<style scoped>
.visualizer {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    padding: 1.5vh;
}
canvas {
    width: 100%;
    height: 100%;
    display: block;
    mix-blend-mode: screen;
    opacity: 0.9;
}
</style>
