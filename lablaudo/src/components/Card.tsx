import React from 'react';
import { cn } from '../lib/utils';

export const Card = ({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) => (
  <div 
    className={cn('bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden', className)}
    onClick={onClick}
  >
    {children}
  </div>
);

export const CardHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('px-6 py-4 border-bottom border-slate-100', className)}>
    {children}
  </div>
);

export const CardContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('px-6 py-4', className)}>
    {children}
  </div>
);

export const CardFooter = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('px-6 py-4 bg-slate-50 border-top border-slate-100', className)}>
    {children}
  </div>
);
