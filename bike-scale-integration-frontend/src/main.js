// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import { db, auth } from './firebase';
import { signInAnonymously } from 'firebase/auth';

import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css';
import './assets/global.css';

const vuetify = createVuetify({
  components, directives, icons: { defaultSet: 'mdi' },
  theme: {
    defaultTheme: 'dark',
    themes: { dark: { dark: true } }
  }
});

signInAnonymously(auth).then(() => {
  const app = createApp(App);
  app.provide('db', db);
  app.provide('auth', auth);
  app.use(vuetify);
  app.mount('#app');
});