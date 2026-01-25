"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push("/app");
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setError("Controlla la tua email per confermare l'iscrizione!");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-finny-gradient items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-finny-accent italic">Finny</h1>
          <p className="text-finny-dark mt-2">Il tuo coach finanziario ironico</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-finny-dark ml-4 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-3 bg-finny-beige/30 border-none rounded-full focus:ring-2 focus:ring-finny-accent/20 outline-none"
              placeholder="latua@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-finny-dark ml-4 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-3 bg-finny-beige/30 border-none rounded-full focus:ring-2 focus:ring-finny-accent/20 outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center px-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-finny-accent text-white py-4 rounded-full font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Caricamento..." : "Accedi"}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={handleSignUp}
            className="text-finny-dark text-sm hover:underline"
          >
            Non hai un account? Registrati
          </button>
        </div>
      </div>
    </div>
  );
}
