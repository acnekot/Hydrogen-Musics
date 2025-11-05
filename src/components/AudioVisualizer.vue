<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import { getAnalyserNode, getFrequencyData, configureAnalyser } from '@/utils/visualizer';

const props = defineProps({
    enabled: {
        type: Boolean,
        default: false,
    },
    active: {
        type: Boolean,
        default: false,
    },
    color: {
        type: String,
        default: '#ffffff',
    },
    opacity: {
        type: Number,
        default: 0.55,
    },
    fftSize: {
        type: Number,
        default: 512,
    },
    smoothing: {
        type: Number,
        default: 0.85,
    },
});

const canvasRef = ref(null);
let ctx = null;
let animationFrame = null;
let resizeObserver = null;

const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

const shouldRender = computed(() => props.enabled && props.active);

watch(
    () => [props.fftSize, props.smoothing],
    () => {
        configureAnalyser({ fftSize: props.fftSize, smoothing: props.smoothing });
    },
    { immediate: true }
);

function applyCanvasSize() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (!width || !height) return;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
}

function draw() {
    animationFrame = window.requestAnimationFrame(draw);
    if (!ctx) return;

    const analyser = getAnalyserNode();
    if (!analyser || !shouldRender.value) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }

    const dataArray = getFrequencyData();
    if (!dataArray) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }

    const width = ctx.canvas.width / dpr;
    const height = ctx.canvas.height / dpr;
    ctx.clearRect(0, 0, width, height);

    const barCount = Math.min(64, Math.floor(dataArray.length / 2));
    if (!barCount) return;

    const step = Math.max(1, Math.floor(dataArray.length / barCount));
    const barWidth = width / (barCount + 8);
    const gap = barWidth * 0.4;
    const baseY = height;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(Math.max(props.opacity, 0), 1);
    ctx.fillStyle = props.color;

    for (let i = 0; i < barCount; i++) {
        const magnitude = dataArray[i * step] / 255;
        const power = Math.pow(magnitude, 1.5);
        const barHeight = Math.max(power * height, 2);
        const x = (barWidth + gap) * i + gap * 2;

        ctx.fillRect(x, baseY - barHeight, barWidth, barHeight);
        // Mirror for more balanced appearance
        const mirrorX = width - x - barWidth;
        ctx.fillRect(mirrorX, baseY - barHeight, barWidth, barHeight);
    }

    ctx.restore();
}

onMounted(() => {
    nextTick(() => {
        applyCanvasSize();

        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                applyCanvasSize();
            });
            if (canvasRef.value?.parentElement) {
                resizeObserver.observe(canvasRef.value.parentElement);
            }
        }

        draw();
    });
});

onBeforeUnmount(() => {
    if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    if (resizeObserver && canvasRef.value?.parentElement) {
        resizeObserver.unobserve(canvasRef.value.parentElement);
    }
    resizeObserver = null;
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
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: 0.9;
}
</style>

