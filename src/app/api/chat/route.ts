import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const LOG_PATH = "/Users/christiancoli/finny-web/.cursor/debug.log";

function logToFile(payload: any) {
  try {
    const logDir = path.dirname(LOG_PATH);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify(payload) + "\n");
  } catch (e) {}
}

export async function POST(req: Request) {
  try {
// #region agent log
const log1 = {location:'api/chat/route.ts:18',message:'API Route Entry',data:{hasSupabaseUrl:!!process.env.SUPABASE_URL,hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY,hasOpenaiKey:!!process.env.OPENAI_API_KEY},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'2'};
logToFile(log1);
fetch('http://127.0.0.1:7244/ingest/96758caa-5fa3-4088-b7e9-c48caeafa71c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(log1)}).catch(()=>{});
// #endregion
    // 1. Validazione Variabili d'Ambiente
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      console.error("Missing environment variables", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasOpenaiKey: !!openaiApiKey,
      });
      return NextResponse.json(
        { error: "Configurazione server incompleta (variabili d'ambiente mancanti)" },
        { status: 500 }
      );
    }

    // 2. Inizializzazione Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // 3. Verifica Autenticazione Utente
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Token di autorizzazione mancante" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
// #region agent log
const log2 = {location:'api/chat/route.ts:40',message:'Auth Token Check',data:{tokenPreview:token.substring(0,10)+'...'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'3'};
logToFile(log2);
fetch('http://127.0.0.1:7244/ingest/96758caa-5fa3-4088-b7e9-c48caeafa71c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(log2)}).catch(()=>{});
// #endregion
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
// #region agent log
const log3 = {location:'api/chat/route.ts:45',message:'Auth Failed',data:{error:authError},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'3'};
logToFile(log3);
fetch('http://127.0.0.1:7244/ingest/96758caa-5fa3-4088-b7e9-c48caeafa71c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(log3)}).catch(()=>{});
// #endregion
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Sessione non valida o scaduta" }, { status: 401 });
    }

    // 4. Lettura Body
    const { message, history = [] } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Messaggio mancante" }, { status: 400 });
    }

    // 5. Fetch transazioni recenti (context per AI)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentTransactions } = await supabaseAdmin
      .from("transactions")
      .select("merchant, amount_cents, occurred_at")
      .eq("user_id", user.id)
      .gte("occurred_at", sevenDaysAgo);

    const pizzaCount = recentTransactions?.filter(t => 
      t.merchant?.toLowerCase().includes("pizza")
    ).length || 0;

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

    // 6. Chiamata OpenAI
// #region agent log
const log4 = {location:'api/chat/route.ts:98',message:'OpenAI Call Start',data:{model:'gpt-4o-mini'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'5'};
logToFile(log4);
fetch('http://127.0.0.1:7244/ingest/96758caa-5fa3-4088-b7e9-c48caeafa71c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(log4)}).catch(()=>{});
// #endregion
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-10).map((m: any) => ({
          role: m.role,
          content: m.content
        })),
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(response.choices[0].message.content || "{}");

// #region agent log
const log5 = {location:'api/chat/route.ts:114',message:'OpenAI Call Success',data:{aiMessage:aiResult.assistant_message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'5'};
logToFile(log5);
fetch('http://127.0.0.1:7244/ingest/96758caa-5fa3-4088-b7e9-c48caeafa71c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(log5)}).catch(()=>{});
// #endregion

    // 7. Persistenza messaggi
    await supabaseAdmin
      .from("chat_messages")
      .insert({ user_id: user.id, role: "user", content: message });

    const { data: assistantMsg } = await supabaseAdmin
      .from("chat_messages")
      .insert({ user_id: user.id, role: "assistant", content: aiResult.assistant_message })
      .select()
      .single();

    // 8. Esecuzione azioni estratte
    if (aiResult.actions) {
      for (const action of aiResult.actions) {
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

    return NextResponse.json(aiResult);

  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server", details: error.message },
      { status: 500 }
    );
  }
}
