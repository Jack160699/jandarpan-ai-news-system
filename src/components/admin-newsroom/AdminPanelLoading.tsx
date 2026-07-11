type AdminPanelLoadingProps = {
  label: string;
};

export function AdminPanelLoading({ label }: AdminPanelLoadingProps) {
  return <p className="anr-meta">{label}</p>;
}
