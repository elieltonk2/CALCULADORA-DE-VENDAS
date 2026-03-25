import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Trash2, FileText, ExternalLink, LogOut, User } from 'lucide-react';
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onLogout: () => void;
  onDeleteAccount: () => void;
  isPro: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onLogout, 
  onDeleteAccount,
  isPro
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
        >
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <User size={20} className="text-zinc-400" />
              Minha Conta
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="w-12 h-12 bg-zinc-900 dark:bg-zinc-100 rounded-full flex items-center justify-center text-white dark:text-zinc-900 font-bold text-xl">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-100">{user?.displayName}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</p>
                {isPro && (
                  <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded uppercase tracking-wider">
                    <ShieldCheck size={10} /> Usuário PRO
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2">Legal</p>
              <a 
                href="/privacy.html" 
                target="_blank" 
                className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-zinc-400" />
                  <span className="text-sm font-medium">Política de Privacidade</span>
                </div>
                <ExternalLink size={14} className="text-zinc-300 group-hover:text-zinc-500" />
              </a>
              <a 
                href="/deletion.html" 
                target="_blank" 
                className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={18} className="text-zinc-400" />
                  <span className="text-sm font-medium">Exclusão de Dados</span>
                </div>
                <ExternalLink size={14} className="text-zinc-300 group-hover:text-zinc-500" />
              </a>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              <Button 
                variant="secondary" 
                className="w-full justify-start gap-3 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                onClick={onLogout}
              >
                <LogOut size={18} />
                Sair da Conta
              </Button>
              
              <button 
                onClick={onDeleteAccount}
                className="w-full text-center py-2 text-[11px] font-bold text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-wider"
              >
                Excluir Minha Conta Permanentemente
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
