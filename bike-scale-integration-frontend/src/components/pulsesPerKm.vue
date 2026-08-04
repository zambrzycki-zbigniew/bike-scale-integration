<script setup>
import { usePulsesPerKm } from '../stores/usePulsesPerKm';

const { ppm, save } = usePulsesPerKm();
</script>

<template>
  <div>
    <label>Pulses / km:
      <input v-model.number="ppm" type="number" min="1" />
    </label>
    <button @click="save(ppm)">Zapisz</button>
  </div>
</template>