import { browserStorage } from "@/lib/browser-storage";
import { supabase } from "@/integrations/supabase/client";
import { readStoredArray } from "@/lib/browser-storage";
import { CART_CHANGED_EVENT, CART_MERGE_ERROR_EVENT, GUEST_CART_KEY, isGuestCartItem, sameConfiguration, type GuestCartItem } from "./guest-cart";

const guestItems = () => readStoredArray(GUEST_CART_KEY, isGuestCartItem).slice(0, 100);
const changed = () => window.dispatchEvent(new Event(CART_CHANGED_EVENT));
const saveGuest = (items: GuestCartItem[]) => {
  browserStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  changed();
};
let mergeInFlight: Promise<void> | undefined;
export async function mergeGuestCart() {
  if (mergeInFlight) return mergeInFlight;
  mergeInFlight = (async () => {
    const items = guestItems();
    if (!items.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await (supabase as any).rpc("import_guest_cart", { p_items: items });
    if (error) {
      window.dispatchEvent(new CustomEvent(CART_MERGE_ERROR_EVENT, { detail: error.message }));
      return; // Retain the local selection until the entire import succeeds.
    }
    const imported = new Set(items.map(item => item.id));
    browserStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestItems().filter(item => !imported.has(item.id))));
  })().finally(() => { mergeInFlight = undefined; });
  return mergeInFlight;
}

export const getSessionId = () => {
  let sessionId = browserStorage.getItem("cart_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    browserStorage.setItem("cart_session_id", sessionId);
  }
  return sessionId;
};

export const addToCart = async (
  productId: string, 
  quantity: number = 1, 
  customName?: string, 
  selectedSize?: string, 
  customPhotoUrl?: string,
  selectedOrnaments?: Array<{ id: string; name: string; extra_price: number; quantity: number }>,
  braceletCordColor?: string
) => {
  // Validate quantity is safe integer
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return { 
      error: { 
        message: 'Geçersiz miktar. 1-999 arasında tam sayı olmalıdır.',
        code: 'INVALID_QUANTITY' 
      } as any
    };
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Check product stock and get product details
  const { data: product, error: productError } = await (supabase as any)
    .from("products")
    .select("stock_quantity, stock_status, is_name_customizable, allows_custom_photo, available_sizes, allowed_file_types")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return { error: { message: "Ürün bulunamadı" } as any };
  }

  if (product.stock_status === 'out_of_stock') {
    return { error: { message: "Ürün stokta yok" } as any };
  }

  // Validate required customizations
  if (product.is_name_customizable && !customName?.trim()) {
    return { error: { message: "Bu ürün için isim girişi zorunludur" } as any };
  }

  if (product.available_sizes && product.available_sizes.length > 0 && !selectedSize) {
    return { error: { message: "Bu ürün için beden seçimi zorunludur" } as any };
  }

  if (product.allows_custom_photo && !customPhotoUrl) {
    return { error: { message: "Bu ürün için fotoğraf yükleme zorunludur" } as any };
  }

  const selection: GuestCartItem = {
    id: crypto.randomUUID(), product_id: productId, quantity,
    custom_name: customName || null, selected_size: selectedSize || null,
    custom_photo_url: customPhotoUrl || null, selected_ornaments: selectedOrnaments || [],
    bracelet_cord_color: braceletCordColor || null,
  };
  if (!isGuestCartItem(selection)) return { error: { message: "Geçersiz ürün seçimi" } as any };
  if (!user) {
    const items = guestItems();
    const existing = items.find(item => sameConfiguration(item, selection));
    const total = (existing?.quantity || 0) + quantity;
    if (total > 999 || (product.stock_quantity !== null && total > product.stock_quantity)) {
      return { error: { message: "Stok sınırı aşıldı" } as any };
    }
    if (existing) existing.quantity = total;
    else {
      if (items.length >= 100) return { error: { message: "Sepet dolu" } as any };
      items.push(selection);
    }
    saveGuest(items);
    return { error: null };
  }

  await mergeGuestCart();
  // Match the complete customization, not just the product.
  const { data: existing } = await (supabase as any)
    .from("cart")
    .select("*")
    .eq("product_id", productId)
    .eq("user_id", user.id);

  const match = existing?.find((item: GuestCartItem) => sameConfiguration(item, selection));

  if (match) {
    // Check if new total would exceed stock
    const newQuantity = match.quantity + quantity;
    if (product.stock_quantity !== null && newQuantity > product.stock_quantity) {
      return { error: { message: `Maksimum ${product.stock_quantity} adet ekleyebilirsiniz` } as any };
    }

    // Update quantity
    const { error } = await (supabase as any)
      .from("cart")
      .update({ quantity: newQuantity })
      .eq("id", match.id)
      .eq("user_id", user.id);
    if (!error) changed();
    return { error };
  } else {
    // Check stock for new item
    if (product.stock_quantity !== null && quantity > product.stock_quantity) {
      return { error: { message: `Maksimum ${product.stock_quantity} adet ekleyebilirsiniz` } as any };
    }

    // Insert new
    const { error } = await (supabase as any).rpc("import_guest_cart", { p_items: [selection] });
    if (!error) changed();
    return { error };
  }
};

export const getCartItems = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const items = guestItems();
    if (!items.length) return [];
    const { data } = await supabase.from("products").select("id, title, price, discounted_price, product_images(image_url)")
      .in("id", items.map(item => item.product_id));
    return items.map(item => ({ ...item, user_id: null, session_id: null, products: data?.find(p => p.id === item.product_id) }))
      .filter(item => item.products);
  }
  await mergeGuestCart();

  const { data } = await (supabase as any)
    .from("cart")
    .select(`
      *,
      products (
        id,
        title,
        price,
        discounted_price,
        product_images (
          image_url
        )
      )
    `)
    .eq("user_id", user.id);

  return data || [];
};

export const updateCartQuantity = async (cartId: string, quantity: number) => {
  // Validate quantity
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999) {
    return { 
      error: { 
        message: 'Geçersiz miktar. 0-999 arasında tam sayı olmalıdır.' 
      } as any
    };
  }

  if (quantity === 0) {
    return removeFromCart(cartId);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const items = guestItems();
    const item = items.find(item => item.id === cartId);
    if (!item) return { error: { message: "Ürün bulunamadı" } as any };
    item.quantity = quantity;
    saveGuest(items);
    return { error: null };
  }

  const { error } = await (supabase as any)
    .from("cart")
    .update({ quantity })
    .eq("id", cartId)
    .eq("user_id", user.id);

  if (!error) changed();

  return { error };
};

export const removeFromCart = async (cartId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { saveGuest(guestItems().filter(item => item.id !== cartId)); return { error: null }; }
  const { error } = await (supabase as any)
    .from("cart")
    .delete()
    .eq("id", cartId)
    .eq("user_id", user.id);

  if (!error) changed();

  return { error };
};

export const clearCart = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { saveGuest([]); return { error: null }; }

  const { error } = await (supabase as any)
    .from("cart")
    .delete()
    .eq("user_id", user.id);

  if (!error) changed();

  return { error };
};
