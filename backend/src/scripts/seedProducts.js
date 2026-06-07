/**
 * seedProducts.js — one-off seeder for the product catalogue.
 *
 * WHAT IT DOES (destructive):
 *   1. Connects to MongoDB and configures Cloudinary.
 *   2. DELETES every existing product document.
 *   3. Uploads the local images from cabm-admin/src/assets/products to Cloudinary.
 *   4. Inserts a fresh, categorised catalogue (price, unit, stock, category…).
 *
 * RUN:
 *   cd backend
 *   npm run seed:products
 *
 * Requires the same .env as the server (MONGODB_URI, MONGODB_DB_NAME and the
 * CLOUDINARY_* keys).
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import mongoose from "mongoose";
import stream from "stream";
import { v2 as cloudinary } from "cloudinary";

import productModel from "../models/productModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env  (scripts → src → backend)
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Local product images live in the admin app's assets folder.
const IMAGES_DIR = path.join(
  __dirname,
  "../../../cabm-admin/src/assets/products"
);

/* -------------------------------------------------------------------------- */
/*  Catalogue definition                                                       */
/* -------------------------------------------------------------------------- */
// `images` are filenames inside IMAGES_DIR. Categories are plain strings (the
// Product model stores `category` as an indexed String).

const CATEGORIES = {
  VOLAILLE: "Volaille & Œufs",
  PISCICULTURE: "Pisciculture",
  MARAICHAGE: "Maraîchage",
  FRUITS: "Fruits",
  SEMENCES: "Semences",
  INTRANTS: "Intrants & Engrais",
};

const DELIVERY = "Livraison à Bamako sous 48h. Frais de livraison selon la zone.";

