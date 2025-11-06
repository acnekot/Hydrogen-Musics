<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useOtherStore } from '@/store/otherStore';
import { storeToRefs } from 'pinia';

const otherStore = useOtherStore();
const {
    customBackgroundEnabled,
    customBackgroundImage,
    customBackgroundBlur,
    customBackgroundMaskOpacity,
} = storeToRefs(otherStore);

const prefersDarkMedia = window.matchMedia?.('(prefers-color-scheme: dark)') || null;
const prefersDark = ref(prefersDarkMedia ? prefersDarkMedia.matches : false);

const updateDark = () => {
    prefersDark.value = prefersDarkMedia ? prefersDarkMedia.matches : prefersDark.value;
};

onMounted(() => {
    try {
        prefersDarkMedia?.addEventListener('change', updateDark);
    } catch (_) {
        try {
            prefersDarkMedia?.addListener?.(updateDark);
        } catch (_) {}
    }
});

onBeforeUnmount(() => {
    try {
        prefersDarkMedia?.removeEventListener('change', updateDark);
    } catch (_) {
        try {
            prefersDarkMedia?.removeListener?.(updateDark);
        } catch (_) {}
    }
});

const showBackground = computed(() => customBackgroundEnabled.value && !!customBackgroundImage.value);

function clamp(value, min, max) {
    if (typeof value !== 'number' || Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
}

const imageStyle = computed(() => {
    if (!showBackground.value) return {};
    const blur = clamp(customBackgroundBlur.value ?? 0, 0, 120);
    return {
        backgroundImage: `url(${customBackgroundImage.value})`,
        filter: `blur(${blur}px)`
    };
});

const maskStyle = computed(() => {
    if (!showBackground.value) return {};
    const opacity = clamp(customBackgroundMaskOpacity.value ?? 0.35, 0, 0.9);
    const darkAlpha = prefersDark.value ? Math.min(opacity + 0.1, 0.95) : opacity;
    return {
        backgroundColor: `rgba(0,0,0,${darkAlpha.toFixed(3)})`
    };
});
</script>

<template>
    <div v-if="showBackground" class="custom-background">
        <div class="custom-background__image" :style="imageStyle"></div>
        <div class="custom-background__mask" :style="maskStyle"></div>
    </div>
</template>

<style scoped>
.custom-background {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
}

.custom-background__image,
.custom-background__mask {
    position: absolute;
    inset: -6%;
    transition: filter 0.35s ease, opacity 0.35s ease, background-image 0.35s ease;
    will-change: transform, filter;
}

.custom-background__image {
    background-position: center;
    background-size: cover;
    transform: scale(1.05);
}

.custom-background__mask {
    inset: 0;
    transform: none;
    backdrop-filter: saturate(140%);
}
</style>
