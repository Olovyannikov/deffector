import { encode, type Encoded, type FxOverride, type FxOverrideMode } from '@deffector/protocol';

export interface OverrideForm {
  node: string;
  mode: FxOverrideMode;
  value: string;
  delay: string;
  code: string;
}

/** The value to resolve or reject with: JSON, or the text itself (plain text is fine for an error). */
function parseValue(text: string): Encoded {
  try {
    return encode(JSON.parse(text));
  } catch {
    return encode(text);
  }
}

export function overrideFromForm({ node, mode, value, delay, code }: OverrideForm): FxOverride {
  const takesValue = (mode === 'done' || mode === 'fail') && value.trim();
  return {
    node,
    mode,
    value: takesValue ? parseValue(value) : undefined,
    delay: mode === 'delay' ? Number(delay) || 0 : undefined,
    code: mode === 'handler' ? code : undefined,
  };
}
