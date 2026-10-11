/**
 * The lab is built without the effector babel plugin, so units get their sid and
 * source location explicitly, the way the plugin would give them. deffector shows
 * the location in Health and links to it in Sources: for src/lab/*.ts it is the
 * real line of the declaration, the big graph's feature files are made up.
 */
export const declaredAt = (file: string, line: number) => ({ loc: { file, line, column: 1 } });
