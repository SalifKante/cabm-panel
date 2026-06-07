import React, { useContext, useMemo, useState } from "react";
import { AdminContext } from "../context/AdminContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loginError, setLoginError] = useState(""); // inline server-side error

  const navigate = useNavigate();
  const { setAToken, backendUrl } = useContext(AdminContext);

  // --- Validation ---
  const isEmail = (v = "") => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v.trim());

  const errors = useMemo(() => {
    const e = {};
    if (!email.trim()) e.email = "L’adresse e-mail est requise.";
    else if (!isEmail(email)) e.email = "Adresse e-mail invalide.";

    if (!password) e.password = "Le mot de passe est requis.";
    else if (password.length < 8)
      e.password = "Le mot de passe doit contenir au moins 8 caractères.";
    return e;
  }, [email, password]);

  const showEmailError = touched.email && !!errors.email;
  const showPasswordError = touched.password && !!errors.password;

  // --- Submit (auth logic unchanged: POST /api/admin/login → aToken) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setTouched({ email: true, password: true });

    if (Object.keys(errors).length) {
      setLoginError(errors.email || errors.password || "Veuillez corriger les erreurs.");
      return;
    }

    if (!backendUrl) {
      setLoginError("URL du serveur non définie. Vérifiez votre configuration.");
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axios.post(`${backendUrl}/api/admin/login`, {
        email: email.trim(),
        password,
      });

      if (data?.success && data?.token) {
        toast.success("Connexion réussie. Bienvenue !");
        localStorage.setItem("aToken", data.token);
        setAToken(data.token);
        setTimeout(() => navigate("/dashboard", { replace: true }), 50);
      } else {
        setLoginError(data?.message || "Échec de la connexion.");
      }
    } catch (err) {
      setLoginError(
        err?.response?.data?.message ||
          err?.message ||
          "Une erreur est survenue lors de la connexion."
      );
      console.error("Error during login:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase =
    "w-full rounded-xl border bg-white pl-10 pr-3 py-2.5 text-sm outline-none transition";
  const inputOk = "border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20";
  const inputErr = "border-red-400 focus:ring-2 focus:ring-red-200";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FD] px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center">
          <img
            src="/logo/logo1.jpg"
            alt="CABM"
            className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-md ring-1 ring-slate-200"
          />
          <h1 className="mt-3 text-xl font-semibold text-slate-800">
            Administration CABM
          </h1>
          <p className="text-sm text-slate-500">
            Complexe Agro Business Mali
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Connexion</h2>
          <p className="mb-5 text-sm text-slate-500">
            Connectez-vous pour accéder au tableau de bord.
          </p>

          {/* Inline error */}
          {loginError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="admin@cabmsarl.org"
                  className={`${inputBase} ${showEmailError ? inputErr : inputOk}`}
                  aria-invalid={!!showEmailError}
                />
              </div>
              {showEmailError && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Mot de passe
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="••••••••"
                  className={`${inputBase} pr-10 ${showPasswordError ? inputErr : inputOk}`}
                  aria-invalid={!!showPasswordError}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPwd ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {showPasswordError && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {submitting ? "Connexion en cours…" : "Se connecter"}
            </button>
          </form>
        </div>

        {/* Footer accent */}
        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} CABM — Bamako, Mali ·{" "}
          <span className="text-amber-500 font-medium">Espace administrateur</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
