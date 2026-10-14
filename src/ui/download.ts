/**
 * Offer `content` as a file download in the browser: a `Blob` behind a temporary
 * `<a download>` link, released right after the click.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
  doc: Document = document,
): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }));
  const link = doc.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  doc.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
