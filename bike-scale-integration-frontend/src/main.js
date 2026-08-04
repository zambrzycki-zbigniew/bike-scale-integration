// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { auth } from './firebase';
import { signInAnonymously } from 'firebase/auth';

import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import '@mdi/font/css/materialdesignicons.css';
import './assets/global.css';

const vuetify = createVuetify({
  icons: { defaultSet: 'mdi' },
  theme: {
    defaultTheme: 'dark',
    themes: { dark: { dark: true } }
  }
});

signInAnonymously(auth).then(() => {
  const app = createApp(App);
  app.use(createPinia());
  app.use(vuetify);
  app.mount('#app');
});