import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@stratxcel/platform/utils/cn";
import { ContentContainer } from "../ContentContainer";
import type { ContentWidthVariant } from "../types";

export type PageContainerProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  width?: ContentWidthVariant;
  as?: "main" | "div" | "section";
};

/**
 * Page-level wrapper with semantic main landmark and content width constraint.
 */
export function PageContainer({
  children,
  className,
  width = "default",
  as: Tag = "main",
  ...props
}: PageContainerProps) {
  return (
    <Tag
      id="main-content"
      className={cn("jdp-page", className)}
      {...props}
    >
      <ContentContainer width={width}>{children}</ContentContainer>
    </Tag>
  );
}
