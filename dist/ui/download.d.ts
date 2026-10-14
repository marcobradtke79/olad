/**
 * Offer `content` as a file download in the browser: a `Blob` behind a temporary
 * `<a download>` link, released right after the click.
 */
export declare function downloadFile(content: string, filename: string, mimeType: string, doc?: Document): void;
