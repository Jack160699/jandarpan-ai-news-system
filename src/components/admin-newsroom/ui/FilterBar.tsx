type FilterBarProps = {
  children: React.ReactNode;
};

export function FilterBar({ children }: FilterBarProps) {
  return <div className="anr-toolbar">{children}</div>;
}
