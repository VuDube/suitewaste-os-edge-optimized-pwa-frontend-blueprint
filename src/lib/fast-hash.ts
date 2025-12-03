// A simple SHA-256 hashing utility for client-side password handling in the demo.
// This is for procedural demonstration and not for production security.
const APP_SALT = "suitewaste-os-pwa-demo-salt";
/**
 * Hashes a string using SHA-256.
 * @param text The string to hash.
 * @returns A promise that resolves to the hex-encoded hash.
 */
export async function hashText(text: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text + APP_SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error("Hashing failed:", error);
    // Fallback for environments where crypto.subtle is not available (e.g., insecure contexts)
    return text + APP_SALT;
  }
}