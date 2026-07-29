/** Google Docs product guide (view link, not edit). */
export const DEFAULT_PRODUCT_GUIDE_URL =
  "https://docs.google.com/document/d/11jIQBBCZt_G8uq_7wi7Js3FTr1SCJUidJ7oKYsohw1Q/view?usp=sharing";

/** Hosted PDF copy in /public/docs (fallback download). */
export const PRODUCT_GUIDE_PDF_PATH = "/docs/roundchain-product-guide.pdf";

export const PRODUCT_GUIDE_URL =
  process.env.NEXT_PUBLIC_PRODUCT_GUIDE_URL?.trim() || DEFAULT_PRODUCT_GUIDE_URL;

export const PRODUCT_GUIDE_PDF_URL =
  process.env.NEXT_PUBLIC_PRODUCT_GUIDE_PDF_URL?.trim() || PRODUCT_GUIDE_PDF_PATH;
