import { expect, test } from "bun:test";
import { isGuestCartItem, sameConfiguration, type GuestCartItem } from "./guest-cart";
const item: GuestCartItem = {
  id: "00000000-0000-4000-8000-000000000001", product_id: "00000000-0000-4000-8000-000000000002", quantity: 1,
  custom_name: "ELİF", selected_size: "M", custom_photo_url: null, selected_ornaments: [], bracelet_cord_color: "red",
};
test("guest selection retains complete customization", () => {
  expect(isGuestCartItem(item)).toBe(true);
  expect(sameConfiguration(item, { ...item, custom_name: "ECE" })).toBe(false);
  expect(sameConfiguration(item, { ...item, bracelet_cord_color: "blue" })).toBe(false);
  expect(sameConfiguration(item, { ...item, selected_size: "L" })).toBe(false);
});
test("untrusted persisted quantities and identifiers are rejected", () => {
  for (const quantity of [-1, 0, 0.5, 1000, "2"]) expect(isGuestCartItem({ ...item, quantity })).toBe(false);
  expect(isGuestCartItem({ ...item, product_id: "session_attacker" })).toBe(false);
  expect(isGuestCartItem({ ...item, selected_ornaments: {} })).toBe(false);
});