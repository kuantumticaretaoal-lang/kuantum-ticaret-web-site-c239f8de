import { supabase } from "@/integrations/supabase/client";

export const getSessionId = () => {
  let sessionId = localStorage.getItem("cart_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem("cart_session_id", sessionId);
  }
  return sessionId;
};

export const addToCart = async (
  productId: string, 
  quantity: number = 1, 
  customName?: string, 
  selectedSize?: string, 
  customPhotoUrl?: string
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
  const sessionId = user ? null : getSessionId();

  // Check if product already in cart
  const { data: existing } = await (supabase as any)
    .from("cart")
    .select("*")
    .eq("product_id", productId)
    .eq(user ? "user_id" : "session_id", user ? user.id : sessionId)
    .maybeSingle();

  if (existing) {
    // Update quantity
    const { error } = await (supabase as any)
      .from("cart")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id);
    return { error };
  } else {
    // Insert new
    const { error } = await (supabase as any)
      .from("cart")
      .insert({
        product_id: productId,
        quantity,
        user_id: user?.id || null,
        session_id: sessionId,
        custom_name: customName || null,
        selected_size: selectedSize || null,
        custom_photo_url: customPhotoUrl || null,
      });
    return { error };
  }
};

export const getCartItems = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const sessionId = user ? null : getSessionId();

  const { data } = await (supabase as any)
    .from("cart")
    .select(`
      *,
      products (
        id,
        title,
        price,
        product_images (
          image_url
        )
      )
    `)
    .eq(user ? "user_id" : "session_id", user ? user.id : sessionId);

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

  const { error } = await (supabase as any)
    .from("cart")
    .update({ quantity })
    .eq("id", cartId);

  return { error };
};

export const removeFromCart = async (cartId: string) => {
  const { error } = await (supabase as any)
    .from("cart")
    .delete()
    .eq("id", cartId);

  return { error };
};

export const clearCart = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const sessionId = user ? null : getSessionId();

  const { error } = await (supabase as any)
    .from("cart")
    .delete()
    .eq(user ? "user_id" : "session_id", user ? user.id : sessionId);

  return { error };
};
