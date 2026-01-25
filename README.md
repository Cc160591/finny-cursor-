# Finny Web Demo 💰🤖

Finny è il tuo coach finanziario ironico, costruito con Next.js, Supabase e OpenAI.

## Caratteristiche
- **AI Chat**: Parla con Finny per registrare spese ("ho speso 10€ per una pizza").
- **Coaching Ironico**: Finny ti prende in giro se mangi troppa pizza (>=5 volte a settimana).
- **Auto-tracking**: Estrazione automatica dei dati dalle tue frasi.
- **Supabase Auth**: Accesso sicuro via email.

## Setup Supabase

1. Crea un progetto su [Supabase](https://supabase.com).
2. Vai nell'**SQL Editor** e incolla il contenuto di `supabase/migrations/initial_schema.sql` per creare tabelle e policy RLS.
3. In **Authentication -> URL Configuration**, aggiungi `http://localhost:3000/app` (e l'URL di Vercel dopo il deploy) come redirect URLs.

## Variabili d'Ambiente (.env.local)

Crea un file `.env.local` con le seguenti chiavi:

```env
# Supabase (Client & Server)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase Admin (Solo Server-side)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (Solo Server-side)
OPENAI_API_KEY=sk-your-openai-key
```

## Installazione e Avvio

1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```

## Deploy su Vercel

1. Collega il repository a Vercel.
2. Aggiungi le variabili d'ambiente sopra elencate nel pannello di controllo di Vercel.
3. Nota: `SUPABASE_SERVICE_ROLE_KEY` e `OPENAI_API_KEY` devono essere tenute segrete e non usate mai nel codice client-side.

## Sicurezza (RLS)
Tutte le tabelle hanno la **Row Level Security** abilitata. L'API `/api/chat` usa la `SERVICE_ROLE_KEY` per poter gestire la logica di sistema (come il conteggio delle transazioni recenti) in modo efficiente, ma associa sempre ogni operazione all'ID dell'utente autenticato verificato tramite il JWT.
