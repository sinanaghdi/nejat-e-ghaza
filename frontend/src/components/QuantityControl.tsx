type Props = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
};

export function QuantityControl({ value, min = 1, max, onChange }: Props) {
  return (
    <div className="quantity-control" dir="ltr" aria-label="تعداد">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="کاهش تعداد">−</button>
      <strong>{value}</strong>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="افزایش تعداد">+</button>
    </div>
  );
}
