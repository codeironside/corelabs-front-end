import { useEffect, useState } from 'react';
import {
  preventMediaContextMenu,
  protectedMediaSurfaceClass,
  useProtectedMediaSrc,
} from '@/pages/dashboard/content-episodes/protectedMedia';

export function ProtectedStudioImage({
  originUrl,
  alt,
  className = '',
}: {
  originUrl: string | undefined;
  alt: string;
  className?: string;
}): React.JSX.Element {
  const { src, loading, error } = useProtectedMediaSrc(originUrl);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (loading) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-black/20 text-xs text-white/70 ${className}`}>
        Loading…
      </div>
    );
  }

  if (error || !src || broken) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-black/20 text-xs text-white/70 ${className}`}>
        Image unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${protectedMediaSurfaceClass} ${className}`}
      draggable={false}
      onContextMenu={preventMediaContextMenu}
      onError={() => setBroken(true)}
    />
  );
}
