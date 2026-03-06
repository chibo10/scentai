export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { perfume } = req.body;
  if (!perfume) return res.status(400).json({ error: 'Parfum requis' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API non configurée' });
  const prompt = `Tu es le plus grand expert parfumeur et critique olfactif au monde. Tu as une connaissance encyclopédique de tous les parfums existants.
Parfum à analyser : "${perfume}"
RÈGLE ABSOLUE N°1 — CERTITUDE TOTALE :
Tu ne cites QUE des parfums dont tu es CERTAIN à 100% qu'ils existent avec ce nom exact et cette marque exacte.
RÈGLE ABSOLUE N°2 — SIMILARITÉ RÉELLE :
Les dupes et alternatives doivent avoir une vraie connexion olfactive basée sur les molécules et accords partagés.
RÈGLE ABSOLUE N°3 — 3 NIVEAUX OBLIGATOIRES :
NIVEAU 1 — DUPE BUDGET (type "budget") 10-50€ :
Marques spécialisées dupes : Armaf, Lattafa, Rasasi, French Avenue, Al Haramain, Fragrance World, Maison Alhambra, Pendora Scent, Afnan, Dua Fragrances, Zimaya, Simimi.
Exemples validés : Club de Nuit Intense Man (Armaf) = Aventus Creed / Baccarat Rouge (Fragrance World) = Baccarat Rouge 540.
NIVEAU 2 — ÉQUIVALENT EXACT (type "exact") — même gamme de prix :
Vrais concurrents directs du parfum original. Même positionnement, même ADN olfactif, différente maison.
Exemples : Bleu de Chanel ≈ Acqua di Giò Profumo / Black Opium ≈ La Vie est Belle.
NIVEAU 3 — NICHE LUXE (type "niche") 150-600€+ :
Maisons légitimes UNIQUEMENT : Xerjoff, Initio Parfums Privés, Roja Parfums, Maison Francis Kurkdjian, Amouage, Nishane, Tauer, Orto Parisi, Vilhelm, Parfums de Marly, Kilian.
Version sublimée du même univers olfactif — plus de complexité, plus de profondeur, tenue supérieure.
PROCESSUS MENTAL OBLIGATOIRE avant de répondre :
1. Identifier les 3-5 molécules signatures du parfum (ex: Sauvage = Ambroxan + Iso E Super + Bergamote + Poivre Sichuan)
2. Trouver quels parfums partagent exactement ces molécules à chaque niveau
3. Vérifier mentalement : "Ce parfum existe-t-il vraiment sous ce nom exact ?"
4. Vérifier : "Un expert Fragrantica validerait-il cette comparaison ?"
Réponds UNIQUEMENT en JSON valide sans texte avant ou après, sans backticks markdown :
{
  "name": "Nom exact officiel du parfum",
  "brand": "Marque officielle exacte",
  "year": "Année de création",
  "concentration": "EDT/EDP/Extrait de Parfum/Cologne/Parfum",
  "family": "Famille olfactive précise (ex: Boisé Ambré Épicé, Floral Blanc Musqué)",
  "price": "Prix indicatif 100ml (ex: 95€)",
  "description": "3 phrases poétiques et expertes en français — l'essence, le caractère unique, l'émotion provoquée",
  "notes": {
    "top": ["note1", "note2", "note3"],
    "heart": ["note1", "note2", "note3"],
    "base": ["note1", "note2", "note3"]
  },
  "scores": {
    "sillage": 8,
    "longevite": 7,
    "unicite": 9,
    "rapport_qualite_prix": 7
  },
  "saisons": ["Saison1", "Saison2"],
  "occasions": ["Occasion1", "Occasion2", "Occasion3"],
  "age_cible": "Description précise du profil et tranche d'âge",
  "moment": "Jour / Nuit / Les deux",
  "dupes": [
    {
      "name": "Nom exact certifié existant",
      "brand": "Marque exacte",
      "prix": "Prix réel en euros",
      "similarite": 88,
      "type": "budget",
      "description": "Explication experte précise : molécules et accords partagés, ce qui est similaire et ce qui diffère"
    },
    {
      "name": "Nom exact certifié existant",
      "brand": "Marque exacte",
      "prix": "Prix réel en euros",
      "similarite": 85,
      "type": "exact",
      "description": "Explication experte précise : molécules et accords partagés, ce qui est similaire et ce qui diffère"
    },
    {
      "name": "Nom exact certifié existant",
      "brand": "Marque exacte",
      "prix": "Prix réel en euros",
      "similarite": 82,
      "type": "niche",
      "description": "Explication experte précise : molécules et accords partagés, version sublimée"
    }
  ]
}`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search"
          }
        ]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erreur API' });
    // Extract text from response (handles tool use blocks)
    const textBlock = data.content.find(block => block.type === 'text');
    if (!textBlock) return res.status(500).json({ error: 'Pas de réponse textuelle' });
    const text = textBlock.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Format invalide' });
    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
