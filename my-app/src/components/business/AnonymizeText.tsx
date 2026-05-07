interface AnonymizeTextProps {
  name: string;
  isAi?: boolean;
  className?: string;
}

function anonymize(name: string, isAi?: boolean): string {
  if (!name) return '';
  if (isAi) {
    if (name.length <= 3) return name[0] + '***';
    return name.slice(0, 2) + '***' + name.slice(-1);
  }
  return name[0] + '***';
}

export function AnonymizeText({ name, isAi, className }: AnonymizeTextProps) {
  return (
    <span className={className} data-name="anonymizeText">
      {anonymize(name, isAi)}
    </span>
  );
}
