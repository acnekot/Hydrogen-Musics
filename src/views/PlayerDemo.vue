<template>
  <div class="player-demo">
    <h1>Player</h1>
    <p>仅在此页显示背景时，可用于验证 applyToPlayPageOnly 的行为。</p>
    <div class="player-card">
      <div class="artwork-placeholder">封面</div>
      <div class="info">
        <div class="title">示例歌曲</div>
        <div class="artist">示例歌手</div>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.player-demo {
  padding: 24px;
  color: #000;
}

.player-card {
  margin-top: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.artwork-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background: linear-gradient(135deg, #dfe9f3, #ffffff);
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #333;
}

.info .title {
  font-size: 18px;
  font-weight: 700;
}

.info .artist {
  margin-top: 4px;
  color: #555;
}
</style>
