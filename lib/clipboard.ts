// Copies text to the clipboard. Resolves true on success, false if both the
// modern API and the legacy fallback fail.
export async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // fall through to the legacy path
        return false;
    }
    
    return false; 
}