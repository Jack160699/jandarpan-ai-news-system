type QueueTableProps = {
  children: React.ReactNode;
};

export function QueueTable({ children }: QueueTableProps) {
  return <div className="anr-table-wrap">{children}</div>;
}
