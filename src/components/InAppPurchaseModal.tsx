import React from 'react';
import { PurchasesPackage, PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { Crown, X, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  offering: PurchasesOffering | null;
  onPurchase: (pkg: PurchasesPackage) => Promise<boolean>;
  onRestore: () => Promise<boolean>;
  isPurchasing: boolean;
}

export const InAppPurchaseModal: React.FC<Props> = ({ isOpen, onClose, offering, onPurchase, onRestore, isPurchasing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
            <Crown className="text-yellow-500" />
            <h2 className="text-xl font-bold">VendaPro PRO</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
          Desbloqueie acesso total, remova anúncios e tenha recursos ilimitados.
        </p>

        <div className="space-y-3 mb-6">
          {offering?.availablePackages.map((pkg) => (
            <button
              key={pkg.identifier}
              onClick={() => onPurchase(pkg)}
              disabled={isPurchasing}
              className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex justify-between items-center"
            >
              <span className="font-semibold">{pkg.product.title}</span>
              <span className="text-sm text-zinc-500">{pkg.product.priceString}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onRestore}
          disabled={isPurchasing}
          className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} />
          Restaurar compras
        </button>

        {isPurchasing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 rounded-3xl">
            <Loader2 className="animate-spin text-zinc-900 dark:text-white" size={48} />
          </div>
        )}
      </div>
    </div>
  );
};