const PRODUCTS = [
  /* ----------------------------- Volaille & Œufs ----------------------------- */
  {
    title: "Poulets de chair vivants",
    description:
      "Poulets de chair élevés localement, prêts à la vente. Poids moyen de 1,8 à 2,2 kg, nourris avec un aliment équilibré et suivis sur le plan sanitaire.",
    price: 3500,
    unit: "pièce",
    stock: 120,
    category: CATEGORIES.VOLAILLE,
    images: ["poulet.jpg"],
  },
  {
    title: "Poussins d'un jour (chair)",
    description:
      "Poussins de chair d'un jour, souches à croissance rapide issues d'un couvoir reconnu. Vivacité contrôlée à la réception pour un démarrage optimal.",
    price: 650,
    unit: "pièce",
    stock: 500,
    category: CATEGORIES.VOLAILLE,
    images: ["poussin.jpg", "poussin2.jpg"],
  },
  {
    title: "Œufs de table — plateau de 30",
    description:
      "Œufs frais de poules pondeuses, calibrés et conditionnés en plateau de 30. Idéal pour la consommation familiale ou la revente.",
    price: 2750,
    unit: "plateau",
    stock: 80,
    category: CATEGORIES.VOLAILLE,
    images: ["oeuf.jpg"],
  },

  /* ------------------------------ Pisciculture ------------------------------ */
  {
    title: "Alevins de Clarias",
    description:
      "Alevins de poisson-chat africain (Clarias gariepinus) calibrés pour limiter le cannibalisme. Espèce robuste à croissance rapide, idéale pour bassins hors-sol et étangs.",
    price: 150,
    unit: "pièce",
    stock: 2000,
    category: CATEGORIES.PISCICULTURE,
    images: ["alevins.jpg", "alevins_clarias.jpeg"],
  },
  {
    title: "Poisson-chat (Clarias) frais",
    description:
      "Poisson-chat frais issu de notre ferme piscicole, récolté à maturité (300–500 g). Vendu au kilo, livré frais le jour de la commande.",
    price: 2000,
    unit: "kg",
    stock: 60,
    category: CATEGORIES.PISCICULTURE,
    images: ["fish.jpg", "fish-2.jpg"],
  },

  /* ------------------------------- Maraîchage ------------------------------- */
  {
    title: "Oignon frais",
    description:
      "Oignons frais de production locale, bien conservés et triés. Disponible en gros et au détail pour les ménages, restaurants et revendeurs.",
    price: 500,
    unit: "kg",
    stock: 300,
    category: CATEGORIES.MARAICHAGE,
    images: ["oignon.jpg"],
  },
  {
    title: "Pomme de terre",
    description:
      "Pommes de terre de calibre régulier, idéales pour la cuisine quotidienne et la restauration. Récolte fraîche, vendue au kilo.",
    price: 600,
    unit: "kg",
    stock: 250,
    category: CATEGORIES.MARAICHAGE,
    images: ["pomme-terre.jpg"],
  },
  {
    title: "Panier de légumes frais",
    description:
      "Assortiment de légumes frais de saison (tomates, piments, légumes-feuilles…) composé selon la disponibilité. Parfait pour une semaine de cuisine maison.",
    price: 5000,
    unit: "panier",
    stock: 40,
    category: CATEGORIES.MARAICHAGE,
    images: ["veg-fruit.jpg", "veg-fruit2.jpg", "veg-fruit3.jpg"],
  },

  /* --------------------------------- Fruits --------------------------------- */
  {
    title: "Citron vert",
    description:
      "Citrons verts juteux et parfumés, riches en vitamine C. Vendus au kilo, parfaits pour la cuisine, les boissons et la conservation.",
    price: 1000,
    unit: "kg",
    stock: 90,
    category: CATEGORIES.FRUITS,
    images: ["lemon.jpg"],
  },
  {
    title: "Papaye solo",
    description:
      "Papayes mûres à point, chair sucrée et fondante. Cultivées localement et récoltées au bon stade de maturité.",
    price: 750,
    unit: "pièce",
    stock: 120,
    category: CATEGORIES.FRUITS,
    images: ["papaye.jpg"],
  },

  /* -------------------------------- Semences -------------------------------- */
  {
    title: "Semence de maïs hybride",
    description:
      "Semence de maïs hybride certifiée à haut rendement, bonne tolérance à la sécheresse. Taux de germination élevé et pureté variétale garantie. Sac de 2 kg.",
    price: 4500,
    unit: "sac (2 kg)",
    stock: 150,
    category: CATEGORIES.SEMENCES,
    images: ["mais_semence.jpeg"],
  },

  /* --------------------------- Intrants & Engrais --------------------------- */
  {
    title: "Engrais NPK — sac de 50 kg",
    description:
      "Engrais minéral NPK équilibré pour cultures céréalières et maraîchères. Améliore la vigueur des plantes et le rendement. Sac de 50 kg.",
    price: 22000,
    unit: "sac (50 kg)",
    stock: 200,
    category: CATEGORIES.INTRANTS,
    images: ["engraint1.jpg", "engraint2.jpg"],
  },
  {
    title: "Produit phytosanitaire",
    description:
      "Produit phytosanitaire homologué pour la protection des cultures contre les ravageurs et maladies. À utiliser selon les doses recommandées. Bidon de 1 litre.",
    price: 8500,
    unit: "litre",
    stock: 75,
    category: CATEGORIES.INTRANTS,
    images: ["phytosanitaire.jpg"],
  },
  {
    title: "Kit d'intrants agricoles",
    description:
      "Lot d'intrants agricoles essentiels (semences, engrais et produits de traitement) pour démarrer une campagne. Composition adaptée aux petites exploitations.",
    price: 15000,
    unit: "lot",
    stock: 60,
    category: CATEGORIES.INTRANTS,
    images: ["intrant.jpg", "intrant2.jpg"],
  },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */
function uploadBufferToCloudinary(buffer, folder = "products") {
  return new Promise((resolve, reject) => {
    const passthrough = new stream.PassThrough();
    passthrough.end(buffer);
    const uploader = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    passthrough.pipe(uploader);
  });
}

async function uploadImage(filename) {
  const filePath = path.join(IMAGES_DIR, filename);
  const buffer = await readFile(filePath); // throws if the file is missing
  const result = await uploadBufferToCloudinary(buffer, "products");
  return result.secure_url;
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                        */
/* -------------------------------------------------------------------------- */
async function run() {
  // --- Sanity checks ---
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in backend/.env");
  }
  if (
    !process.env.CLOUDINARY_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("CLOUDINARY_* keys are missing in backend/.env");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // --- Connect to Mongo (same logic as config/mongodb.js) ---
  const base = (process.env.MONGODB_URI || "").replace(/\/+$/, "");
  const db = (process.env.MONGODB_DB_NAME || "").replace(/^\/+/, "");
  const finalUri = db ? `${base}/${db}` : base;
  await mongoose.connect(finalUri, { serverSelectionTimeoutMS: 15000 });
  console.log("✅ Connected to MongoDB");

  // --- Wipe existing products ---
  const { deletedCount } = await productModel.deleteMany({});
  console.log(`🗑️  Removed ${deletedCount} existing product(s)`);

  // --- Upload images + build docs ---
  const docs = [];
  for (const p of PRODUCTS) {
    const urls = [];
    for (const filename of p.images) {
      try {
        const url = await uploadImage(filename);
        urls.push(url);
        console.log(`   ⬆️  ${p.title} ← ${filename}`);
      } catch (e) {
        console.warn(
          `   ⚠️  Skipped image "${filename}" for "${p.title}": ${e?.message || e}`
        );
      }
    }

    docs.push({
      title: p.title,
      description: p.description,
      price: p.price,
      currency: "XOF",
      unit: p.unit,
      stock: p.stock,
      category: p.category,
      deliveryDetails: DELIVERY,
      image: urls,
      isActive: true,
    });
  }

  // --- Insert ---
  const created = await productModel.insertMany(docs);
  const categories = [...new Set(created.map((d) => d.category))];
  console.log(
    `✅ Seeded ${created.length} products across ${categories.length} categories:`
  );
  categories.forEach((c) =>
    console.log(`   • ${c} (${created.filter((d) => d.category === c).length})`)
  );

  await mongoose.disconnect();
  console.log("👋 Done. Disconnected.");
}

run().catch(async (err) => {
  console.error("❌ Seed failed:", err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
