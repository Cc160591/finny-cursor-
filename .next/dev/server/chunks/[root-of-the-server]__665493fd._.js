module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/app/api/chat/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
;
;
// Configurazione OpenAI
const openai = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
    apiKey: process.env.OPENAI_API_KEY
});
// Client Supabase con Service Role (per bypassare RLS e scrivere logica di sistema)
const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(req) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "No token"
        }, {
            status: 401
        });
        const token = authHeader.replace("Bearer ", "");
        // Verifica utente
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unauthorized"
        }, {
            status: 401
        });
        const { message, history = [] } = await req.json();
        // 1. Fetch recent pizza transactions to check for the "too many pizzas" rule
        const { data: recentTransactions } = await supabaseAdmin.from("transactions").select("merchant, amount_cents, occurred_at").eq("user_id", user.id).gte("occurred_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        const pizzaCount = recentTransactions?.filter((t)=>t.merchant?.toLowerCase().includes("pizza")).length || 0;
        const systemPrompt = `
      Sei Finny, un coach finanziario personale ironico e smart.
      Il tuo compito è aiutare l'utente a gestire le sue finanze.
      
      CONTEXT:
      - Utente: ${user.email}
      - Pizze mangiate negli ultimi 7 giorni: ${pizzaCount}
      
      REGOLE:
      1. Se l'utente descrive una spesa o un'entrata, DEVI estrarre i dati.
      2. Sii ironico se l'utente spende troppo in cose superflue (es: pizza, drink).
      3. Se l'utente ha mangiato 5 o più pizze in una settimana, faglielo notare con sarcasmo.
      4. Rispondi sempre in italiano, in modo colloquiale ma professionale.
      
      FORMATO RISPOSTA (JSON STRICT):
      {
        "assistant_message": "Testo della tua risposta ironica",
        "actions": [
          {
            "type": "create_transaction",
            "data": {
              "type": "expense" | "income",
              "amount_cents": number,
              "merchant": "string",
              "notes": "string"
            }
          }
        ]
      }
    `;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                ...history.slice(-10),
                {
                    role: "user",
                    content: message
                }
            ],
            response_format: {
                type: "json_object"
            }
        });
        const aiResult = JSON.parse(response.choices[0].message.content || "{}");
        // 2. Persistenza su Supabase
        const { data: userMsg } = await supabaseAdmin.from("chat_messages").insert({
            user_id: user.id,
            role: "user",
            content: message
        }).select().single();
        const { data: assistantMsg } = await supabaseAdmin.from("chat_messages").insert({
            user_id: user.id,
            role: "assistant",
            content: aiResult.assistant_message
        }).select().single();
        // 3. Esegui azioni (es: crea transazione)
        if (aiResult.actions) {
            for (const action of aiResult.actions){
                if (action.type === "create_transaction") {
                    await supabaseAdmin.from("transactions").insert({
                        user_id: user.id,
                        type: action.data.type,
                        amount_cents: action.data.amount_cents,
                        merchant: action.data.merchant,
                        notes: action.data.notes,
                        message_id: assistantMsg?.id
                    });
                }
            }
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(aiResult);
    } catch (error) {
        console.error(error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__665493fd._.js.map