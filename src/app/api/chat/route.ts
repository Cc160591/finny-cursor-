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
    
    // 5. Fetch Accounts (servono per validare selezioni e dare contesto)
    const { data: accounts } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("user_id", user.id);

    const finalActions = [];
    let assistantConfirmationMessage = "";

    // 6. Fix Bug: Se c'è una selezione conto pendente, creiamola SUBITO
    if (selected_account_id && pending_transaction) {
      const { data: transaction, error: tError } = await supabaseAdmin
        .from("transactions")
        .insert({
          user_id: user.id,
          account_id: selected_account_id,
          type: pending_transaction.type,
          amount_cents: pending_transaction.amount_cents,
          merchant: pending_transaction.merchant,
          notes: pending_transaction.notes
        })
        .select()
        .single();

      if (!tError) {
        const accountName = accounts?.find(a => a.id === selected_account_id)?.name || "conto selezionato";
        assistantConfirmationMessage = `Ottimo! Ho registrato la spesa di €${(pending_transaction.amount_cents / 100).toFixed(2)} su ${accountName}.`;
        
        // Salviamo il messaggio di conferma nel DB
        await supabaseAdmin
          .from("chat_messages")
          .insert({ user_id: user.id, role: "assistant", content: assistantConfirmationMessage });

        return NextResponse.json({
          assistant_message: assistantConfirmationMessage,
          actions: [{ type: "transaction_created", data: { ...pending_transaction, account_id: selected_account_id } }]
        });
      }
    }

    if (!message) {
      return NextResponse.json({ error: "Messaggio mancante" }, { status: 400 });
    }

    // 7. Fetch Context (History, Balances)
    
    // a. History dal DB (ultimi 15 messaggi)
    const { data: historyData } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);
    
    const chatHistory = (historyData || []).reverse();

    // b. Calcolo Saldi deterministico
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

    // c. Data e Timezone (Gennaio 2026)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long'
    });
    const currentTimeStr = formatter.format(now);

    const systemPrompt = `
      Sei Finny, un coach finanziario personale ironico e smart.
      Aiuti l'utente a gestire le sue finanze su diversi conti.

      DATI CORRENTI (IMPORTANTE):
      - Oggi è: ${currentTimeStr}
      - Timezone: Europe/Rome
      - Non inventare mai date o anni passati. Siamo nel 2026.

      REGOLE:
      1. Se l'utente vuole creare un conto, usa l'azione "create_account".
      2. Se l'utente registra una spesa/entrata:
         - Se l'utente specifica il nome del conto, usalo.
         - Se NON specifica e ci sono più conti, usa "needs_account_selection" per chiedere quale usare.
         - Se c'è solo un conto, usalo automaticamente senza chiedere.
         - Se non ci sono conti, dì all'utente che deve prima crearne uno.
      3. Se l'utente chiede il saldo, usa ESATTAMENTE i numeri nel CONTESTO sotto. Non fare calcoli a mente se halluncini.
      4. Se l'utente chiede un riepilogo delle spese:
         - Se NON specifica il periodo (es: "questo mese", "settimana scorsa"), usa "needs_date_range" per chiedere il periodo.
         - Se specifica il periodo, calcola il totale dalle transazioni nel contesto (se presenti) o chiedi i dati se non li hai.
      5. Sii ironico e smart, ma preciso al centesimo. Rispondi sempre in italiano.

      CONTESTO UTENTE:
      - Email: ${user.email}
      - Conti e Saldi Attuali: ${JSON.stringify(balancesContext)}

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
            "data": { "type": "expense" | "income", "amount_cents": number, "merchant": "string", "account_name": "string" }
          },
          {
            "type": "needs_account_selection",
            "data": { 
              "question": "Su quale conto?", 
              "options": [{ "id": "uuid", "name": "string" }],
              "pending_transaction": { "type": "expense" | "income", "amount_cents": number, "merchant": "string" }
            }
          },
          {
            "type": "needs_date_range",
            "data": { "message": "Per quale periodo vuoi il riepilogo?" }
          }
        ]
      }
    `;

    // 8. Chiamata OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory.map((m: any) => ({
          role: m.role,
          content: m.content
        })),
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(response.choices[0].message.content || "{}");

    // 9. Persistenza messaggi
    await supabaseAdmin
      .from("chat_messages")
      .insert({ user_id: user.id, role: "user", content: message });

    const { data: assistantMsg } = await supabaseAdmin
      .from("chat_messages")
      .insert({ user_id: user.id, role: "assistant", content: aiResult.assistant_message })
      .select()
      .single();

    // 10. Esecuzione azioni estratte
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
          let targetAccountId = null;
          
          if (action.data.account_name) {
            const acc = accounts?.find(a => a.name.toLowerCase() === action.data.account_name.toLowerCase());
            if (acc) targetAccountId = acc.id;
          }

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
            // Forza selezione se ambiguo
            finalActions.push({
              type: "needs_account_selection",
              data: {
                question: "Su quale conto vuoi registrare questa spesa?",
                options: accounts.map(a => ({ id: a.id, name: a.name })),
                pending_transaction: action.data
              }
            });
          } else if (accounts && accounts.length === 1) {
            // Unico conto
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
        
        if (action.type === "needs_account_selection" || action.type === "needs_date_range") {
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
