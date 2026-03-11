import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.immo2025.app',
  appName: 'Immo2025',
  webDir: 'out',
  server: {
    url: process.env.CAP_SERVER_URL || 'https://immo2025.vercel.app',
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
