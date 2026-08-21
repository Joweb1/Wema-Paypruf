import React from 'react';
import { PayPrufLogoIcon } from './PayPrufLogoIcon';

export const Brand = ({ size = 'md', isLight = false }) => {
  const sizeClasses = {
    sm: 'text-base font-bold gap-1.5',
    md: 'text-xl font-extrabold gap-2',
    lg: 'text-3xl font-black gap-3',
  };

  const iconSizes = {
    sm: 28,
    md: 38,
    lg: 52,
  };

  return (
    <div className={`flex items-center tracking-tight ${sizeClasses[size]}`}>
      <div className="relative flex items-center justify-center flex-shrink-0">
        <PayPrufLogoIcon size={iconSizes[size]} />
      </div>
      <div className="flex items-center">
        <span className={isLight ? 'text-white' : 'text-slate-900'}>
          Pay<span className="text-purple-700">pruf</span>
        </span>
        <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-purple-100 text-purple-800">
          AI
        </span>
      </div>
    </div>
  );
};
