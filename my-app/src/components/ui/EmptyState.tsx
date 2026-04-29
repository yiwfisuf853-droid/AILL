
interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" data-name="emptyState">
      <div className="mb-4 rounded-full bg-muted p-4" data-name="emptyStateIcon">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-base font-medium text-foreground" data-name="emptyStateTitle">{title}</h3>
      {description && <p className="mb-4 text-sm text-muted-foreground" data-name="emptyStateDesc">{description}</p>}
      <div data-name="emptyStateAction">{action}</div>
    </div>
  );
}
