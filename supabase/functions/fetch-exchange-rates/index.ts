import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching exchange rates from API...");

    // Frankfurter API - Free, no API key required, reliable
    const response = await fetch(
      "https://api.frankfurter.app/latest?from=TRY&to=USD,EUR,GBP"
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Exchange rate data received:", data);

    // Rates from API: TRY base, so values are how much 1 TRY equals in other currencies
    const rates = data.rates;

    // Update database with new rates
    for (const [currency, rate] of Object.entries(rates)) {
      const { error } = await supabase
        .from("exchange_rates")
        .upsert(
          {
            from_currency: "TRY",
            to_currency: currency,
            rate: rate as number,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "from_currency,to_currency" }
        );

      if (error) {
        console.error(`Error updating ${currency} rate:`, error);
      } else {
        console.log(`Updated ${currency} rate: ${rate}`);
      }
    }

    // Get all current rates from database
    const { data: currentRates, error: fetchError } = await supabase
      .from("exchange_rates")
      .select("*");

    if (fetchError) {
      throw fetchError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Exchange rates updated successfully",
        rates: currentRates,
        source: "frankfurter.app",
        updated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error fetching exchange rates:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
