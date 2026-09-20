/** `file:line`, or just the file when the line is unknown. */
export function formatLocation(file: string, line: number | undefined): string {
  return line ? `${file}:${line}` : file;
}
