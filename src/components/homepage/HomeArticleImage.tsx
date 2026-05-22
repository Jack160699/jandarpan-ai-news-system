import Image from "next/image";
import { IMAGE_BLUR } from "@/lib/image-placeholder";

type HomeArticleImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
  className?: string;
  aspectClassName?: string;
};

export function HomeArticleImage({
  src,
  alt,
  priority = false,
  sizes,
  className = "object-cover",
  aspectClassName,
}: HomeArticleImageProps) {
  return (
    <div className={aspectClassName ?? "relative h-full w-full"}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        loading={priority ? undefined : "lazy"}
        placeholder="blur"
        blurDataURL={IMAGE_BLUR}
        sizes={sizes}
        className={className}
      />
    </div>
  );
}
