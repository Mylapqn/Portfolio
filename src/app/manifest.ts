/**
 * Fetches a text resource and rejects when the server does not return a successful response.
 * @param url Resource URL to request.
 */
export async function fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
    }

    return response.text();
}
