/** The unit kind mark; `glyph` comes from `glyphClass`. */
export function Glyph({ glyph }: { glyph: string }) {
  return <span className={`g ${glyph}`} aria-hidden="true" />;
}
