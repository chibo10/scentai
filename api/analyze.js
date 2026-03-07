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
  const prompt = `Expert parfumeur mondial. Analyse : "${perfume}"
RÈGLES STRICTES :
- Cite UNIQUEMENT des parfums 100% réels et existants
- Les 3 alternatives doivent avoir une vraie connexion moléculaire/olfactive
- Un expert Fragrantica doit valider chaque suggestion
3 ALTERNATIVES OBLIGATOIRES :
1. budget (10-50€) : Armaf, Lattafa, Rasasi, Al Haramain, Fragrance World, Afnan, Maison Alhambra, Pendora Scent, Dua Fragrances, Zimaya
2. exact : même ADN olfactif, concurrent direct, toute marque sérieuse
3. niche (150€+) : Xerjoff, Initio, Roja, MFK, Amouage, Parfums de Marly, Nishane, Creed, Frederic Malle, Byredo
Réponds UNIQUEMENT en JSON valide :
{
  "name": "Nom exact",
  "brand": "Marque",
  "year": "Année",
  "concentration": "EDT/EDP/Extrait",
  "family": "Famille olfactive précise",
  "price": "Prix 100ml",
  "description": "3 phrases poétiques expertes",
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
  "occasions": ["Occasion1", "Occasion2"],
  "age_cible": "Profil et tranche d'âge",
  "moment": "Jour/Nuit/Les deux",
  "dupes": [
    {
      "name": "Nom exact réel",
      "brand": "Marque",
      "prix": "Prix€",
      "similarite": 88,
      "type": "budget",
      "description": "Connexion olfactive précise et honnête"
    },
    {
      "name": "Nom exact réel",
      "brand": "Marque",
      "prix": "Prix€",
      "similarite": 85,
      "type": "exact",
      "description": "Connexion olfactive précise et honnête"
    },
    {
      "name": "Nom exact réel",
      "brand": "Marque",
      "prix": "Prix€",
      "similarite": 82,
      "type": "niche",
      "description": "Version sublimée, pourquoi supérieur"
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
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erreur API' });
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Format invalide' });
    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
