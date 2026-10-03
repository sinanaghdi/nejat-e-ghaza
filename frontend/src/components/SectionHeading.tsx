type Props = {
  eyebrow?: string;
  title: string;
  trailing?: React.ReactNode;
};

export function SectionHeading({ eyebrow, title, trailing }: Props) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {trailing}
    </div>
  );
}
