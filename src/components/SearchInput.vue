<script setup>
  import { computed, onBeforeUnmount, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { noticeOpen } from '../utils/dialog'
  import { usePlayerStore } from '../store/playerStore'
  import { search } from '../api/other'
  import { mapSongsPlayableStatus } from '../utils/songStatus'
  import { addToList, addSong, setShuffledList } from '../utils/player'

  const playerStore = usePlayerStore()
  const router = useRouter()

  const searchInput = ref(null)
  const searchShow = ref(false)
  const suggestions = ref([])
  const suggestionLoading = ref(false)
  const suggestionError = ref('')
  let suggestionTimer = null

  const JTrim = (s = '') => s.replace(/(^\s*)|(\s*$)/g, '')

  const suggestionVisible = computed(() => {
    if (!searchShow.value) return false
    const value = searchInput.value?.value
    if (!JTrim(value || '')) return false
    return suggestionLoading.value || suggestions.value.length > 0 || !!suggestionError.value
  })

  const clearSuggestionTimer = () => {
    if (suggestionTimer) {
      clearTimeout(suggestionTimer)
      suggestionTimer = null
    }
  }

  const hideSuggestions = () => {
    clearSuggestionTimer()
    suggestionLoading.value = false
    suggestionError.value = ''
    suggestions.value = []
  }

  const scheduleSuggestionUpdate = (value) => {
    clearSuggestionTimer()
    const keyword = JTrim(value || '')
    if (!keyword) {
      suggestions.value = []
      suggestionError.value = ''
      return
    }
    suggestionLoading.value = true
    suggestionTimer = setTimeout(async () => {
      try {
        const result = await search({ keywords: keyword, type: 1, limit: 6 })
        const songs = mapSongsPlayableStatus(result?.result?.songs || [])
        suggestions.value = songs
        suggestionError.value = songs.length ? '' : '未找到相关歌曲'
      } catch (_) {
        suggestionError.value = '获取搜索建议失败'
        suggestions.value = []
      } finally {
        suggestionLoading.value = false
      }
    }, 260)
  }

  const searchFoucs = (event, state) => {
    if (state === 'focus') {
      event.target.placeholder = ''
      searchShow.value = true
      windowApi.unregisterShortcuts()
      if (event.target.value) scheduleSuggestionUpdate(event.target.value)
    } else {
      windowApi.registerShortcuts()
      event.target.placeholder = 'SEARCH'
      searchShow.value = false
      setTimeout(() => hideSuggestions(), 150)
    }
  }

  const searchInfo = (keyword) => {
    const value = JTrim(keyword ?? searchInput.value?.value ?? '')
    if (!value) {
      noticeOpen('输入不能为空', 2)
      return
    }
    router.push({ name: 'search', query: { keywords: value } })
    if (!playerStore.widgetState) {
      playerStore.widgetState = true
      playerStore.lyricShow = false
      if (playerStore.videoIsPlaying) playerStore.videoIsPlaying = false
    }
    hideSuggestions()
  }

  const handleInput = (event) => {
    scheduleSuggestionUpdate(event.target.value)
  }

  const formatArtists = (artists = []) => {
    if (!Array.isArray(artists) || !artists.length) return '未知歌手'
    return artists.map(ar => ar.name).join('/')
  }

  const playSuggestion = (song) => {
    if (!song) return
    if (song.playable === false) {
      noticeOpen(`当前歌曲无法播放${song.reason ? ' - ' + song.reason : ''}`, 2)
      return
    }
    addToList('search-suggestion', [song])
    addSong(song.id, 0, true)
    if (playerStore.playMode === 3) setShuffledList()
    playerStore.widgetState = false
    playerStore.lyricShow = true
    if (playerStore.videoIsPlaying) playerStore.videoIsPlaying = false
    hideSuggestions()
  }

  const handleSuggestionSearch = () => {
    searchInfo(searchInput.value?.value)
  }

  onBeforeUnmount(() => clearSuggestionTimer())
</script>

<template>
  <Transition name="fade">
    <div :class="{ 'search-container': true, 'search-container-foucs': searchShow }" v-show="playerStore.playerShow">
      <input
        class="search-input"
        type="text"
        ref="searchInput"
        @input="handleInput($event)"
        @keyup.enter="searchInfo()"
        @focus="searchFoucs($event, 'focus')"
        @blur="searchFoucs($event, 'blur')"
        placeholder="SEARCH"
        spellcheck="false"
      />
      <div class="search-border search-border1"></div>
      <div class="search-border search-border2"></div>
      <div class="search-border search-border3"></div>
      <div class="search-border search-border4"></div>
      <div class="search-border-2 search-border5"></div>
      <div class="search-border-2 search-border6"></div>
      <div class="search-border-2 search-border7"></div>
      <div class="search-border-2 search-border8"></div>
      <Transition name="fade">
        <div class="suggestion-panel" v-if="suggestionVisible" @mousedown.prevent>
          <div class="suggestion-loading" v-if="suggestionLoading">正在加载…</div>
          <div class="suggestion-empty" v-else-if="suggestionError">{{ suggestionError }}</div>
          <template v-else>
            <div
              v-for="item in suggestions"
              :key="item.id"
              class="suggestion-item"
              @mousedown.prevent="playSuggestion(item)"
            >
              <div class="suggestion-title">{{ item.name }}</div>
              <div class="suggestion-sub">{{ formatArtists(item.ar) }}</div>
            </div>
            <div class="suggestion-more" @mousedown.prevent="handleSuggestionSearch">查看全部结果</div>
          </template>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
  $boderpx: 2 + Px;
  $boderPosition: -1Px;
  .search-container {
    width: 130Px;
    height: 20Px;
    position: relative;
    bottom: -3px;
    display: flex;
    flex-direction: column;
    transition: 0.3s cubic-bezier(.24,.97,.59,1);
    .search-input {
      width: 100%;
      padding: 0 10Px;
      color: black;
      border: none;
      border-style: none;
      background: none;
      outline: none;
      text-align: center;
      font: 12Px SourceHanSansCN-Bold;
      &::-webkit-input-placeholder {
        font: 12Px Geometos;
        color: black;
      }
    }
    .search-border {
      width: 7Px;
      height: 7Px;
      position: absolute;
    }
    .search-border1 {
      top: 0;
      left: 0;
      border: {
        top: $boderpx solid black;
        left: $boderpx solid black;
      };
    }
    .search-border2 {
      top: 0;
      right: 0;
      border: {
        top: $boderpx solid black;
        right: $boderpx solid black;
      };
    }
    .search-border3 {
      bottom: 0;
      right: 0;
      border: {
        bottom: $boderpx solid black;
        right: $boderpx solid black;
      };
    }
    .search-border4 {
      bottom: 0;
      left: 0;
      border: {
        bottom: $boderpx solid black;
        left: $boderpx solid black;
      };
    }
    .search-border-2 {
      width: 4Px;
      height: 4Px;
      background-color: black;
      position: absolute;
    }
    .search-border5 {
      top: $boderPosition;
      left: $boderPosition;
    }
    .search-border6 {
      top: $boderPosition;
      right: $boderPosition;
    }
    .search-border7 {
      bottom: $boderPosition;
      right: $boderPosition;
    }
    .search-border8 {
      bottom: $boderPosition;
      left: $boderPosition;
    }
  }
  .search-container-foucs {
    width: 160Px;
  }
  .suggestion-panel {
    margin-top: 8Px;
    width: 100%;
    max-height: 240Px;
    background-color: rgba(255, 255, 255, 0.95);
    border: 1Px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 8Px 25Px rgba(0, 0, 0, 0.12);
    border-radius: 8Px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font: 12Px SourceHanSansCN-Bold;
    color: black;
    z-index: 20;
  }
  .suggestion-loading,
  .suggestion-empty {
    padding: 12Px 14Px;
    text-align: left;
    color: rgba(0, 0, 0, 0.6);
  }
  .suggestion-item {
    padding: 10Px 14Px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    transition: 0.2s;
    &:hover {
      cursor: pointer;
      background-color: rgba(0, 0, 0, 0.06);
    }
    .suggestion-title {
      font-size: 13Px;
      line-height: 1.3;
    }
    .suggestion-sub {
      margin-top: 4Px;
      font-size: 11Px;
      color: rgba(0, 0, 0, 0.6);
    }
  }
  .suggestion-more {
    padding: 10Px 14Px;
    text-align: center;
    font-size: 12Px;
    color: rgba(0, 0, 0, 0.7);
    border-top: 1Px solid rgba(0, 0, 0, 0.06);
    transition: 0.2s;
    &:hover {
      cursor: pointer;
      background-color: rgba(0, 0, 0, 0.06);
    }
  }
  .fade-enter-active,
  .fade-leave-active {
    transition: 0.2s;
  }

  .fade-enter-from,
  .fade-leave-to {
    transform: scale(0.9);
    opacity: 0;
  }
</style>
