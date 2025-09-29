import React, { useContext, useMemo, useState } from "react";
import { AdminContext } from "../context/AdminContext";
import axios from "axios";
import { toast } from "react-toastify";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [state] = useState("Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const navigate = useNavigate();
  const { setAToken, backendUrl } = useContext(AdminContext);

  // --- Validation helpers ----------------------------------------------------
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

  // --- Submit ---------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({ email: true, password: true });

    if (Object.keys(errors).length) {
      const firstMsg = errors.email || errors.password || "Veuillez corriger les erreurs.";
      toast.error(firstMsg);
      return;
    }

    if (!backendUrl) {
      toast.error("URL du serveur non définie. Vérifiez votre configuration.");
      return;
    }

    try {
      setSubmitting(true);

      if (state === "Admin") {
        const { data } = await axios.post(`${backendUrl}/api/admin/login`, {
          email: email.trim(),
          password,
        });

        if (data?.success && data?.token) {
          // Toast first so it renders even if layout changes
          toast.success("Connexion réussie. Bienvenue !");

          // Persist token and update context
          localStorage.setItem("aToken", data.token);
          setAToken(data.token);

          // Navigate to dashboard (slight delay lets toast mount in root)
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 50);
        } else {
          const msg = data?.message || "Échec de la connexion.";
          toast.error(msg);
        }
      }
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Une erreur est survenue lors de la connexion.";
      toast.error(apiMsg);
      console.error("Error during login:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="min-h-[80vh] flex items-center">
      <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-sm shadow-lg">
        <p className="text-2xl font-semibold m-auto">
          <span className="text-primary">Connexion {state}</span>
        </p>

        {/* Email */}
        <div className="w-full">
          <label htmlFor="email" className="block">
            Email
          </label>
          <input
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            value={email}
            className={`border rounded w-full p-2 mt-1 outline-none ${
              showEmailError ? "border-red-500" : "border-[#DADADA] focus:border-primary"
            }`}
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={!!showEmailError}
            aria-describedby="email-error"
          />
          {showEmailError && (
            <p id="email-error" className="text-red-600 text-xs mt-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password with eye toggle */}
        <div className="w-full">
          <label htmlFor="password" className="block">
            Mot de passe
          </label>

          <div className="relative">
            <input
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              value={password}
              className={`border rounded w-full p-2 mt-1 pr-10 outline-none ${
                showPasswordError ? "border-red-500" : "border-[#DADADA] focus:border-primary"
              }`}
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={!!showPasswordError}
              aria-describedby="password-error"
              minLength={8}
            />

            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500"
            >
              {showPwd ? (
                <AiOutlineEyeInvisible size={20} aria-hidden="true" />
              ) : (
                <AiOutlineEye size={20} aria-hidden="true" />
              )}
            </button>
          </div>

          {showPasswordError && (
            <p id="password-error" className="text-red-600 text-xs mt-1">
              {errors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2 rounded-md text-base text-white transition ${
            submitting ? "bg-primary-400 cursor-not-allowed" : "bg-primary-700 hover:bg-primary-800"
          }`}
        >
          {submitting ? "Connexion en cours…" : "Se connecter"}
        </button>
      </div>
    </form>
  );
};

export default Login;
