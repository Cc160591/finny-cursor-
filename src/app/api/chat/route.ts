import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    // 1. Validazione Variabili d'Ambiente
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      return NextResponse.json(
        { error: "Configurazione server incompleta" },
        { status: 500 }
      );
    }

    // 2. Inizializzazione Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // 3. Verifica Autenticazione Utente
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Token mancante" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
    }

    // 4. Lettura Body
    const { message, selected_account_id, pending_transaction } = await req.json();
    if (!message && !selected_account_id) {
      return NextResponse.json({ error: "Messaggio mancante" }, { status: 400 });
    }

    // 5. Fetch Context (History, Accounts, Balances)
    
    // a. History dal DB (ultimi 15 messaggi)
    const { data: historyData } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);
    
    const chatHistory = (historyData || []).reverse();

    // b. Accounts dal DB
    const { data: accounts } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("user_id", user.id);

    // c. Calcolo Saldi per il contesto
    const balancesContext = [];
    if (accounts && accounts.length > 0) {
      for (const acc of accounts) {
        const { data: transactions } = await supabaseAdmin
          .from("transactions")
          .select("type, amount_cents")
          .eq("account_id", acc.id);
        
        const balance = (transactions || []).reduce((accu, t) => {
          return t.type === 'income' ? accu + Number(t.amount_cents) : accu - Number(t.amount_cents);
        }, Number(acc.initial_balance_cents));
        
        balancesContext.push({
          id: acc.id,
          name: acc.name,
          balance_cents: balance,
          currency: acc.currency
        });
      }
    }

    const systemPrompt = `
      Sei Finny, un coach finanziario personale ironico e smart.
      Aiuti l'utente a gestire le sue finanze su diversi conti.

      REGOLE:
      1. Se l'utente vuole creare un conto, usa l'azione "create_account".
      2. Se l'utente registra una spesa/entrata:
         - Se l'utente specifica il nome del conto, usalo.
         - Se NON specifica e ci sono più conti, usa "needs_account_selection" per chiedere quale usare.
         - Se c'è solo un conto, usalo automaticamente.
         - Se non ci sono conti, dì all'utente che deve prima crearne uno.
      3. Se l'utente chiede il saldo, hai i dati nel CONTESTO sotto.
      4. Se l'utente chiede un riepilogo e ha più conti, chiedi se lo vuole per un conto specifico o per tutti.
      5. Sii ironico e smart, ma professionale nei calcoli. Rispondi sempre in italiano.

      CONTESTO UTENTE:
      - Email: ${user.email}
      - Conti attuali: ${JSON.stringify(balancesContext)}

      FORMATO RISPOSTA (JSON STRICT):
      {
        "assistant_message": "La tua risposta colloquiale",
        "actions": [
          {
            "type": "create_account",
            "data": { "name": "string", "initial_balance_cents": number }
          },
          {
            "type": "create_transaction",
            "data": { "type": "expense" | "income", "amount_cents": number, "merchant": "string", "account_id": "string", "account_name": "string" }
          },
          {
            "type": "needs_account_selection",
            "data": { 
              "question": "Quale conto vuoi usare?", 
              "options": [{ "id": "uuid", "name": "string" }],
              "pending_transaction": { "type": "expense" | "income", "amount_cents": number, "merchant": "string" }
            }
          }
        ]
      }
    `;

    // 6. Chiamata OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory.map((m: any) => ({
          role: m.role,
          content: m.content
        })),
        { role: "user", content: message || `Ho selezionato il conto ${accounts?.find(a => a.id === selected_account_id)?.name}` }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(response.choices[0].message.content || "{}");

    // 7. Persistenza messaggi
    if (message) {
      await supabaseAdmin
        .from("chat_messages")
        .insert({ user_id: user.id, role: "user", content: message });
    }

    const { data: assistantMsg } = await supabaseAdmin
      .from("chat_messages")
      .insert({ user_id: user.id, role: "assistant", content: aiResult.assistant_message })
      .select()
      .single();

    // 8. Esecuzione azioni estratte
    const finalActions = [];
    if (aiResult.actions) {
      for (const action of aiResult.actions) {
        if (action.type === "create_account") {
          const { data: newAcc } = await supabaseAdmin
            .from("accounts")
            .insert({
              user_id: user.id,
              name: action.data.name,
              initial_balance_cents: action.data.initial_balance_cents
            })
            .select()
            .single();
          finalActions.push({ type: "account_created", data: newAcc });
        }

        if (action.type === "create_transaction") {
          let targetAccountId = action.data.account_id;
          
          // Se l'AI ha fornito il nome ma non l'ID, cerchiamolo
          if (!targetAccountId && action.data.account_name) {
            const acc = accounts?.find(a => a.name.toLowerCase() === action.data.account_name.toLowerCase());
            if (acc) targetAccountId = acc.id;
          }

          // Se abbiamo l'ID, creiamo la transazione
          if (targetAccountId) {
            await supabaseAdmin.from("transactions").insert({
              user_id: user.id,
              account_id: targetAccountId,
              type: action.data.type,
              amount_cents: action.data.amount_cents,
              merchant: action.data.merchant,
              message_id: assistantMsg?.id
            });
            finalActions.push({ type: "transaction_created", data: action.data });
          } else if (accounts && accounts.length > 1) {
            // Se non abbiamo l'ID e ci sono più conti, forziamo la selezione
            aiResult.actions.push({
              type: "needs_account_selection",
              data: {
                question: "Su quale conto vuoi registrare questa spesa?",
                options: accounts.map(a => ({ id: a.id, name: a.name })),
                pending_transaction: action.data
              }
            });
          } else if (accounts && accounts.length === 1) {
            // Se c'è un solo conto, usiamolo
            await supabaseAdmin.from("transactions").insert({
              user_id: user.id,
              account_id: accounts[0].id,
              type: action.data.type,
              amount_cents: action.data.amount_cents,
              merchant: action.data.merchant,
              message_id: assistantMsg?.id
            });
            finalActions.push({ type: "transaction_created", data: { ...action.data, account_id: accounts[0].id } });
          }
        }
        
        // Se l'azione è needs_account_selection, la passiamo pulita al client
        if (action.type === "needs_account_selection") {
          finalActions.push(action);
        }
      }
    }

    return NextResponse.json({
      ...aiResult,
      actions: finalActions
    });

  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server", details: error.message },
      { status: 500 }
    );
  }
}
