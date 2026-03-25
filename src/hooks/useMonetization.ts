import { useState, useEffect } from 'react';
import { PurchasesPackage, PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { 
  initBilling, 
  fetchOfferings, 
  purchaseProduct, 
  restorePurchases, 
  checkProStatus,
  setupPurchaseListener
} from '../services/billingService';

export const useMonetization = (userId?: string) => {
  const [isPro, setIsPro] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (userId) {
        await initBilling(userId);
        const status = await checkProStatus();
        setIsPro(status);
        
        const currentOffering = await fetchOfferings();
        setOffering(currentOffering);
      }
    };
    init();

    setupPurchaseListener((status) => {
      setIsPro(status);
    });
  }, [userId]);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setIsPurchasing(true);
    try {
      const success = await purchaseProduct(pkg);
      setIsPro(success);
      return success;
    } catch (error) {
      console.error('Purchase error:', error);
      return false;
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const success = await restorePurchases();
      setIsPro(success);
      return success;
    } catch (error) {
      console.error('Restore error:', error);
      return false;
    } finally {
      setIsPurchasing(false);
    }
  };

  return { isPro, offering, isPurchasing, handlePurchase, handleRestore };
};
