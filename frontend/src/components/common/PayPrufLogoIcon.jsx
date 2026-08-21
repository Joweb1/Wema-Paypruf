import React from 'react';

export function PayPrufLogoIcon({ size = 36, className = "" }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="payprufGradComponent" x1="15%" y1="90%" x2="85%" y2="10%">
          <stop offset="0%" stopColor="#3c096c" />
          <stop offset="25%" stopColor="#5a189a" />
          <stop offset="55%" stopColor="#7b2583" />
          <stop offset="80%" stopColor="#b5179e" />
          <stop offset="100%" stopColor="#f72585" />
        </linearGradient>
      </defs>

      <g fill="none" stroke="url(#payprufGradComponent)" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer Track */}
        <path
          d="M 140 375 L 225 125 L 320 125 C 385 125, 415 170, 395 235 C 378 288, 325 315, 235 315 L 230 315"
          strokeWidth="34"
        />

        {/* Middle Track */}
        <path
          d="M 172 375 L 245 160 L 310 160 C 352 160, 372 190, 358 235 C 346 270, 310 285, 252 285 L 242 285"
          strokeWidth="28"
        />

        {/* Inner Track */}
        <path
          d="M 204 375 L 265 195 L 300 195 C 320 195, 330 210, 322 235 C 314 255, 292 258, 258 258"
          strokeWidth="22"
        />
      </g>
    </svg>
  );
}
