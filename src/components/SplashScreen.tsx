import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp } from 'lucide-react';

export const SplashScreen = () => {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 text-white"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.8,
          ease: [0, 0.71, 0.2, 1.01],
          scale: {
            type: "spring",
            damping: 5,
            stiffness: 100,
            restDelta: 0.001
          }
        }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
          <TrendingUp size={48} className="text-zinc-950" strokeWidth={3} />
        </div>
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full -z-10"
        />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-3xl font-black tracking-tighter mb-1">
          VENDA<span className="text-emerald-500">PRO</span>
        </h1>
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-[0.2em] ml-1">
          Gestão Inteligente
        </p>
      </motion.div>

      <div className="absolute bottom-12 flex flex-col items-center gap-4">
        <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="w-1/2 h-full bg-emerald-500"
          />
        </div>
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
          Carregando seu negócio...
        </p>
      </div>
    </motion.div>
  );
};
