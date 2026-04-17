import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  icon: Icon, 
  variant = 'primary',
  action,
  className
}) => {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 pb-10 border-b border-[var(--border-subtle)] relative overflow-hidden", className)}>
      {/* Background Accent Glow */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--primary)]/5 blur-3xl rounded-full pointer-events-none" />
      
      <div className="space-y-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-5"
        >
          {Icon && (
            <div className={cn(
               "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 glass shadow-xl shadow-[var(--primary)]/5",
               variant === 'primary' && "text-[var(--primary)]",
               variant === 'success' && "text-[var(--success)]",
               variant === 'warning' && "text-[var(--warning)]",
               variant === 'error' && "text-[var(--error)]"
            )}>
              <Icon size={28} />
            </div>
          )}
          <h1 className="text-4xl font-black text-[var(--text-primary)] font-display tracking-tight">
            {title}
          </h1>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-[13px] font-bold text-[var(--text-secondary)] max-w-2xl leading-relaxed uppercase tracking-[0.2em] opacity-60"
        >
          {description}
        </motion.p>
      </div>

      {action && (
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className={cn(
            "px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-2xl transition-all border",
            variant === 'primary' && "bg-[var(--primary)] text-[var(--text-inverse)] border-[var(--primary-light)]/20 shadow-[var(--primary)]/30",
            variant === 'success' && "bg-[var(--success)] text-[var(--text-inverse)] border-[var(--success-light)]/20 shadow-[var(--success)]/30",
            variant === 'warning' && "bg-[var(--warning)] text-[var(--text-inverse)] border-[var(--warning-light)]/20 shadow-[var(--warning)]/30",
            variant === 'error' && "bg-[var(--error)] text-[var(--text-inverse)] border-[var(--error-light)]/20 shadow-[var(--error)]/30"
          )}
        >
          {action.icon && <action.icon size={16} />}
          {action.label}
        </motion.button>
      )}
    </div>
  );
};

export default PageHeader;
