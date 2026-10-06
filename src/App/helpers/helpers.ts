
export function truncateText(text, maxLength) {
    // 1. Clean up any accidental leading/trailing whitespace
    const cleanedText = text.trim();

    // 2. Check if the text is longer than the allowed maximum
    if (cleanedText.length > maxLength) {
        // Cut the text and add the ellipsis
        return cleanedText.substring(0, maxLength) + '...';
    }

    // 3. Return the clean text as-is if it's within the limit
    return cleanedText;
}
