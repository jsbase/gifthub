import React, { memo } from 'react';
import Image from 'next/image';
import type { LanguageFlagProps } from '@/types';

const LanguageFlag: React.FC<LanguageFlagProps> = ({ src, alt, width, height, className }) => {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'cover' }}
    />
  );
};

export default memo(LanguageFlag);