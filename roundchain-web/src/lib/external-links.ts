/** Google Docs product guide (view link, not edit). */
export const DEFAULT_PRODUCT_GUIDE_URL =
  "https://docs.google.com/document/d/11jIQBBCZt_G8uq_7wi7Js3FTr1SCJUidJ7oKYsohw1Q/view?usp=sharing";

export const PRODUCT_GUIDE_URL =
  process.env.NEXT_PUBLIC_PRODUCT_GUIDE_URL?.trim() || DEFAULT_PRODUCT_GUIDE_URL;
