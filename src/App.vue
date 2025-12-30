<script setup>
import Home from './views/Home.vue';
import Title from './components/Title.vue';
import SearchInput from './components/SearchInput.vue';
import WindowControl from './components/WindowControl.vue';
import MusicWidget from './components/MusicWidget.vue';
import MusicPlayer from './views/MusicPlayer.vue';
import VideoPlayer from './components/VideoPlayer.vue';
import ContextMenu from './components/ContextMenu.vue';
import GlobalDialog from './components/GlobalDialog.vue';
import GlobalNotice from './components/GlobalNotice.vue';
import Update from './components/Update.vue';
import { initDesktopLyric } from './utils/desktopLyric';
import { onMounted, computed } from 'vue';

import { usePlayerStore } from './store/playerStore';
import { useOtherStore } from './store/otherStore';

const playerStore = usePlayerStore();
const otherStore = useOtherStore();

const toBackgroundUrl = (path) => {
    if (!path) return null;
    if (/^(https?:)?\/\//.test(path) || path.startsWith('file://') || path.startsWith('data:')) return path;
    const normalized = path.replace(/\\/g, '/');
    return `file://${normalized}`;
};

const customBackgroundActive = computed(() => playerStore.customBackgroundEnabled && !!playerStore.customBackgroundImage);
const backgroundStyle = computed(() => {
    if (!customBackgroundActive.value) return {};
    const blurValue = playerStore.backgroundBlurEnabled ? Number(playerStore.customBackgroundBlur || 0) : 0;
    const brightness = Number(playerStore.customBackgroundBrightness || 100);
    return {
        backgroundImage: `url('${toBackgroundUrl(playerStore.customBackgroundImage)}')`,
        backgroundSize: playerStore.customBackgroundMode === 'contain' ? 'contain' : 'cover',
        filter: `blur(${blurValue}px) brightness(${brightness}%)`,
    };
});

onMounted(() => {
    initDesktopLyric();
});

windowApi.checkUpdate((event, version) => {
    otherStore.toUpdate = true;
    otherStore.newVersion = version;
});

// 双击标题栏最大化窗口的处理函数
const handleTitleBarDoubleClick = () => {
    windowApi.windowMax('window-max');
};
</script>

<template>
    <div class="background-layer" :class="{ 'is-active': customBackgroundActive }" :style="backgroundStyle"></div>
    <div class="mainWindow" :class="{ 'custom-background-active': customBackgroundActive }">
        <Transition name="home">
            <Home class="home" v-show="playerStore.widgetState"></Home>
        </Transition>
    </div>
    <div class="globalWidget">
        <Title class="widget-title"></Title>
        <SearchInput class="widget-search"></SearchInput>
    </div>
    <div class="dragBar" @dblclick="handleTitleBarDoubleClick">
        <WindowControl class="window-control"></WindowControl>
    </div>
    <Transition name="widget">
        <div class="musicWidget" v-if="playerStore.songList" v-show="playerStore.widgetState">
            <MusicWidget></MusicWidget>
        </div>
    </Transition>
    <Transition name="player">
        <div class="musicPlayer" :class="{ 'custom-background-active': customBackgroundActive }" v-if="playerStore.songList" v-show="!playerStore.widgetState">
            <MusicPlayer></MusicPlayer>
        </div>
    </Transition>
    <Transition name="video">
        <div class="videoPlayer" v-if="otherStore.videoPlayerShow">
            <VideoPlayer></VideoPlayer>
        </div>
    </Transition>
    <div class="contextMune">
        <ContextMenu></ContextMenu>
    </div>
    <div class="globalDialog">
        <GlobalDialog></GlobalDialog>
    </div>
    <div class="globalNotice">
        <GlobalNotice></GlobalNotice>
    </div>
    <Transition name="fade">
        <div class="update" v-if="otherStore.toUpdate">
            <Update></Update>
        </div>
    </Transition>
</template>

<style lang="scss">
#app {
    user-select: none;
    margin: 0;
    padding: 0;
    max-width: 100%;
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
.background-layer {
    position: fixed;
    inset: 0;
    background: linear-gradient(rgba(176, 209, 217, 0.9) -20%, rgba(176, 209, 217, 0.4) 50%, rgba(176, 209, 217, 0.9) 120%);
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0;
    filter: brightness(100%);
    transition: opacity 0.35s ease, filter 0.35s ease, background-image 0.35s ease;
    z-index: 0;
    pointer-events: none;
}
.background-layer.is-active {
    opacity: 1;
}
.mainWindow {
    width: 100%;
    height: 100%;
    background: linear-gradient(rgba(176, 209, 217, 0.9) -20%, rgba(176, 209, 217, 0.4) 50%, rgba(176, 209, 217, 0.9) 120%);
    opacity: 0;
    animation: mainWindows-starting 0.8s cubic-bezier(0.14, 0.91, 0.58, 1) forwards;
    @keyframes mainWindows-starting {
        0% {
            background-color: rgba(222, 235, 239, 1);
            opacity: 0;
            transform: scale(1.3);
        }
        100% {
            background-color: rgb(255, 255, 255);
            opacity: 1;
            transform: scale(1);
        }
    }
    .home {
        height: calc(100% - 78px);
    }
}
.mainWindow.custom-background-active,
.musicPlayer.custom-background-active {
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(8px);
}
.globalWidget {
    display: flex;
    flex-direction: row;
    align-items: center;
    position: absolute;
    top: 22px;
    z-index: 999;
    left: 45px; // 所有平台保持统一的布局位置

    .widget-title {
        &:hover {
            cursor: pointer;
        }
    }
    .widget-search {
        margin-left: 30px;
    }
}
.dragBar {
    width: 100%;
    height: 35px;
    background: transparent;
    position: fixed;
    top: 0;
    z-index: 999;
    -webkit-app-region: drag;
    .window-control {
        position: fixed;
        top: 13px;
        -webkit-app-region: no-drag;
        z-index: 999;

        // macOS 按钮在左侧
        &.macos {
            left: 15px;
            top: 11px; // 稍微调整高度使其更居中
        }

        // Windows/Linux 按钮在右侧
        &.windows {
            right: 15px;
        }
    }
}
.musicWidget {
    width: 680px;
    height: 65px;
    position: fixed;
    left: 50%;
    bottom: 35px;
    transform: translateX(-50%);
    box-shadow: 0 0 15px 2px rgba(189, 189, 189, 0.1);
}
.musicPlayer {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
}
.videoPlayer {
    width: 100%;
    height: 100%;
    position: fixed;
    pointer-events: none;
    z-index: 999;
}
.globalNotice {
    bottom: 120px;
    position: fixed;
    z-index: 999;
}
.update {
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.1);
    position: fixed;
    z-index: 999;
}

.home-enter-active,
.home-leave-active {
    transition: 0.4s cubic-bezier(0.14, 0.91, 0.58, 1);
}

.home-enter-from,
.home-leave-to {
    transform: scale(0.9);
    opacity: 0;
}

.widget-enter-active,
.widget-leave-active {
    transition: 0.5s cubic-bezier(0.14, 0.91, 0.58, 1);
}

.widget-enter-from,
.widget-leave-to {
    bottom: -70px;
}

.player-enter-active,
.player-leave-active {
    transition: 0.5s cubic-bezier(0.14, 0.91, 0.58, 1);
}

.player-enter-from,
.player-leave-to {
    transform: translateY(100%);
}
.video-enter-active,
.video-leave-active {
    transition: 0.1s;
}

.video-enter-from,
.video-leave-to {
    transform: scale(0.8);
    opacity: 0;
}
.fade-enter-active {
    transition: 0.4s;
}
.fade-leave-active {
    transition: 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
