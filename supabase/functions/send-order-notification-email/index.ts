 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 // Simple HTTP email function without external deps
 async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
   const response = await fetch("https://api.resend.com/emails", {
     method: "POST",
     headers: {
       "Authorization": `Bearer ${apiKey}`,
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       from: "Kuantum Ticaret <onboarding@resend.dev>",
       to: [to],
       subject,
       html,
     }),
   });
   
   if (!response.ok) {
     const error = await response.text();
     throw new Error(`Resend API error: ${error}`);
   }
   
   return await response.json();
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const resendApiKey = Deno.env.get("RESEND_API_KEY");
     if (!resendApiKey) {
       console.error("RESEND_API_KEY not configured");
       return new Response(
         JSON.stringify({ error: "Email service not configured" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseKey);
 
     const { orderId, userId, message } = await req.json();
 
     if (!orderId || !userId || !message) {
       return new Response(
         JSON.stringify({ error: "Missing required fields" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Get user email
     const { data: profile } = await supabase
       .from("profiles")
       .select("email, first_name, last_name")
       .eq("id", userId)
       .single();
 
     if (!profile || !profile.email) {
       console.log("No email found for user:", userId);
       return new Response(
         JSON.stringify({ success: false, error: "User email not found" }),
         { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Get order details
     const { data: order } = await supabase
       .from("orders")
       .select("order_code, status, total_amount")
       .eq("id", orderId)
       .single();
 
     const statusText: Record<string, string> = {
       confirmed: "Onaylandı",
       preparing: "Hazırlanıyor",
       ready: "Hazır",
       in_delivery: "Teslimatta",
       delivered: "Teslim Edildi",
       rejected: "Reddedildi",
     };
 
     const emailHtml = `
       <!DOCTYPE html>
       <html>
         <head>
           <meta charset="utf-8">
           <style>
             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
             .container { max-width: 600px; margin: 0 auto; padding: 20px; }
             .header { background: #000; color: #fff; padding: 20px; text-align: center; }
             .content { background: #f9f9f9; padding: 30px; margin: 20px 0; border-radius: 8px; }
             .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
             .status { display: inline-block; padding: 8px 16px; background: #4CAF50; color: white; border-radius: 4px; }
           </style>
         </head>
         <body>
           <div class="container">
             <div class="header">
               <h1>Kuantum Ticaret</h1>
             </div>
             <div class="content">
               <h2>Merhaba ${profile.first_name} ${profile.last_name},</h2>
               <p>${message}</p>
               ${order ? `
                 <p><strong>Sipariş Kodu:</strong> ${order.order_code}</p>
                 <p><strong>Durum:</strong> <span class="status">${statusText[order.status] || order.status}</span></p>
                 <p><strong>Toplam Tutar:</strong> ₺${parseFloat(order.total_amount).toFixed(2)}</p>
               ` : ''}
             </div>
             <div class="footer">
               <p>Bu e-posta Kuantum Ticaret tarafından otomatik olarak gönderilmiştir.</p>
             </div>
           </div>
         </body>
       </html>
     `;
 
     const data = await sendEmail(
       resendApiKey,
       profile.email,
       `Sipariş Güncellemesi - ${order?.order_code || ""}`,
       emailHtml
     );
 
     console.log("Email sent successfully:", data);
     return new Response(
       JSON.stringify({ success: true, data }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error: any) {
     console.error("Error sending email:", error);
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });