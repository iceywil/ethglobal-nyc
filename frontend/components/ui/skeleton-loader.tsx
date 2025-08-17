"use client";

import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className }) => {
  return (
    <div className={`relative overflow-hidden bg-gray-700 rounded-md ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-600 to-transparent animate-wave"
           style={{ backgroundSize: '200% 100%' }}></div>
      <style jsx>{`
        @keyframes wave {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-wave {
          animation: wave 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SkeletonLoader;
