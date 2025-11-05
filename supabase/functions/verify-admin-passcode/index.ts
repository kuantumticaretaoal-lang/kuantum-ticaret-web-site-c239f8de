// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // attempts per IP per hour
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds

// Clean up old rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now >= data.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 600000);

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Will be restricted after domain setup
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    
    // Check rate limit
    const rateData = rateLimitMap.get(clientIp);
    if (rateData) {
      if (now < rateData.resetAt && rateData.count >= RATE_LIMIT) {
        return new Response(JSON.stringify({ 
          error: "rate_limit_exceeded",
          message: "Too many attempts. Please try again later."
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (now >= rateData.resetAt) {
        rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
      } else {
        rateData.count++;
      }
    } else {
      rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }

    const { code } = await req.json().catch(() => ({}));
    if (!code) {
      return new Response(JSON.stringify({ error: "code_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = Deno.env.get("ADMIN_SECOND_PASSWORD");
    if (!expected) {
      return new Response(JSON.stringify({ error: "not_configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (code === expected) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "unexpected_error", 
      details: String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
