<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Howler } from 'howler';
import { usePlayerStore } from '@/store/playerStore';

const playerStore = usePlayerStore();
const canvasRef = ref(null);
let analyser = null;
let freqData = null;
let animationId = null;
let resizeObserver = null;
let analyserConnected = false;

const barCount = computed(() => Math.max(1, Math.round(playerStore.lyricVisualizerBarCount)));

const ensureAnalyser = () => {
    if (!Howler.ctx || !Howler.masterGain) return null;
    if (!analyser) {
        analyser = Howler.ctx.createAnalyser();
        analyser.fftSize = 2048;
    }
    analyser.smoothingTimeConstant = Math.min(
        0.95,
        Math.max(0, Number(playerStore.lyricVisualizerTransitionDelay) || 0)
    );
    if (!analyserConnected) {
        try {
            Howler.masterGain.connect(analyser);
            analyserConnected = true;
        } catch (_) {
            // ignore connect errors
        }
    }
    if (!freqData || freqData.length !== analyser.frequencyBinCount) {
        freqData = new Uint8Array(analyser.frequencyBinCount);
    }
    return analyser;
};

const stopVisualizer = () => {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
    const canvas = canvasRef.value;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
};

const pickFrequencies = (data, count) => {
    const ctx = Howler.ctx;
    const nyquist = (ctx && ctx.sampleRate ? ctx.sampleRate : 48000) / 2;
    const minFreq = Math.max(20, Math.min(nyquist, Number(playerStore.lyricVisualizerFrequencyMin) || 20));
    const maxFreq = Math.max(minFreq + 10, Math.min(nyquist, Number(playerStore.lyricVisualizerFrequencyMax) || nyquist));

    const minIndex = Math.floor((minFreq / nyquist) * data.length);
    const maxIndex = Math.max(minIndex + 1, Math.floor((maxFreq / nyquist) * data.length));
    const slice = data.slice(minIndex, maxIndex);
    const bucketSize = Math.max(1, Math.floor(slice.length / count));
    const result = [];
    for (let i = 0; i < count; i++) {
        const start = i * bucketSize;
        const end = Math.min(slice.length, start + bucketSize);
        let sum = 0;
        for (let j = start; j < end; j++) sum += slice[j];
        result.push(sum / Math.max(1, end - start));
    }
    return result;
};

const drawBars = (ctx, width, height, values) => {
    const gap = Math.max(1, Math.floor(width / (values.length * 2)));
    const barWidth = Math.max(1, Number(playerStore.lyricVisualizerBarWidth) || 1);
    const color = playerStore.lyricVisualizerColor === 'white' ? '255,255,255' : '0,0,0';
    const opacity = Math.max(0, Math.min(1, (Number(playerStore.lyricVisualizerOpacity) || 100) / 100));

    const totalBarWidth = barWidth * values.length + gap * (values.length - 1);
    const startX = Math.max(0, (width - totalBarWidth) / 2);

    ctx.fillStyle = `rgba(${color}, ${opacity})`;
    values.forEach((value, index) => {
        const normalized = value / 255;
        const barHeight = normalized * height;
        const x = startX + index * (barWidth + gap);
        const y = height - barHeight;
        ctx.fillRect(x, y, barWidth, barHeight);
    });
};

const drawRadial = (ctx, width, height, values) => {
    const size = Math.max(10, Math.min(400, Number(playerStore.lyricVisualizerRadialSize) || 100));
    const offsetX = Math.max(-100, Math.min(100, Number(playerStore.lyricVisualizerRadialOffsetX) || 0));
    const offsetY = Math.max(-100, Math.min(100, Number(playerStore.lyricVisualizerRadialOffsetY) || 0));
    const coreSize = Math.max(10, Math.min(95, Number(playerStore.lyricVisualizerRadialCoreSize) || 62));
    const radius = (Math.min(width, height) / 2) * (size / 100);
    const cx = width / 2 + (offsetX / 100) * (width / 2);
    const cy = height / 2 + (offsetY / 100) * (height / 2);
    const color = playerStore.lyricVisualizerColor === 'white' ? '255,255,255' : '0,0,0';
    const opacity = Math.max(0, Math.min(1, (Number(playerStore.lyricVisualizerOpacity) || 100) / 100));

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = `rgba(${color}, ${opacity})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, (radius * coreSize) / 100, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();

    const count = values.length;
    const step = (Math.PI * 2) / count;
    values.forEach((value, idx) => {
        const angle = idx * step;
        const normalized = value / 255;
        const lineLength = radius * normalized;
        const x0 = Math.cos(angle) * ((radius * coreSize) / 100);
        const y0 = Math.sin(angle) * ((radius * coreSize) / 100);
        const x1 = Math.cos(angle) * ((radius * coreSize) / 100 + lineLength);
        const y1 = Math.sin(angle) * ((radius * coreSize) / 100 + lineLength);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.closePath();
    });
    ctx.restore();
};

const resizeCanvas = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const parentWidth = canvas.parentElement?.clientWidth || 0;
    canvas.width = parentWidth;
    canvas.height = Math.max(50, Number(playerStore.lyricVisualizerHeight) || 220);
};

const renderFrame = () => {
    const canvas = canvasRef.value;
    const analyserNode = ensureAnalyser();
    if (!canvas || !analyserNode) {
        stopVisualizer();
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resizeCanvas();
    analyserNode.getByteFrequencyData(freqData);

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const values = pickFrequencies(freqData, barCount.value);
    if (playerStore.lyricVisualizerStyle === 'radial') {
        drawRadial(ctx, width, height, values);
    } else {
        drawBars(ctx, width, height, values);
    }

    animationId = requestAnimationFrame(renderFrame);
};

const startVisualizer = () => {
    stopVisualizer();
    resizeCanvas();
    renderFrame();
};

onMounted(() => {
    watch(
        () => [
            playerStore.lyricVisualizer,
            playerStore.lyricVisualizerStyle,
            playerStore.lyricVisualizerHeight,
            playerStore.lyricVisualizerBarCount,
            playerStore.lyricVisualizerBarWidth,
            playerStore.lyricVisualizerFrequencyMin,
            playerStore.lyricVisualizerFrequencyMax,
            playerStore.lyricVisualizerOpacity,
            playerStore.lyricVisualizerTransitionDelay,
            playerStore.lyricVisualizerRadialSize,
            playerStore.lyricVisualizerRadialOffsetX,
            playerStore.lyricVisualizerRadialOffsetY,
            playerStore.lyricVisualizerRadialCoreSize,
            playerStore.lyricVisualizerColor,
        ],
        () => {
            if (playerStore.lyricVisualizer) startVisualizer();
            else stopVisualizer();
        },
        { immediate: true }
    );

    resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (canvasRef.value?.parentElement) {
        resizeObserver.observe(canvasRef.value.parentElement);
    }
});

onBeforeUnmount(() => {
    stopVisualizer();
    if (resizeObserver && canvasRef.value?.parentElement) {
        resizeObserver.unobserve(canvasRef.value.parentElement);
    }
    try {
        analyser?.disconnect?.();
    } catch (_) {
        // ignore
    }
});
</script>

<template>
    <div
        class="lyric-visualizer"
        :style="{
            height: `${Math.max(50, Number(playerStore.lyricVisualizerHeight) || 220)}px`,
            opacity: Math.max(0, Math.min(1, (Number(playerStore.lyricVisualizerOpacity) || 100) / 100)),
        }"
    >
        <canvas ref="canvasRef"></canvas>
    </div>
</template>

<style scoped>
.lyric-visualizer {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.35);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
}

canvas {
    width: 100%;
    height: 100%;
}
</style>
