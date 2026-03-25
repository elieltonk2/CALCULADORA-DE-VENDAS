import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elielton.calculadoravendas',
  appName: 'Calculadora de Vendas',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
