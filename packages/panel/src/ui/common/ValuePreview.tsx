import { preview, valueKind, type Encoded } from '@deffector/protocol';

/** One-line value, coloured by kind; a dash when there is no value. */
export function ValuePreview({
  value,
  maxLength,
}: {
  value: Encoded | undefined;
  maxLength: number;
}) {
  if (value === undefined) return <span className="v-special">—</span>;
  return <span className={`v-${valueKind(value)}`}>{preview(value, maxLength)}</span>;
}
