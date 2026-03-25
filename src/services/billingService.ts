import { PurchasesPackage, LOG_LEVEL, PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

// IDs dos produtos solicitados
export const PRODUCT_IDS = {
  MONTHLY: 'mensal_vendapro',
  LIFETIME: 'vitalicio_vendapro'
};

export const ENTITLEMENT_ID = 'pro'; // ID do Entitlement configurado no RevenueCat

const isWeb = () => {
  try {
    return Capacitor && Capacitor.getPlatform() === 'web';
  } catch (e) {
    return true;
  }
};

export const initBilling = async (userId: string) => {
  if (isWeb()) {
    console.warn('RevenueCat não é suportado na Web. Mockando status PRO.');
    return;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    
    // API Key do RevenueCat (Android)
    const apiKey = process.env.REVENUECAT_API_KEY || 'goog_placeholder_key';
    
    await Purchases.configure({ 
      apiKey,
      appUserID: userId 
    });

    console.log('RevenueCat inicializado com sucesso para o usuário:', userId);
  } catch (error) {
    console.error('Erro ao inicializar RevenueCat:', error);
    throw error;
  }
};

export const fetchOfferings = async (): Promise<PurchasesOffering | null> => {
  if (isWeb()) {
    // Mock para visualização no navegador
    return {
      identifier: 'default',
      serverDescription: 'Default offering',
      availablePackages: [
        {
          identifier: '$rc_monthly',
          packageType: 'MONTHLY',
          product: {
            identifier: 'mensal_vendapro',
            description: 'Acesso mensal ao VendaPro PRO',
            title: 'Plano Mensal',
            price: 9.90,
            priceString: 'R$ 9,90',
            currencyCode: 'BRL',
          }
        },
        {
          identifier: '$rc_lifetime',
          packageType: 'LIFETIME',
          product: {
            identifier: 'vitalicio_vendapro',
            description: 'Acesso vitalício ao VendaPro PRO',
            title: 'Plano Vitalício',
            price: 49.90,
            priceString: 'R$ 49,90',
            currencyCode: 'BRL',
          }
        }
      ]
    } as PurchasesOffering;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return null;
  }
};

export const purchaseProduct = async (pkg: PurchasesPackage) => {
  if (isWeb()) {
    console.warn('RevenueCat não é suportado na Web.');
    return false;
  }
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    
    // Verifica se o entitlement 'pro' está ativo
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('Usuário cancelou a compra');
    } else {
      console.error('Erro na compra:', error);
      throw error;
    }
    return false;
  }
};

export const restorePurchases = async () => {
  if (isWeb()) {
    console.warn('RevenueCat não é suportado na Web.');
    return false;
  }
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.error('Erro ao restaurar compras:', error);
    throw error;
  }
};

export const setupPurchaseListener = async (callback: (isPro: boolean) => void) => {
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    callback(isPro);
  });
};

export const checkProStatus = async (): Promise<boolean> => {
  if (isWeb()) return true; // Mock para web dev

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.error('Erro ao verificar status PRO:', error);
    return false;
  }
};
