interface Props {
  href: string;
  title: string;
  description: string;
  buttonLabel: string;
}

export function ExternalDocCard({ href, title, description, buttonLabel }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full flex-col rounded-md border border-border bg-card p-5 transition hover:bg-muted-surface"
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{description}</p>
      <span className="btn-primary mt-4 inline-block w-fit text-sm">{buttonLabel}</span>
    </a>
  );
}
