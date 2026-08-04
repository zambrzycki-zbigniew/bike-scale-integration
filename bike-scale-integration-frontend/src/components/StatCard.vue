<script setup>
import { computed } from 'vue';

const props = defineProps({
  icon:  { type: String, required: true },
  value: { type: String, required: true },
  label: { type: String, default: '' },
  color: { type: String, default: '#22d3ee' },
  dense: { type: Boolean, default: false },
  trend: { type: Number, default: null },
  trendUnit: { type: String, default: '' },
  // 'down' if a negative trend is desirable (e.g. weight loss), 'up' if positive is desirable
  trendGoodDirection: { type: String, default: null },
});

const trendIcon = computed(() => {
  if (props.trend == null) return 'mdi-trending-neutral';
  return props.trend < 0 ? 'mdi-trending-down' : props.trend > 0 ? 'mdi-trending-up' : 'mdi-trending-neutral';
});
const trendText = computed(() =>
  props.trend == null ? null : `${props.trend > 0 ? '+' : ''}${props.trend.toFixed(2)} ${props.trendUnit}`
);
const trendColor = computed(() => {
  if (props.trend == null || !props.trendGoodDirection) return 'rgba(255,255,255,.55)';
  const isGood =
    (props.trendGoodDirection === 'down' && props.trend <= 0) ||
    (props.trendGoodDirection === 'up' && props.trend >= 0);
  return isGood ? '#4ade80' : '#f87171';
});
</script>

<template>
  <v-card class="stat-card" :class="{ 'stat-card--dense': dense }" :style="{ '--accent': color }" flat>
    <v-card-text class="stat-card__body">
      <div class="stat-card__icon"><v-icon :size="dense ? 30 : 48">{{ icon }}</v-icon></div>
      <div class="stat-card__text">
        <div class="stat-card__value">{{ value }}</div>
        <div v-if="label" class="stat-card__label">{{ label }}</div>
        <div v-if="trendText" class="stat-card__trend" :style="{ color: trendColor }">
          <v-icon size="14">{{ trendIcon }}</v-icon>{{ trendText }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.stat-card {
  --accent: #22d3ee;
  height: 100%;
  border-radius: 18px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, #12161f), #12161f 70%);
  border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
  box-shadow: 0 0 22px -10px color-mix(in srgb, var(--accent) 60%, transparent);
  display: flex;
}

.stat-card__body {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px 24px !important;
  width: 100%;
}

.stat-card__icon {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--accent);
}

.stat-card__text { min-width: 0; }

.stat-card__value {
  font-size: 2.6rem;
  font-weight: 800;
  line-height: 1.1;
  color: #f5f7fa;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stat-card__label {
  font-size: .82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: rgba(255,255,255,.5);
  margin-top: 4px;
}

.stat-card__trend {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: .78rem;
  font-weight: 700;
  margin-top: 6px;
}

.stat-card--dense .stat-card__body {
  gap: 12px;
  padding: 12px 16px !important;
}
.stat-card--dense .stat-card__icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
}
.stat-card--dense .stat-card__value {
  font-size: 1.5rem;
}
.stat-card--dense .stat-card__label {
  font-size: .68rem;
  margin-top: 2px;
}
.stat-card--dense .stat-card__trend {
  font-size: .66rem;
  margin-top: 3px;
}
</style>
