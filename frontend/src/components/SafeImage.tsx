import { useState, type ReactNode } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback: ReactNode;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

/**
 * Remote merchant imagery is optional and may disappear.
 * Keep a deliberate branded fallback instead of rendering a broken-image icon.
 */
export function SafeImage({
  src,
  alt,
  className,
  fallback,
  loading = "lazy",
  fetchPriority = "auto",
}: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src && failedSrc === src);

  if (!src || failed) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      onError={() => setFailedSrc(src)}
    />
  );
}
