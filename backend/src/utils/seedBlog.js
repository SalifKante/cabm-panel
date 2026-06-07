import postModel from "../models/postModel.js";
import categoryModel from "../models/categoryModel.js";
import commentModel from "../models/commentModel.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "./auth.js";

const CATEGORIES = [
  { name: "Élevage", description: "Tout sur l'élevage avicole et piscicole" },
  { name: "Agriculture", description: "Cultures maraîchères, céréales et fruits" },
  { name: "Irrigation", description: "Systèmes d'irrigation et équipements" },
];

// A date `n` days before now.
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * seedBlog — idempotent. Ensures the 3 categories exist, then (only when the
 * posts collection is empty) creates 4 sample published posts and 2 approved
 * comments. Call after ensureAdminFromEnv() so an admin User exists for `author`.
 */
export async function seedBlog() {
  // Guard: only seed posts once.
  const postCount = await postModel.countDocuments();
  if (postCount > 0) return;

  // Author must be an admin User (seeded by ensureAdminFromEnv).
  const author = await userModel.findOne({ role: "admin" }).select("_id");
  if (!author) {
    console.warn("⚠️ seedBlog skipped: no admin User found to set as author.");
    return;
  }

  // Ensure categories (idempotent by name).
  const catByName = {};
  for (const c of CATEGORIES) {
    let cat = await categoryModel.findOne({ name: c.name });
    if (!cat) cat = await categoryModel.create(c);
    catByName[c.name] = cat._id;
  }

  const posts = [
    {
      title: "Comment démarrer un élevage de poulets de chair au Mali",
      excerpt:
        "Les étapes clés pour lancer un élevage de poulets de chair rentable : poussins, alimentation et gestion sanitaire.",
      category: catByName["Élevage"],
      tags: ["aviculture", "poulets"],
      content: `
<h2>Choisir des poussins de qualité</h2>
<p>La réussite d'un élevage de poulets de chair commence par le choix des poussins d'un jour. Privilégiez des souches à croissance rapide (Cobb 500, Ross 308) provenant d'un couvoir reconnu. À la réception, vérifiez la vivacité des poussins, l'absence de malformations et une température de transport correcte. Un bon démarrage conditionne près de 70 % du résultat final.</p>
<h2>Alimentation et abreuvement</h2>
<p>Les poulets de chair passent par trois phases alimentaires : démarrage (0-10 jours), croissance (11-24 jours) et finition (25 jours à l'abattage). Distribuez un aliment équilibré en protéines et en énergie, et veillez à un accès permanent à une eau propre et fraîche. Une carence en eau réduit immédiatement la consommation d'aliment et la prise de poids.</p>
<h2>Conditions d'ambiance et prévention</h2>
<ul>
<li>Maintenez une température de 32-34 °C la première semaine, puis réduisez progressivement.</li>
<li>Assurez une bonne ventilation sans courants d'air pour évacuer l'ammoniac.</li>
<li>Respectez le programme de vaccination (Newcastle, Gumboro) et un vide sanitaire entre chaque bande.</li>
</ul>
<p>Avec une litière sèche, une densité maîtrisée et un suivi quotidien, un poulet de chair atteint son poids commercial en 35 à 42 jours.</p>`.trim(),
      publishedAt: daysAgo(3),
    },
    {
      title: "Les avantages de l'irrigation goutte-à-goutte",
      excerpt:
        "Économie d'eau, meilleurs rendements et moins de mauvaises herbes : pourquoi adopter le goutte-à-goutte au jardin maraîcher.",
      category: catByName["Irrigation"],
      tags: ["irrigation", "maraîchage"],
      content: `
<h2>Une eau apportée au pied de la plante</h2>
<p>L'irrigation goutte-à-goutte distribue l'eau lentement et directement à la racine des cultures grâce à des goutteurs répartis le long de tuyaux. Cette précision évite le gaspillage par évaporation ou ruissellement et permet d'économiser jusqu'à 50 % d'eau par rapport à l'arrosage à la raie ou à l'aspersion.</p>
<h2>De meilleurs rendements, moins de maladies</h2>
<p>En maintenant une humidité régulière dans la zone racinaire, le goutte-à-goutte réduit le stress hydrique et favorise une croissance homogène. Comme le feuillage reste sec, la pression des maladies fongiques diminue. On peut aussi injecter les engrais solubles directement dans le réseau (fertigation) pour nourrir la plante au plus juste.</p>
<h2>Points de vigilance</h2>
<ul>
<li>Filtrez l'eau pour éviter le colmatage des goutteurs.</li>
<li>Contrôlez régulièrement la pression et nettoyez les lignes.</li>
<li>Adaptez les durées d'arrosage au type de sol et au stade de la culture.</li>
</ul>
<p>Bien dimensionné, un système goutte-à-goutte s'amortit rapidement par les économies d'eau, d'engrais et de main-d'œuvre.</p>`.trim(),
      publishedAt: daysAgo(9),
    },
    {
      title: "Guide complet de l'élevage de Clarias",
      excerpt:
        "Le poisson-chat africain Clarias gariepinus : un élevage robuste et rentable, du choix des alevins à la récolte.",
      category: catByName["Élevage"],
      tags: ["pisciculture", "clarias"],
      content: `
<h2>Pourquoi le Clarias ?</h2>
<p>Le Clarias gariepinus, ou poisson-chat africain, est l'une des espèces les plus adaptées à la pisciculture au Mali. Il supporte de fortes densités, tolère des eaux pauvres en oxygène grâce à sa respiration aérienne, et présente une croissance rapide. C'est un excellent choix pour démarrer en bassin hors-sol ou en étang.</p>
<h2>Densité, eau et alimentation</h2>
<p>Empoissonnez avec des alevins calibrés pour limiter le cannibalisme. En bassin bâché, une densité de 100 à 300 sujets par mètre cube est courante avec un renouvellement d'eau régulier. Distribuez un aliment flottant riche en protéines (35-45 %) plusieurs fois par jour, en ajustant les quantités à la biomasse et à l'appétit observé.</p>
<h2>Suivi et récolte</h2>
<ul>
<li>Contrôlez la qualité de l'eau (oxygène, ammoniac) et siphonnez les déchets.</li>
<li>Triez les poissons par taille pour homogénéiser la croissance.</li>
<li>Récoltez à partir de 300-500 g, généralement après 5 à 7 mois.</li>
</ul>
<p>Avec une bonne gestion, le Clarias offre un taux de survie élevé et un cycle de production court, idéal pour la vente locale.</p>`.trim(),
      publishedAt: daysAgo(15),
    },
    {
      title: "Comment reconnaître des intrants certifiés",
      excerpt:
        "Semences, engrais et produits phytosanitaires : les réflexes pour acheter des intrants de qualité et éviter les contrefaçons.",
      category: catByName["Agriculture"],
      tags: ["intrants", "qualité"],
      content: `
<h2>Acheter auprès de revendeurs agréés</h2>
<p>La première garantie de qualité est le point de vente. Privilégiez les distributeurs agréés et demandez systématiquement une facture. Les intrants vendus en bord de route, sans emballage d'origine ni traçabilité, présentent un risque élevé de contrefaçon ou de mauvaise conservation.</p>
<h2>Vérifier l'étiquette et l'emballage</h2>
<p>Un intrant certifié porte une étiquette lisible mentionnant le nom du produit, la composition, le numéro de lot, les dates de production et de péremption, ainsi que les coordonnées du fabricant. Pour les semences, l'étiquette de certification indique le taux de germination et la pureté variétale. Méfiez-vous des emballages abîmés, recollés ou aux impressions floues.</p>
<h2>Bonnes pratiques d'achat</h2>
<ul>
<li>Contrôlez la date de péremption avant tout achat.</li>
<li>Conservez la facture et l'étiquette du lot.</li>
<li>En cas de doute, rapprochez-vous des services agricoles pour vérification.</li>
</ul>
<p>Des intrants certifiés, c'est l'assurance d'un meilleur rendement et la protection de votre investissement comme de l'environnement.</p>`.trim(),
      publishedAt: daysAgo(22),
    },
  ].map((p) => ({
    ...p,
    status: "published",
    author: author._id,
  }));

  // Model.create with an array runs validation + the slug pre-validate hook per doc.
  const created = await postModel.create(posts);
  console.log(`✅ Blog seeded: ${created.length} posts, ${CATEGORIES.length} categories`);

  // --- Sample approved comments on the first post ---
  const firstPost = created[0];
  if (firstPost) {
    let commenter = await userModel.findOne({ email: "amadou@example.com" });
    if (!commenter) {
      const passwordHash = await hashPassword(
        `seed-${Math.random().toString(36).slice(2)}`
      );
      commenter = await userModel.create({
        name: "Amadou Diallo",
        email: "amadou@example.com",
        passwordHash,
        role: "user",
        isVerified: true,
      });
    }

    await commentModel.create([
      {
        postId: firstPost._id,
        userId: commenter._id,
        content:
          "Merci pour ce guide très clair ! J'aimerais savoir quelle souche vous recommandez pour un climat chaud comme à Sikasso.",
        status: "approved",
      },
      {
        postId: firstPost._id,
        userId: commenter._id,
        content:
          "Article utile. J'ai démarré avec 200 poussins le mois dernier et le suivi de la température a vraiment fait la différence.",
        status: "approved",
      },
    ]);
    console.log("✅ Blog seeded: 2 approved comments on the first post");
  }
}

export default seedBlog;
