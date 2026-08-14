import { encode, isLossless, maskByKey, maskString, type Encoded } from '@deffector/protocol';

const TRACE_ENCODING = { maxDepth: 8, maxKeys: 200, maxItems: 500, maxString: 20000 };

/** `$password`, `token`, `apiKey`…: a string store or event with such a name is masked as a whole. */
function isSensitiveName(name: string) {
  return maskByKey(name.replace(/^\$/, ''));
}

/** Values of a trace: secrets masked (length kept), paths of masked and lossy values noted. */
export class TraceValues {
  private readonly redacted: string[] = [];

  private readonly lossy: string[] = [];

  encode(value: unknown, unitName: string, path: string): Encoded {
    const maskedPaths: string[] = [];
    let encoded: Encoded;
    if (typeof value === 'string' && isSensitiveName(unitName)) {
      encoded = maskString(value);
      maskedPaths.push(path);
    } else {
      encoded = encode(value, {
        ...TRACE_ENCODING,
        mask: (key) => maskByKey(key),
        masked: maskedPaths,
      });
    }
    for (const masked of maskedPaths) {
      this.redacted.push(masked === path ? path : `${path}.${masked}`);
    }
    if (!isLossless(encoded)) this.lossy.push(path);
    return encoded;
  }

  redactedPaths(): string[] {
    return [...new Set(this.redacted)];
  }

  lossyPaths(): string[] {
    return [...new Set(this.lossy)];
  }
}
