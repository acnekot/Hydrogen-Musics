<template>
  <div class="demo-page player">
    <h2>背景演示：Player</h2>
    <p>当“仅播放页显示”启用时，只在此页面看到背景。</p>
  </div>
</template>

<style scoped>
.demo-page {
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}
.player {
  border: 1px dashed #9c27b0;
}
</style>
