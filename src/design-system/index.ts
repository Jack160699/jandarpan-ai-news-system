/**
 * Jan Darpan Design System (JDP-001)
 *
 * Backwards-compatible barrel — generic primitives from @stratxcel/platform,
 * Jan Darpan editorial components remain local.
 */

import "@stratxcel/platform/theme/variables.css";

// Platform foundation
export * from "@stratxcel/platform/tokens";
export * from "@stratxcel/platform/theme";
export * from "@stratxcel/platform/hooks";
export * from "@stratxcel/platform/utils";
export * from "@stratxcel/platform/motion";

// Generic UI primitives (platform)
export {
  Button,
  buttonVariants,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Badge,
  badgeVariants,
  Chip,
  chipVariants,
  Input,
  Search,
  Navigation,
  Avatar,
  avatarVariants,
  SectionHeader,
  Loading,
  Skeleton,
  skeletonVariants,
  EmptyState,
  ErrorState,
} from "@stratxcel/platform/ui";
export type {
  ButtonProps,
  CardProps,
  BadgeProps,
  ChipProps,
  InputProps,
  SearchProps,
  NavigationProps,
  NavigationItem,
  AvatarProps,
  SectionHeaderProps,
  LoadingProps,
  SkeletonProps,
  EmptyStateProps,
  ErrorStateProps,
} from "@stratxcel/platform/ui";

// Jan Darpan editorial components (local)
export * from "./components/editorial";
export { NewsCard } from "./components/NewsCard";
export type { NewsCardProps } from "./components/NewsCard";
export { HeroCard } from "./components/HeroCard";
export type { HeroCardProps } from "./components/HeroCard";
export { ArticleMeta } from "./components/ArticleMeta";
export type { ArticleMetaProps } from "./components/ArticleMeta";
export { AISummary } from "./components/AISummary";
export type { AISummaryProps } from "./components/AISummary";
export { JdsCardImage, EditorialCardImage } from "./components/JdsCardImage/JdsCardImage";
export type { JdsCardImageProps } from "./components/JdsCardImage/JdsCardImage";
