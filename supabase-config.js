// ===== SUPABASE CLIENT & BOUTIQUE CONFIGURATION =====
// NOTE: Only use your public 'anon' / publishable key here. NEVER expose your 'service_role' key in frontend code!

const SUPABASE_URL = "https://iepuklsehkpwkjfgxbkg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NGwHmQTnuZoZWbBg9Wp42A_MJy7Ctoy";

// ===== BOUTIQUE WHATSAPP NUMBER CONFIGURATION =====
// Enter your 10 or 12 digit phone number with country code (e.g. "919876543210" for +91 India).
// Do NOT include '+', '-', or spaces.
const BOUTIQUE_WHATSAPP_NUMBER = "919876543210";
window.BOUTIQUE_WHATSAPP_NUMBER = BOUTIQUE_WHATSAPP_NUMBER;

// Global client reference attached to window for reliable access across all scripts
window.supabaseClient = null;

// Initialize Supabase client if SDK is loaded and credentials are provided
if (typeof supabase !== "undefined" && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✓ Supabase client initialized successfully for VANYA Handlooms.");
    } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
    }
}

// Global variable alias
var supabaseClient = window.supabaseClient;
