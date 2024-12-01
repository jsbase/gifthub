import { memo } from 'react';
import Image from 'next/image';

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