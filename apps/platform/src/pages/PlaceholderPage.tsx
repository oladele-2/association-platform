export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1>{title}</h1>
      <div className="panel">
        <p className="muted">{description}</p>
      </div>
    </div>
  );
}
