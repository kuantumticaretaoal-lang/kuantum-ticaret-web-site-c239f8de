import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, userId, status, phone } = await req.json();

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log("Twilio credentials not configured, skipping SMS");
      return new Response(
        JSON.stringify({ success: false, message: "Twilio not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user phone if not provided
    let phoneNumber = phone;
    if (!phoneNumber && userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", userId)
        .single();
      
      phoneNumber = profile?.phone;
    }

    if (!phoneNumber) {
      console.log("No phone number found for user");
      return new Response(
        JSON.stringify({ success: false, message: "No phone number" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for Turkey
    let formattedPhone = phoneNumber.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "90" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("90")) {
      formattedPhone = "90" + formattedPhone;
    }
    formattedPhone = "+" + formattedPhone;

    // Get order details
    let orderCode = orderId;
    if (orderId && orderId.length > 15) {
      const { data: order } = await supabase
        .from("orders")
        .select("order_code")
        .eq("id", orderId)
        .single();
      orderCode = order?.order_code || orderId.substring(0, 8);
    }

    // Create status message
    const statusMessages: Record<string, string> = {
      confirmed: `Sipariş #${orderCode} onaylandı! Hazırlanmaya başlıyoruz.`,
      preparing: `Sipariş #${orderCode} hazırlanıyor.`,
      ready: `Sipariş #${orderCode} hazır! Kargoya verilecek.`,
      in_delivery: `Sipariş #${orderCode} kargoya verildi! Takip edebilirsiniz.`,
      delivered: `Sipariş #${orderCode} teslim edildi! Bizi tercih ettiğiniz için teşekkürler.`,
      rejected: `Sipariş #${orderCode} iptal edildi. Detaylar için hesabınızı kontrol edin.`,
    };

    const message = statusMessages[status] || `Sipariş #${orderCode} durumu güncellendi: ${status}`;

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: twilioPhoneNumber,
        Body: `Kuantum Ticaret: ${message}`,
      }),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error("Twilio error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: errorText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioData = await twilioResponse.json();
    console.log("SMS sent successfully:", twilioData.sid);

    return new Response(
      JSON.stringify({ success: true, messageSid: twilioData.sid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending SMS:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
