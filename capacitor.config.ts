import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.tiili.app',
  appName: 'tiili',
  webDir: 'out',
  server: {
    url: 'https://tiili.io',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
