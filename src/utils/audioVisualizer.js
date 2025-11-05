const MAX_BARS = 128;

let audioCtx = null;
let analyser = null;
let dataArray = null;
let sourceNode = null;
let silenceGain = null;

function ensureAudioContext() {
    if (typeof window === 'undefined') return null;
    if (audioCtx) return audioCtx;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
    return audioCtx;
}

function ensureAnalyser() {
    const ctx = ensureAudioContext();
    if (!ctx) return null;
    if (!analyser) {
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.85;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    if (!silenceGain) {
        silenceGain = ctx.createGain();
        silenceGain.gain.value = 0;
        analyser?.connect(silenceGain);
        silenceGain.connect(ctx.destination);
    }
    return analyser;
}

function detachSource() {
    if (sourceNode) {
        try {
            sourceNode.disconnect();
        } catch (_) {}
        sourceNode = null;
    }
}

export function bindHowlForAnalyser(howlInstance) {
    const analyserNode = ensureAnalyser();
    const ctx = audioCtx;
    if (!analyserNode || !ctx || !howlInstance) return;

    const sound = (howlInstance._sounds || []).find(item => item && item._node);
    const audioElement = sound ? sound._node : null;
    if (!audioElement) return;

    detachSource();

    try {
        if (typeof audioElement.captureStream === 'function') {
            const stream = audioElement.captureStream();
            if (stream) {
                sourceNode = ctx.createMediaStreamSource(stream);
                sourceNode.connect(analyserNode);
                return;
            }
        }
    } catch (error) {
        console.warn('captureStream 创建音频可视化源失败:', error);
    }

    if (ctx.createMediaElementSource) {
        try {
            if (!sound.__visualSource) {
                sound.__visualSource = ctx.createMediaElementSource(audioElement);
            }
            sourceNode = sound.__visualSource;
            sourceNode.connect(analyserNode);
        } catch (error) {
            console.warn('MediaElementSource 创建音频可视化源失败:', error);
        }
    }
}

export function resumeAudioContext() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
}

export function getFrequencyData(sampleSize = 64) {
    const analyserNode = ensureAnalyser();
    if (!analyserNode || !dataArray) {
        return new Uint8Array(sampleSize);
    }

    analyserNode.getByteFrequencyData(dataArray);

    const size = Math.min(sampleSize, MAX_BARS);
    const bucketSize = Math.max(1, Math.floor(dataArray.length / size));
    const result = new Uint8Array(size);

    for (let i = 0; i < size; i++) {
        let sum = 0;
        for (let j = 0; j < bucketSize; j++) {
            const value = dataArray[i * bucketSize + j];
            if (typeof value === 'number') sum += value;
        }
        result[i] = Math.round(sum / bucketSize);
    }

    return result;
}
