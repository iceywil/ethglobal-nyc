"use client";

import React from 'react';

interface ChainIconProps {
  currency: string;
  className?: string;
}

const ChainIcon: React.FC<ChainIconProps> = ({ currency, className = 'w-6 h-6' }) => {
  const getIcon = () => {
    switch (currency.toLowerCase()) {
      case 'bitcoin':
        return 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/btc.svg';
      case 'ethereum':
        return 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/eth.svg';
      case 'solana':
        return 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/sol.svg';
      case 'polygon':
        return 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/matic.svg';
      case 'bsc':
        return 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/bnb.svg';
      case 'ripple':
          return 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/xrp.svg';
      case 'litecoin':
          return 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/ltc.svg';
      case 'dogecoin':
          return 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/doge.svg';
      default:
        return 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/generic.svg';
    }
  };

  return <img src={getIcon()} alt={`${currency} icon`} className={className} />;
};

export default ChainIcon;
