import { Howler } from 'howler';

let analyser = null;
let frequencyData = null;
let isConnected = false;

function createAnalyser() {
    const ctx = Howler.ctx;
    const masterGain = Howler.masterGain;
    if (!ctx || !masterGain) return null;

    const node = ctx.createAnalyser();
    node.fftSize = 1024;
    node.minDecibels = -90;
    node.maxDecibels = -10;
    node.smoothingTimeConstant = 0.85;

    try {
        masterGain.connect(node);
        isConnected = true;
    } catch (error) {
        console.warn('连接音频分析器失败:', error);
    }

    frequencyData = new Uint8Array(node.frequencyBinCount);
    return node;
}

export function ensureVisualizerAnalyser() {
    if (analyser) return analyser;

    try {
        analyser = createAnalyser();
    } catch (error) {
        analyser = null;
        console.warn('初始化音频分析器失败:', error);
    }

    return analyser;
}

export function getAnalyserNode() {
    return ensureVisualizerAnalyser();
}

export function getFrequencyData() {
    const node = ensureVisualizerAnalyser();
    if (!node) return null;

    if (!frequencyData || frequencyData.length !== node.frequencyBinCount) {
        frequencyData = new Uint8Array(node.frequencyBinCount);
    }

    node.getByteFrequencyData(frequencyData);
    return frequencyData;
}

export function configureAnalyser({ smoothing, fftSize } = {}) {
    const node = ensureVisualizerAnalyser();
    if (!node) return;

    if (typeof smoothing === 'number') {
        node.smoothingTimeConstant = Math.min(Math.max(smoothing, 0), 0.99);
    }

    if (typeof fftSize === 'number') {
        const rounded = Math.pow(2, Math.round(Math.log2(fftSize)));
        const clamped = Math.min(Math.max(rounded, 32), 32768);
        if (node.fftSize !== clamped) {
            node.fftSize = clamped;
            frequencyData = new Uint8Array(node.frequencyBinCount);
        }
    }
}

export function teardownAnalyser() {
    if (!analyser) return;
    try {
        if (isConnected && Howler.masterGain) {
            Howler.masterGain.disconnect(analyser);
        }
    } catch (_) {
        // ignore disconnect errors
    }
    analyser = null;
    frequencyData = null;
    isConnected = false;
}

