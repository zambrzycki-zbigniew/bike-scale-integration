<script setup>
defineProps({
  icon:  { type: String, required: true },
  value: { type: String, required: true },
  label: { type: String, default: '' },
  color: { type: String, default: '#22d3ee' },
});
</script>

<template>
  <v-card class="stat-card" :style="{ '--accent': color }" flat>
    <v-card-text class="stat-card__body">
      <div class="stat-card__icon"><v-icon size="48">{{ icon }}</v-icon></div>
      <div class="stat-card__text">
        <div class="stat-card__value">{{ value }}</div>
        <div v-if="label" class="stat-card__label">{{ label }}</div>
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
</style>
