export const GUEST_CART_KEY = "kuantum:guest-cart:v1";
export const CART_CHANGED_EVENT = "kuantum:cart-changed";
export const CART_MERGE_ERROR_EVENT = "kuantum:cart-merge-error";
export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export type GuestCartItem = {
  id: string; product_id: string; quantity: number;
  custom_name: string | null; selected_size: string | null; custom_photo_url: string | null;
  selected_ornaments: Array<{ id: string; name: string; extra_price: number; quantity: number }>;
  bracelet_cord_color: string | null;
};
export function isGuestCartItem(value: unknown): value is GuestCartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as GuestCartItem;
  const optionalText = (v: unknown) => v === null || (typeof v === "string" && v.length <= 2048);
  return isUuid(item.id) && isUuid(item.product_id) && Number.isInteger(item.quantity)
    && item.quantity >= 1 && item.quantity <= 999
    && [item.custom_name, item.selected_size, item.custom_photo_url, item.bracelet_cord_color].every(optionalText)
    && Array.isArray(item.selected_ornaments) && item.selected_ornaments.length <= 100
    && item.selected_ornaments.every(o => o && isUuid(o.id) && typeof o.name === "string"
      && Number.isFinite(o.extra_price) && o.extra_price >= 0 && Number.isInteger(o.quantity) && o.quantity >= 1 && o.quantity <= 999);
}
export function sameConfiguration(a: GuestCartItem, b: GuestCartItem) {
  return a.product_id === b.product_id && a.custom_name === b.custom_name && a.selected_size === b.selected_size
    && a.custom_photo_url === b.custom_photo_url && a.bracelet_cord_color === b.bracelet_cord_color
    && JSON.stringify(a.selected_ornaments) === JSON.stringify(b.selected_ornaments);
}