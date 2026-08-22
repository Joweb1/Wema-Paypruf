import React from 'react';

export const Brand = ({ size = 'md', isLight = false, isHeader = true }) => {
  const sizeClasses = {
    sm: 'text-base font-bold gap-1.5',
    md: 'text-xl font-extrabold gap-2',
    lg: 'text-3xl font-black gap-3',
  };

  const imgHeights = {
    sm: '28px',
    md: '38px',
    lg: '50px',
  };

  return (
    <div className={`flex items-center tracking-tight ${sizeClasses[size]}`}>
      <div className="relative flex items-center justify-center flex-shrink-0">
        <img
          src="/wemalogo.jpg"
          alt="Wema Paypruf Logo"
          style={{
            height: imgHeights[size] || '38px',
            width: 'auto',
            objectFit: 'contain',
            borderRadius: '6px',
            display: 'block',
          }}
        />
      </div>
      <div className="flex items-center">
        <span className={isLight ? 'text-white' : 'text-slate-900'}>
          {isHeader ? (
            <>
              Wema Pay<span className="text-purple-700">pruf</span>
            </>
          ) : (
            <>
              Pay<span className="text-purple-700">pruf</span>
            </>
          )}
        </span>
        <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-purple-100 text-purple-800">
          AI
        </span>
      </div>
    </div>
  );
};
