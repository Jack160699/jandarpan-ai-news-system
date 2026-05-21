type VisualDecompressionProps = {
  label?: string;
};

export function VisualDecompression({ label }: VisualDecompressionProps) {
  return (
    <div className="visual-decompression editorial-container flex items-center justify-center">
      {label ? (
        <p className="meta-label text-[var(--ink-faint)]">{label}</p>
      ) : (
        <div className="h-px w-16 bg-[var(--rule)]" aria-hidden />
      )}
    </div>
  );
}
