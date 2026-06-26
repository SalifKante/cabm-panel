import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import {
  FiRefreshCw,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiAlertTriangle,
  FiImage,
  FiPackage,
  FiPlusCircle,
  FiEye,
  FiEyeOff,
  FiChevronLeft,
  FiChevronRight,
  FiX,
} from "react-icons/fi";
import { useNavigate, Link } from "react-router-dom";

/**
 * ProductList
 * - Fetch: POST /api/admin/all-products
 * - Edit:   navigate to /edit-product/:id
 * - Delete: DELETE /api/admin/product/:id with popup confirmation
 * - Toggle: PATCH /api/admin/product/:id/status  { isActive: boolean }
 * - Shows price (XOF), category and stock columns
 * - Responsive: cards on mobile, table on sm+
 * - Toasts for success/error
 */

// Products shown per page (client-side pagination over the loaded list).
const PAGE_SIZE = 7;

// Format a price as "15 000 XOF" (thousands grouped with spaces).
const formatXOF = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} XOF`;
};

// Stock is "tracked" when it's a finite number (not null/undefined).
const isStockTracked = (p) =>
  !(p?.stock === null || typeof p?.stock === "undefined");
const stockDisplay = (p) => (isStockTracked(p) ? p.stock : "—");

/* ------------------------------ small bits ------------------------------- */

const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${active
      ? "bg-emerald-50 text-emerald-700"
      : "bg-red-50 text-red-600"
      }`}
  >
    {active ? "Actif" : "Masqué"}
  </span>
);

// Product type pill: "Boutique" (shop) in blue, "Vitrine" (showcase) in amber.
const TypeBadge = ({ type }) => {
  const isShowcase = type === "showcase";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        isShowcase
          ? "bg-amber-50 text-amber-700"
          : "bg-blue-50 text-blue-700"
      }`}
    >
      {isShowcase ? "Vitrine" : "Boutique"}
    </span>
  );
};

const CategoryPill = ({ category }) =>
  category ? (
    <span className="inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
      {category}
    </span>
  ) : (
    <span className="text-gray-300">—</span>
  );

const StockBadge = ({ product }) => {
  if (!isStockTracked(product))
    return <span className="text-gray-300">—</span>;
  const n = Number(product.stock);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${n > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
        }`}
    >
      {n}
    </span>
  );
};

const PriceCell = ({ product }) => (
  <div className="whitespace-nowrap">
    <span className="font-semibold text-gray-800">{formatXOF(product.price)}</span>
    {product.unit ? (
      <span className="block text-xs text-gray-400">/ {product.unit}</span>
    ) : null}
  </div>
);

const Thumb = ({ src, alt, className }) => (
  <div
    className={`overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center ${className}`}
  >
    {src ? (
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    ) : (
      <FiImage className="text-gray-300 text-xl" />
    )}
  </div>
);

