<script setup>
defineProps({
  current: { type: Number, default: null },
  average: { type: Number, default: null },
  target: { type: Number, default: null },
  currentColor: { type: String, default: '#c084fc' },
  averageColor: { type: String, default: '#c084fc' },
  targetColor: { type: String, default: '#c084fc' },
  unit: { type: String, default: 'km/h' },
});

function fmt(v) {
  return v != null ? v.toFixed(1) : '—';
}
</script>

<template>
  <v-card class="pace-card" flat>
    <div class="pace-card__title">Pace ({{ unit }})</div>
    <div class="pace-card__row">
      <div class="pace-card__item">
        <div class="pace-card__value" :style="{ color: currentColor }">{{ fmt(current) }}</div>
        <div class="pace-card__label">Current</div>
      </div>
      <div class="pace-card__sep">/</div>
      <div class="pace-card__item">
        <div class="pace-card__value" :style="{ color: averageColor }">{{ fmt(average) }}</div>
        <div class="pace-card__label">Average</div>
      </div>
      <div class="pace-card__sep">/</div>
      <div class="pace-card__item">
        <div class="pace-card__value" :style="{ color: targetColor }">{{ fmt(target) }}</div>
        <div class="pace-card__label">Target</div>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.pace-card {
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(192, 132, 252, 0.12), #12161f 70%);
  border: 1px solid rgba(192, 132, 252, 0.28);
  padding: 18px 24px;
}
.pace-card__title {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
  text-align: center;
}
.pace-card__row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 12px;
}
.pace-card__item {
  text-align: center;
}
.pace-card__value {
  font-size: 2.8rem;
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.pace-card__label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}
.pace-card__sep {
  font-size: 1.6rem;
  color: rgba(255, 255, 255, 0.2);
}
</style>
