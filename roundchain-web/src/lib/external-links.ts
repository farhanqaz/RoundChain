/** Product guide PDF (Adobe Acrobat share link). */
export const DEFAULT_PRODUCT_GUIDE_URL =
  "https://acrobat.adobe.com/id/urn:aaid:sc:AP:3bd8997c-ab41-432f-8304-46b78443e7ab";

export const PRODUCT_GUIDE_URL =
  process.env.NEXT_PUBLIC_PRODUCT_GUIDE_URL?.trim() || DEFAULT_PRODUCT_GUIDE_URL;
