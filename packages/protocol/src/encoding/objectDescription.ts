/** Short descriptions of objects that are not walked into: class names, DOM nodes, DOM events. */

const TEXT_NODE = 3;
const DOCUMENT_NODE = 9;

/** Constructor name of a class instance, null for plain objects and `Object.create(null)`. */
export function describeClassName(value: object): string | null {
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype === null || prototype === Object.prototype) return null;
  const constructorName = (prototype as { constructor?: { name?: unknown } }).constructor?.name;
  return typeof constructorName === 'string' && constructorName ? constructorName : 'Object';
}

interface DomNodeLike {
  nodeType: number;
  nodeName: string;
  id?: string;
  className?: unknown;
}

/** Duck-typed, so it works for nodes of other windows and of DOM shims in tests. */
export function isDomNode(value: object): value is DomNodeLike {
  const candidate = value as Partial<DomNodeLike>;
  return typeof candidate.nodeType === 'number' && typeof candidate.nodeName === 'string';
}

export function isDomEvent(value: object): value is { type: string } {
  const candidate = value as { type?: unknown; preventDefault?: unknown };
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.preventDefault === 'function' &&
    'target' in value
  );
}

/** `<input#email.field.wide>`, `#text`, `#document` */
export function describeDomNode(node: DomNodeLike): string {
  if (node.nodeType === TEXT_NODE) return '#text';
  if (node.nodeType === DOCUMENT_NODE) return '#document';
  let selector = String(node.nodeName || '').toLowerCase();
  if (node.id) selector += `#${node.id}`;
  if (typeof node.className === 'string' && node.className.trim())
    selector += `.${node.className.trim().split(/\s+/).join('.')}`;
  return `<${selector}>`;
}