const ProductList = () => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(""); // "" = toutes les catégories
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "shop" | "showcase"
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);

  // Delete popup state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState(null); // { _id, title }

  // Toggle pending state (to disable the clicked toggle button)
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axios.post(
          `${backendUrl}/api/admin/all-products`,
          {},
          { headers: { aToken } }
        );
        if (!cancelled) {
          if (data?.success) {
            const items = data.data || data.products || [];
            setProducts(Array.isArray(items) ? items : []);
          } else {
            toast.error(data?.message || "Impossible de charger les produits.");
          }
        }
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Erreur serveur pendant le chargement.";
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, aToken, refreshKey]);

  // Unique, sorted list of categories present in the catalogue (for the filter).
  const categories = useMemo(() => {
    const set = new Set(
      products.map((p) => (p?.category || "").trim()).filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [products]);

  // Normalize a product's type (legacy products may not have one → "shop").
  const productType = (p) => (p?.type === "showcase" ? "showcase" : "shop");

  // Counts per type, for the filter tab labels.
  const typeCounts = useMemo(() => {
    let shop = 0;
    let showcase = 0;
    for (const p of products) {
      if (productType(p) === "showcase") showcase += 1;
      else shop += 1;
    }
    return { all: products.length, shop, showcase };
  }, [products]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => {
      // Type filter tab
      if (typeFilter !== "all" && productType(p) !== typeFilter) return false;
      // Category filter (exact match when one is selected)
      if (category && (p?.category || "") !== category) return false;
      // Text search
      if (!s) return true;
      return (
        p?.title?.toLowerCase().includes(s) ||
        p?.category?.toLowerCase().includes(s)
      );
    });
  }, [products, q, category, typeFilter]);

  // Reset to the first page whenever the search query, category or type changes.
  useEffect(() => {
    setPage(1);
  }, [q, category, typeFilter]);

  // Pagination math (client-side over the filtered list).
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamp current page if the list shrank (e.g. after a delete).
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paged = useMemo(
    () => filtered.slice(startIndex, startIndex + PAGE_SIZE),
    [filtered, startIndex]
  );
  const rangeStart = total === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + PAGE_SIZE, total);

  const onRefresh = () => setRefreshKey((k) => k + 1);
  const onEdit = (id) => navigate(`/edit-product/${id}`);

  const requestDelete = (product) => {
    setTarget(product);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!target?._id) return;
    try {
      setPending(true);
      const { data } = await axios.delete(
        `${backendUrl}/api/admin/product/${target._id}`,
        { headers: { aToken } }
      );
      if (data?.success) {
        toast.success("Produit supprimé avec succès.");
        setProducts((prev) => prev.filter((p) => p._id !== target._id));
        setConfirmOpen(false);
        setTarget(null);
      } else {
        toast.error(data?.message || "Échec de la suppression.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur serveur pendant la suppression.";
      toast.error(msg);
    } finally {
      setPending(false);
    }
  };

  // ---- toggle activation/deactivation ----
  const onToggleActive = async (product) => {
    if (!product?._id) return;
    const next = !product.isActive;
    setTogglingId(product._id);

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p._id === product._id ? { ...p, isActive: next } : p))
    );

    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/admin/product/${product._id}/status`,
        { isActive: next },
        { headers: { aToken } }
      );

      if (data?.success) {
        toast.success(next ? "Produit activé." : "Produit masqué.");
        // If API returns canonical value, sync it:
        const serverIsActive =
          data?.data?.isActive ?? data?.updated?.isActive ?? next;
        setProducts((prev) =>
          prev.map((p) =>
            p._id === product._id ? { ...p, isActive: serverIsActive } : p
          )
        );
      } else {
        // Revert optimistic change on failure
        setProducts((prev) =>
          prev.map((p) =>
            p._id === product._id ? { ...p, isActive: !next } : p
          )
        );
        toast.error(data?.message || "Échec de la mise à jour du statut.");
      }
    } catch (err) {
      // Revert optimistic change on error
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, isActive: !next } : p))
      );
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur pendant la mise à jour du statut.";
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };
  // --------------------------------------------

  /* ------------------------------- actions ------------------------------- */
  const ActionButtons = ({ p }) => (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => onEdit(p._id)}
        className="rounded-lg p-2 text-gray-400 transition hover:bg-primary-50 hover:text-primary-700"
        title="Modifier"
      >
        <FiEdit2 className="h-4 w-4" />
        <span className="sr-only">Modifier</span>
      </button>
      <button
        onClick={() => onToggleActive(p)}
        disabled={togglingId === p._id}
        className="rounded-lg p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:opacity-60"
        title={p.isActive ? "Masquer" : "Activer"}
      >
        {togglingId === p._id ? (
          <FiRefreshCw className="h-4 w-4 animate-spin" />
        ) : p.isActive ? (
          <FiEye className="h-4 w-4" />
        ) : (
          <FiEyeOff className="h-4 w-4" />
        )}
        <span className="sr-only">{p.isActive ? "Masquer" : "Activer"}</span>
      </button>
      <button
        onClick={() => requestDelete(p)}
        className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
        title="Supprimer"
      >
        <FiTrash2 className="h-4 w-4" />
        <span className="sr-only">Supprimer</span>
      </button>
    </div>
  );

  /* ------------------------------ empty state ----------------------------- */
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <FiPackage className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-800">
        Aucun produit
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Ajoutez votre premier produit pour commencer.
      </p>
      <Link
        to="/products/add"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
      >
        <FiPlusCircle className="h-4 w-4" />
        Ajouter un produit
      </Link>
    </div>
  );

  /* ------------------------------- skeletons ------------------------------ */
  const TableSkeleton = () =>
    Array.from({ length: 3 }).map((_, i) => (
      <tr key={i} className="border-t border-gray-100">
        <td className="px-4 py-3">
          <div className="h-16 w-16 animate-pulse rounded-xl bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-3.5 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-3 w-56 animate-pulse rounded bg-gray-100" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-3.5 w-20 animate-pulse rounded bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-10 animate-pulse rounded-full bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-14 animate-pulse rounded-full bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="ml-auto h-8 w-28 animate-pulse rounded bg-gray-100" />
        </td>
      </tr>
    ));

  const CardSkeleton = () =>
    Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
      >
        <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
        </div>
      </div>
    ));

  const count = filtered.length;

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="w-full">
        {/* ------------------------------ header ----------------------------- */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Produits</h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
              {count} produit{count > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher…"
                className="w-64 max-w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Category filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="max-w-[12rem] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              title="Filtrer par catégorie"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              onClick={onRefresh}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50"
              disabled={loading}
              title="Rafraîchir"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
            </button>

            <Link
              to="/products/add"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
            >
              <FiPlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter un produit</span>
              <span className="sm:hidden">Ajouter</span>
            </Link>
          </div>
        </div>

        {/* ------------------------------ type tabs -------------------------- */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "Tous", count: typeCounts.all },
            { key: "shop", label: "Boutique", count: typeCounts.shop },
            { key: "showcase", label: "Vitrine", count: typeCounts.showcase },
          ].map((tab) => {
            const active = typeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTypeFilter(tab.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                    active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ----------------------------- mobile cards ----------------------- */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {loading ? (
            <CardSkeleton />
          ) : count === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
              <EmptyState />
              </div>
          ) : (
                paged.map((p) => {
              const thumb = p?.image?.[0];
              return (
                <div
                  key={p._id}
                  className="relative rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="absolute right-3 top-3">
                    <StatusBadge active={p.isActive} />
                  </div>

                  <div className="flex gap-4">
                    <Thumb
                      src={thumb}
                      alt={p.title}
                      className="h-20 w-20 shrink-0"
                    />
                    <div className="min-w-0 flex-1 pr-16">
                      <h2 className="truncate font-semibold text-gray-800">
                        {p.title}
                      </h2>
                      <div className="mt-1">
                        <PriceCell product={p} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <TypeBadge type={p.type} />
                        <CategoryPill category={p.category} />
                        <StockBadge product={p} />
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs text-gray-500">
                    {p.description}
                  </p>

                  <div className="mt-3 border-t border-gray-100 pt-2">
                    <ActionButtons p={p} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ------------------------------ table (sm+) ----------------------- */}
        <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 w-20">Image</th>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3 w-28">Type</th>
                  <th className="px-4 py-3 w-32">Prix</th>
                  <th className="px-4 py-3 w-32">Catégorie</th>
                  <th className="px-4 py-3 w-20">Stock</th>
                  <th className="px-4 py-3 w-24">Statut</th>
                  <th className="px-4 py-3 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : count === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState />
                      </td>
                    </tr>
                  ) : (
                      paged.map((p) => {
                        const thumb = p?.image?.[0];
                        return (
                          <tr
                            key={p._id}
                            className="border-t border-gray-100 transition odd:bg-gray-50/30 even:bg-white hover:bg-gray-50/60"
                          >
                            <td className="px-4 py-3">
                              <Thumb
                                src={thumb}
                                alt={p.title}
                                className="h-16 w-16"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="line-clamp-1 font-medium text-gray-800">
                                {p.title}
                              </div>
                              <div className="line-clamp-2 text-xs text-gray-400">
                                {p.description}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <TypeBadge type={p.type} />
                            </td>
                            <td className="px-4 py-3">
                              <PriceCell product={p} />
                            </td>
                            <td className="px-4 py-3">
                              <CategoryPill category={p.category} />
                            </td>
                            <td className="px-4 py-3">
                              <StockBadge product={p} />
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge active={p.isActive} />
                            </td>
                            <td className="px-4 py-3">
                              <ActionButtons p={p} />
                            </td>
                          </tr>
                        );
                      })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------------ pagination ------------------------ */}
        {!loading && total > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-gray-500">
              Affichage {rangeStart}-{rangeEnd} sur {total} produit
              {total > 1 ? "s" : ""}
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Précédent</span>
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                // Window: first, last, current ±1, with ellipses.
                const show =
                  n === 1 ||
                  n === totalPages ||
                  (n >= currentPage - 1 && n <= currentPage + 1);
                if (!show) {
                  // Render a single ellipsis at the gap boundaries.
                  if (n === currentPage - 2 || n === currentPage + 2) {
                    return (
                      <span
                        key={n}
                        className="px-2 text-sm text-gray-400 select-none"
                      >
                        …
                      </span>
                    );
                  }
                  return null;
                }
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`min-w-[2rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${n === currentPage
                      ? "bg-primary text-white"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    {n}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="hidden sm:inline">Suivant</span>
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================== Delete Confirmation Modal ===================== */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !pending && setConfirmOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <FiAlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-800">
                  Supprimer le produit
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Êtes-vous sûr de vouloir supprimer{" "}
                  <span className="font-medium text-gray-700">
                    {target?.title || "ce produit"}
                  </span>{" "}
                  ? Cette action est irréversible.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => !pending && setConfirmOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  disabled={pending}
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirmDelete}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                  disabled={pending}
                >
                  {pending ? (
                    <FiRefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <FiTrash2 className="h-4 w-4" />
                  )}
                  {pending ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===================================================================== */}
    </div>
  );
};

export default ProductList;
