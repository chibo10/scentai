export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { perfume } = req.body;
  if (!perfume) return res.status(400).json({ error: 'Parfum requis' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API non configurée' });

  const prompt = `Tu es un expert parfumeur mondial avec 30 ans d'expérience en haute parfumerie.
Analyse ce parfum avec précision et expertise : "${perfume}"

RÈGLES ABSOLUES :
- Pour les dupes et alternatives, cite UNIQUEMENT des marques reconnues pour leurs dupes de qualité :
  Armaf, Lattafa, Rasasi, French Avenue, Al Haramain, Maison Alhambra, Pendora Scent, Fragrance World, Afnan, Dua Fragrances, Zimaya, Simimi, Initio (milieu de gamme), Montale, Mancera.
- Fournis toujours 3 dupes avec des niveaux de similarité différents (budget, mid-range, premium).
- Les scores sont sur 10, entiers.
- Réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans backticks.

Format JSON exact à respecter :
{
  "name": "Nom exact du parfum",
  "brand": "Marque",
  "year": "Année de lancement",
  "concentration": "EDT / EDP / Parfum / Cologne",
  "family": "Famille olfactive précise (ex: Boisé Épicé, Floral Aquatique...)",
  "price": "Prix indicatif 100ml en euros (ex: ~120€)",
  "description": "Description poétique et experte en français, 3 phrases évocatrices et précises",
  "notes": {
    "top": ["note1", "note2", "note3"],
    "heart": ["note1", "note2", "note3"],
    "base": ["note1", "note2", "note3"]
  },
  "scores": {
    "sillage": 8,
    "longevite": 7,
    "unicite": 9,
    "rapport_qualite_prix": 6
  },
  "saisons": ["Printemps", "Automne"],
  "occasions": ["Bureau", "Soirée", "Quotidien"],
  "age_cible": "Description du profil cible (ex: Homme 25-40 ans, urbain et moderne)",
  "moment": "Jour / Nuit / Les deux",
  "dupes": [
    {
      "name": "Nom exact du dupe",
      "brand": "Marque",
      "prix": "Prix indicatif (ex: ~25€)",
      "similarite": 90,
      "type": "budget"
    },
    {
      "name": "Nom exact du dupe",
      "brand": "Marque",
      "prix": "Prix indicatif (ex: ~55€)",
      "similarite": 85,
      "type": "mid-range"
    },
    {
      "name": "Nom exact du dupe",
      "brand": "Marque",
      "prix": "Prix indicatif (ex: ~90€)",
      "similarite": 80,
      "type": "premium"
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
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Erreur API Anthropic'
      });
    }

    const text = data.content[0]?.text || '';

    // Extract JSON robustly
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Format de réponse invalide' });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (err) {
    console.error('ScentAI API error:', err);
    return res.status(500).json({ error: err.message || 'Erreur interne' });
  }
}
