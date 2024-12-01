import Image from 'next/image';
import { memo } from 'react';

const LanguageFlag = ({
  src,
  alt,
  width,
  height,
  className
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) => {
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