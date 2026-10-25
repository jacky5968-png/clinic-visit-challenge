import { useState } from 'react';
export function AssetImage({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return failedSrc === src ? (
    <div className={`asset-fallback ${className}`} role="img" aria-label={`${alt}（替代畫面）`}>
      <span>＋</span>
      <small>{alt}</small>
    </div>
  ) : (
    <img className={className} src={src.startsWith('/assets/') ? `${import.meta.env.BASE_URL}${src.slice(1)}` : src} alt={alt} onError={() => setFailedSrc(src)} />
  );
}
