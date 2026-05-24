/**
 * Navigation icons — Lucide React, consistent 2px stroke, rounded caps
 */
import {
  Bell,
  Bookmark,
  Clapperboard,
  Headphones,
  Home,
  LayoutGrid,
  Moon,
  Radio,
  Search,
  Sun,
  type LucideIcon,
} from "lucide-react";

type IconProps = { className?: string };

const stroke = {
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function navIcon(Icon: LucideIcon, { className }: IconProps) {
  return <Icon className={className} aria-hidden {...stroke} />;
}

export function IconHome({ className }: IconProps) {
  return navIcon(Home, { className });
}

export function IconListen({ className }: IconProps) {
  return navIcon(Headphones, { className });
}

export function IconReels({ className }: IconProps) {
  return navIcon(Clapperboard, { className });
}

export function IconLive({ className }: IconProps) {
  return navIcon(Radio, { className });
}

export function IconMenu({ className }: IconProps) {
  return navIcon(LayoutGrid, { className });
}

export function IconSearch({ className }: IconProps) {
  return navIcon(Search, { className });
}

export function IconBell({ className }: IconProps) {
  return navIcon(Bell, { className });
}

export function IconSun({ className }: IconProps) {
  return navIcon(Sun, { className });
}

export function IconMoon({ className }: IconProps) {
  return navIcon(Moon, { className });
}

export function IconSaved({ className }: IconProps) {
  return navIcon(Bookmark, { className });
}

export {
  Bookmark,
  Clapperboard,
  Headphones,
  Home,
  LayoutGrid,
  Radio,
  Search,
} from "lucide-react";
