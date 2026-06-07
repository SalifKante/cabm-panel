import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import {
  FiUser,
  FiMail,
  FiLock,
  FiCamera,
  FiEye,
  FiEyeOff,
  FiSave,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB

const Profile = () => {
  const { backendUrl, aToken, admin, setAdmin, fetchAdminProfile } =
    useContext(AdminContext);

  /* ------------------------------- profile -------------------------------- */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null); // object URL for new file
  const fileInputRef = useRef(null);

  const [savingProfile, setSavingProfile] = useState(false);

  /* ------------------------------- password ------------------------------- */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Hydrate the form from context (and refresh from the server on mount)
  useEffect(() => {
    if (admin) {
      setFirstName(admin.firstName || "");
      setLastName(admin.lastName || "");
      setEmail(admin.email || "");
    }
  }, [admin]);

  useEffect(() => {
    fetchAdminProfile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ avatar pick ----------------------------- */
  const onPickFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.warn(`${file.name} (format non supporté)`);
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.warn(`${file.name} (> 8MB)`);
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onFileInputChange = (e) => {
    onPickFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const clearNewAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const previewSrc = avatarPreview || admin?.avatar || "";
  const initials = useMemo(() => {
    const i = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    return i || "AD";
  }, [firstName, lastName]);

  /* ------------------------------ submit profile -------------------------- */
  const onSaveProfile = async (e) => {
    e.preventDefault();
    if (!firstName.trim() && !lastName.trim()) {
      toast.error("Veuillez renseigner au moins un nom.");
      return;
    }
    try {
      setSavingProfile(true);
      const fd = new FormData();
      fd.append("firstName", firstName.trim());
      fd.append("lastName", lastName.trim());
      if (avatarFile) fd.append("avatar", avatarFile);

      const { data } = await axios.put(`${backendUrl}/api/admin/profile`, fd, {
        headers: { aToken },
      });

      if (data?.success) {
        toast.success(data.message || "Profil mis à jour.");
        setAdmin?.(data.data);
        clearNewAvatar();
      } else {
        toast.error(data?.message || "Échec de la mise à jour.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur serveur durant la mise à jour."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  /* ------------------------------ submit password ------------------------- */
  const pwdErrors = useMemo(() => {
    const e = {};
    if (newPassword && newPassword.length < 8)
      e.newPassword = "Au moins 8 caractères.";
    if (confirmPassword && confirmPassword !== newPassword)
      e.confirmPassword = "Les mots de passe ne correspondent pas.";
    if (newPassword && currentPassword && newPassword === currentPassword)
      e.newPassword = "Doit être différent de l’ancien.";
    return e;
  }, [currentPassword, newPassword, confirmPassword]);

  const onChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs du mot de passe.");
      return;
    }
    if (Object.keys(pwdErrors).length) {
      toast.error(pwdErrors.newPassword || pwdErrors.confirmPassword);
      return;
    }
    try {
      setSavingPwd(true);
      const { data } = await axios.put(
        `${backendUrl}/api/admin/change-password`,
        { currentPassword, newPassword },
        { headers: { aToken } }
      );
      if (data?.success) {
        toast.success(data.message || "Mot de passe mis à jour.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data?.message || "Échec de la mise à jour.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur serveur durant la mise à jour."
      );
    } finally {
      setSavingPwd(false);
    }
  };

  /* ------------------------------ shared bits ----------------------------- */
  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15";
  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";
  const cardClass = "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm";

  const Spinner = () => (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="px-4 py-6 sm:px-6">
      {/* ------------------------------ header ----------------------------- */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mon profil</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez vos informations personnelles et votre mot de passe.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ----------------- LEFT: personal information ----------------- */}
        <form onSubmit={onSaveProfile} className={`${cardClass} space-y-5 lg:col-span-2`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Informations personnelles
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="avatar"
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-100"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow transition hover:opacity-95"
                title="Changer la photo"
              >
                <FiCamera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileInputChange}
                className="hidden"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800">Photo de profil</p>
              <p className="text-xs text-gray-400">JPG, PNG, WEBP — max 8MB.</p>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={clearNewAvatar}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
                >
                  <FiX /> Annuler la nouvelle photo
                </button>
              )}
            </div>
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Prénom</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Nom</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className={labelClass}>Adresse e-mail</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                readOnly
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 py-2.5 pl-9 pr-3 text-sm text-gray-500"
              />
              <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              L’adresse e-mail ne peut pas être modifiée.
            </p>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
            >
              {savingProfile ? <Spinner /> : <FiSave />}
              {savingProfile ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>

        {/* ----------------- RIGHT: change password ----------------- */}
        <form onSubmit={onChangePassword} className={`${cardClass} space-y-5 lg:col-span-1`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Changer le mot de passe
          </h2>

          {/* Current */}
          <div>
            <label className={labelClass}>Mot de passe actuel</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPwd ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`${inputClass} pl-9 pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                aria-label={showPwd ? "Masquer" : "Afficher"}
              >
                {showPwd ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          {/* New */}
          <div>
            <label className={labelClass}>Nouveau mot de passe</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPwd ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
                autoComplete="new-password"
                className={`${inputClass} pl-9 ${
                  pwdErrors.newPassword ? "border-red-400" : ""
                }`}
              />
            </div>
            {pwdErrors.newPassword && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                <FiAlertTriangle /> {pwdErrors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className={labelClass}>Confirmer le mot de passe</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPwd ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
                autoComplete="new-password"
                className={`${inputClass} pl-9 ${
                  pwdErrors.confirmPassword ? "border-red-400" : ""
                }`}
              />
            </div>
            {pwdErrors.confirmPassword && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                <FiAlertTriangle /> {pwdErrors.confirmPassword}
              </p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <button
              type="submit"
              disabled={savingPwd}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
            >
              {savingPwd ? <Spinner /> : <FiLock />}
              {savingPwd ? "Mise à jour…" : "Mettre à jour le mot de passe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
