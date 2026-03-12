import type { VisitChecklistConfig } from "./types";

// ─────────────────────────────────────────────────────────────────
// Visit checklist configuration — exhaustive but quick-to-use
// ─────────────────────────────────────────────────────────────────

export const VISIT_CHECKLIST_CONFIG: VisitChecklistConfig = {
  // ═══════════════════════════════════════════════════════════════
  // 1. BASE CHECKLIST — applicable à TOUT bien
  // ═══════════════════════════════════════════════════════════════
  base_checklist: [
    // ── Extérieur & environnement ──
    {
      key: "exterior",
      label: "Extérieur & environnement",
      icon: "🏘️",
      items: [
        { key: "facade_state", label: "État de la façade", type: "rating", hint: "Fissures, ravalement récent ?" },
        { key: "neighborhood_feel", label: "Impression du quartier", type: "rating", hint: "Propreté, bruit, ambiance" },
        { key: "street_noise", label: "Niveau de bruit extérieur", type: "rating", hint: "1 = très bruyant, 5 = calme" },
        { key: "proximity_transport", label: "Transports à proximité", type: "check", hint: "Métro, bus, tram à pied" },
        { key: "proximity_shops", label: "Commerces à proximité", type: "check" },
        { key: "proximity_schools", label: "Écoles à proximité", type: "check" },
        { key: "building_entrance", label: "État de l'entrée immeuble", type: "rating", hint: "Hall, boîtes aux lettres, propreté" },
        { key: "neighborhood_notes", label: "Notes quartier", type: "text" },
      ],
    },
    // ── Parties communes ──
    {
      key: "common_areas",
      label: "Parties communes",
      icon: "🏢",
      items: [
        { key: "staircase_state", label: "État de la cage d'escalier", type: "rating" },
        { key: "common_cleanliness", label: "Propreté des communs", type: "rating" },
        { key: "mailboxes_state", label: "État des boîtes aux lettres", type: "rating", hint: "Indique le soin de la copro" },
        { key: "common_lighting", label: "Éclairage des communs", type: "check", hint: "Fonctionne correctement ?" },
        { key: "fire_safety", label: "Sécurité incendie visible", type: "check", hint: "Extincteurs, issues de secours" },
      ],
    },
    // ── Intérieur — structure ──
    {
      key: "interior_structure",
      label: "Structure & gros œuvre",
      icon: "🧱",
      items: [
        { key: "walls_state", label: "État des murs", type: "rating", hint: "Fissures, traces, humidité" },
        { key: "ceiling_state", label: "État des plafonds", type: "rating", hint: "Taches, fissures, affaissement" },
        { key: "floor_state", label: "État des sols", type: "rating" },
        { key: "humidity_signs", label: "Signes d'humidité", type: "check", hint: "Taches, moisissures, odeur" },
        { key: "cracks_visible", label: "Fissures visibles", type: "check", hint: "Murs porteurs, jonctions" },
        { key: "floor_level", label: "Sol de niveau", type: "check", hint: "Poser une bille ou regarder les plinthes" },
      ],
    },
    // ── Intérieur — agencement ──
    {
      key: "interior_layout",
      label: "Agencement & volumes",
      icon: "📐",
      items: [
        { key: "layout_quality", label: "Qualité de l'agencement", type: "rating", hint: "Circulation, volumes, lumière" },
        { key: "natural_light", label: "Luminosité naturelle", type: "rating", hint: "1 = sombre, 5 = très lumineux" },
        { key: "orientation", label: "Orientation (exposition)", type: "select", options: ["Nord", "Sud", "Est", "Ouest", "Nord-Est", "Nord-Ouest", "Sud-Est", "Sud-Ouest", "Traversant"] },
        { key: "ceiling_height", label: "Hauteur sous plafond correcte", type: "check", hint: "≥ 2,50 m" },
        { key: "room_sizes_ok", label: "Taille des pièces suffisante", type: "check", hint: "Chambre ≥ 9 m², séjour correct" },
        { key: "storage_space", label: "Rangements suffisants", type: "check" },
        { key: "vis_a_vis", label: "Vis-à-vis gênant", type: "check", hint: "Cocher si PAS de vis-à-vis gênant" },
      ],
    },
    // ── Fenêtres & ouvertures ──
    {
      key: "windows",
      label: "Fenêtres & ouvertures",
      icon: "🪟",
      items: [
        { key: "windows_state", label: "État des fenêtres", type: "rating", hint: "Joints, fermeture, condensation" },
        { key: "windows_type", label: "Type de vitrage", type: "select", options: ["Simple", "Double", "Triple"] },
        { key: "shutters_state", label: "État des volets", type: "rating" },
        { key: "shutters_type", label: "Type de volets", type: "select", options: ["Roulants", "Battants", "Électriques", "Pas de volets"] },
      ],
    },
    // ── Électricité ──
    {
      key: "electricity",
      label: "Électricité",
      icon: "⚡",
      items: [
        { key: "electrical_panel", label: "Tableau électrique aux normes", type: "check", hint: "Disjoncteurs, différentiel" },
        { key: "outlets_count", label: "Nb de prises suffisant", type: "check", hint: "Min 3/pièce, 6 en cuisine" },
        { key: "outlets_grounded", label: "Prises avec terre", type: "check" },
        { key: "switches_working", label: "Interrupteurs fonctionnels", type: "check" },
        { key: "electrical_notes", label: "Notes électricité", type: "text" },
      ],
    },
    // ── Plomberie ──
    {
      key: "plumbing",
      label: "Plomberie",
      icon: "🚿",
      items: [
        { key: "water_pressure", label: "Pression d'eau correcte", type: "check", hint: "Ouvrir les robinets" },
        { key: "hot_water_type", label: "Type de production ECS", type: "select", options: ["Cumulus", "Chaudière", "Instantané gaz", "Instantané électrique", "Ballon thermodynamique"] },
        { key: "pipes_state", label: "État des canalisations visibles", type: "rating", hint: "Plomb, cuivre, PER" },
        { key: "leaks_visible", label: "Pas de fuites visibles", type: "check", hint: "Sous évier, WC, radiateurs" },
        { key: "drainage_ok", label: "Évacuations fonctionnelles", type: "check", hint: "Vérifier écoulement" },
      ],
    },
    // ── Chauffage & ventilation ──
    {
      key: "heating",
      label: "Chauffage & ventilation",
      icon: "🌡️",
      items: [
        { key: "heating_type", label: "Type de chauffage", type: "select", options: ["Gaz individuel", "Gaz collectif", "Électrique", "PAC", "Chauffage collectif", "Poêle", "Mixte"] },
        { key: "heating_state", label: "État du système de chauffage", type: "rating" },
        { key: "radiators_state", label: "État des radiateurs", type: "rating" },
        { key: "ventilation_type", label: "Ventilation", type: "select", options: ["Naturelle", "VMC simple flux", "VMC double flux", "Pas de ventilation"] },
        { key: "ventilation_working", label: "Ventilation fonctionnelle", type: "check", hint: "Tester avec une feuille" },
        { key: "dpe_rating", label: "Classe DPE annoncée", type: "select", options: ["A", "B", "C", "D", "E", "F", "G"] },
      ],
    },
    // ── Cuisine ──
    {
      key: "kitchen",
      label: "Cuisine",
      icon: "🍳",
      items: [
        { key: "kitchen_state", label: "État général cuisine", type: "rating" },
        { key: "kitchen_equipped", label: "Cuisine équipée", type: "check" },
        { key: "kitchen_size_ok", label: "Taille suffisante", type: "check" },
        { key: "kitchen_layout", label: "Plan de travail & rangements", type: "rating" },
      ],
    },
    // ── Salle de bain / WC ──
    {
      key: "bathroom",
      label: "Salle de bain & WC",
      icon: "🛁",
      items: [
        { key: "bathroom_state", label: "État salle de bain", type: "rating" },
        { key: "bathroom_ventilation", label: "Ventilation SDB", type: "check", hint: "VMC ou fenêtre" },
        { key: "tiles_state", label: "État du carrelage/joints", type: "rating" },
        { key: "wc_separate", label: "WC séparés", type: "check" },
        { key: "wc_state", label: "État des WC", type: "rating" },
      ],
    },
    // ── Connectivité ──
    {
      key: "connectivity",
      label: "Connectivité",
      icon: "📶",
      items: [
        { key: "mobile_signal", label: "Réseau mobile", type: "rating", hint: "Tester sur place" },
        { key: "internet_type", label: "Type de connexion internet", type: "select", options: ["Fibre", "ADSL", "Câble", "4G fixe", "Satellite"] },
        { key: "tv_antenna", label: "Prise TV / antenne", type: "check" },
      ],
    },
    // ── Impression générale ──
    {
      key: "general",
      label: "Impression générale",
      icon: "✨",
      items: [
        { key: "odors", label: "Pas de mauvaises odeurs", type: "check", hint: "Humidité, tabac, animaux" },
        { key: "overall_cleanliness", label: "Propreté générale", type: "rating" },
        { key: "renovation_needed", label: "Travaux nécessaires", type: "text", hint: "Lister les postes de travaux" },
        { key: "renovation_budget_est", label: "Budget travaux estimé (€)", type: "text" },
        { key: "visit_notes", label: "Notes libres", type: "text" },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 2. POINTS CONDITIONNELS PAR COMMODITÉ
  // ═══════════════════════════════════════════════════════════════
  conditional_by_amenity: {
    garage: [
      { key: "garage_size", label: "Taille du garage", type: "rating", hint: "Voiture standard ? Deux roues seulement ?" },
      { key: "garage_door_state", label: "État porte de garage", type: "rating" },
      { key: "garage_electric_door", label: "Porte motorisée", type: "check" },
      { key: "garage_electricity", label: "Électricité dans le garage", type: "check" },
      { key: "garage_secure", label: "Garage sécurisé", type: "check" },
    ],
    parking: [
      { key: "parking_type", label: "Type de parking", type: "select", options: ["Extérieur", "Couvert", "Souterrain", "Garage"] },
      { key: "parking_access_easy", label: "Accès facile", type: "check", hint: "Manœuvres, pente, hauteur" },
      { key: "parking_secure", label: "Parking sécurisé", type: "check", hint: "Barrière, badge, caméra" },
      { key: "parking_numbered", label: "Place numérotée / dédiée", type: "check" },
    ],
    cave: [
      { key: "cave_size", label: "Taille de la cave", type: "text", hint: "m² estimés" },
      { key: "cave_dry", label: "Cave sèche", type: "check", hint: "Pas d'humidité ni infiltrations" },
      { key: "cave_secure", label: "Cave fermée à clé", type: "check" },
      { key: "cave_electricity", label: "Électricité dans la cave", type: "check" },
      { key: "cave_access", label: "Accès correct", type: "check", hint: "Escalier praticable, pas trop loin" },
    ],
    balcon: [
      { key: "balcon_size", label: "Taille du balcon", type: "text", hint: "m² estimés" },
      { key: "balcon_state", label: "État du balcon", type: "rating", hint: "Sol, garde-corps, étanchéité" },
      { key: "balcon_orientation", label: "Orientation du balcon", type: "select", options: ["Nord", "Sud", "Est", "Ouest", "Nord-Est", "Nord-Ouest", "Sud-Est", "Sud-Ouest"] },
      { key: "balcon_view", label: "Vue depuis le balcon", type: "rating" },
      { key: "balcon_privacy", label: "Intimité correcte", type: "check" },
    ],
    terrasse: [
      { key: "terrasse_size", label: "Surface de la terrasse", type: "text", hint: "m² estimés" },
      { key: "terrasse_state", label: "État de la terrasse", type: "rating", hint: "Sol, étanchéité, garde-corps" },
      { key: "terrasse_orientation", label: "Orientation terrasse", type: "select", options: ["Nord", "Sud", "Est", "Ouest", "Nord-Est", "Nord-Ouest", "Sud-Est", "Sud-Ouest"] },
      { key: "terrasse_private", label: "Terrasse privative", type: "check", hint: "Pas partagée avec voisins" },
      { key: "terrasse_waterproof", label: "Étanchéité OK", type: "check" },
    ],
    piscine: [
      { key: "piscine_type", label: "Type de piscine", type: "select", options: ["Enterrée", "Hors-sol", "Intérieure"] },
      { key: "piscine_state", label: "État de la piscine", type: "rating" },
      { key: "piscine_filtration", label: "Système de filtration", type: "select", options: ["Sable", "Cartouche", "Sel", "Autre"] },
      { key: "piscine_security", label: "Dispositif sécurité (loi)", type: "check", hint: "Barrière, alarme, couverture, abri" },
      { key: "piscine_liner_age", label: "Âge du liner / revêtement", type: "text" },
      { key: "piscine_annual_cost", label: "Coût entretien annuel estimé", type: "text" },
    ],
    jardin: [
      { key: "jardin_size", label: "Surface du jardin", type: "text", hint: "m² estimés" },
      { key: "jardin_state", label: "État du jardin", type: "rating", hint: "Entretenu, en friche" },
      { key: "jardin_exposure", label: "Exposition / ensoleillement", type: "rating" },
      { key: "jardin_fence", label: "Clôturé / fermé", type: "check" },
      { key: "jardin_watering", label: "Point d'eau / arrosage", type: "check" },
      { key: "jardin_vis_a_vis", label: "Vis-à-vis jardin", type: "check", hint: "Cocher si pas de vis-à-vis" },
    ],
    ascenseur: [
      { key: "ascenseur_state", label: "État de l'ascenseur", type: "rating" },
      { key: "ascenseur_recent", label: "Ascenseur récent / rénové", type: "check" },
      { key: "ascenseur_size", label: "Taille correcte", type: "check", hint: "Déménagement possible ?" },
      { key: "ascenseur_reliable", label: "Fonctionne actuellement", type: "check" },
    ],
    gardien: [
      { key: "gardien_present", label: "Gardien présent sur place", type: "check" },
      { key: "gardien_horaires", label: "Horaires de présence", type: "text" },
      { key: "gardien_services", label: "Services rendus", type: "text", hint: "Colis, ménage communs, etc." },
    ],
    interphone: [
      { key: "interphone_type", label: "Type d'interphone", type: "select", options: ["Audio", "Vidéo", "Digicode", "Visiophone", "Badge/RFID"] },
      { key: "interphone_working", label: "Fonctionne correctement", type: "check" },
    ],
    meuble: [
      { key: "meuble_quality", label: "Qualité du mobilier", type: "rating" },
      { key: "meuble_complete", label: "Mobilier complet", type: "check", hint: "Lit, table, chaises, rangements" },
      { key: "meuble_appliances", label: "Électroménager inclus", type: "check", hint: "Frigo, lave-linge, four" },
      { key: "meuble_inventory", label: "Inventaire fourni", type: "check" },
      { key: "meuble_renewal_cost", label: "Coût renouvellement estimé", type: "text" },
    ],
    climatisation: [
      { key: "clim_type", label: "Type de climatisation", type: "select", options: ["Split", "Gainable", "Réversible", "Cassette"] },
      { key: "clim_working", label: "Fonctionne correctement", type: "check" },
      { key: "clim_age", label: "Âge de l'installation", type: "text" },
      { key: "clim_rooms_covered", label: "Toutes les pièces couvertes", type: "check" },
    ],
    cheminee: [
      { key: "cheminee_type", label: "Type de cheminée", type: "select", options: ["Ouverte", "Insert", "Poêle", "Fausse cheminée"] },
      { key: "cheminee_working", label: "Utilisable / fonctionnelle", type: "check" },
      { key: "cheminee_ramonage", label: "Ramonage à jour", type: "check" },
      { key: "cheminee_conduit_state", label: "État du conduit", type: "rating" },
    ],
    parquet: [
      { key: "parquet_type", label: "Type de parquet", type: "select", options: ["Massif", "Contrecollé", "Stratifié"] },
      { key: "parquet_state", label: "État du parquet", type: "rating", hint: "Rayures, lames gondolées" },
      { key: "parquet_squeaks", label: "Grincements", type: "check", hint: "Cocher si PAS de grincement" },
    ],
    double_vitrage: [
      { key: "dv_all_windows", label: "Double vitrage partout", type: "check" },
      { key: "dv_condensation", label: "Pas de condensation entre vitres", type: "check", hint: "Joint cassé si condensation" },
      { key: "dv_age", label: "Âge estimé du vitrage", type: "text" },
    ],
    fibre: [
      { key: "fibre_installed", label: "Fibre raccordée dans le logement", type: "check" },
      { key: "fibre_speed", label: "Débit annoncé", type: "text", hint: "Tester sur fast.com" },
      { key: "fibre_outlet_location", label: "Emplacement prise fibre", type: "text" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. POINTS CONDITIONNELS PAR TYPE (ancien / neuf)
  // ═══════════════════════════════════════════════════════════════
  conditional_by_type: {
    ancien: [
      { key: "ancien_roof_state", label: "État de la toiture", type: "rating", hint: "Date dernier entretien ?" },
      { key: "ancien_facade_cracks", label: "Fissures en façade", type: "check", hint: "Cocher si PAS de fissures" },
      { key: "ancien_insulation", label: "Isolation existante", type: "select", options: ["Aucune", "Combles seulement", "Murs seulement", "Combles + murs", "Combles + murs + sol"] },
      { key: "ancien_electrical_age", label: "Âge installation électrique", type: "text", hint: "Aux normes NFC 15-100 ?" },
      { key: "ancien_plumbing_material", label: "Matériau canalisations", type: "select", options: ["Cuivre", "PER", "PVC", "Plomb", "Mixte"], hint: "Plomb = à remplacer !" },
      { key: "ancien_asbestos", label: "Diagnostic amiante OK", type: "check", hint: "Vérifier diagnostic" },
      { key: "ancien_lead", label: "Diagnostic plomb OK", type: "check", hint: "Obligatoire si avant 1949" },
      { key: "ancien_termites", label: "Diagnostic termites OK", type: "check", hint: "Selon zone géographique" },
      { key: "ancien_renovation_history", label: "Historique des travaux", type: "text", hint: "Demander les factures" },
      { key: "ancien_copro_works_planned", label: "Travaux copro votés/prévus", type: "text", hint: "Ravalement, toiture, etc." },
    ],
    neuf: [
      { key: "neuf_developer", label: "Promoteur", type: "text", hint: "Réputation, avis" },
      { key: "neuf_delivery_date", label: "Date de livraison prévue", type: "text" },
      { key: "neuf_guarantees", label: "Garanties en cours", type: "text", hint: "Parfait achèvement (1 an), biennale (2 ans), décennale (10 ans)" },
      { key: "neuf_rt_standard", label: "Norme thermique", type: "select", options: ["RT2005", "RT2012", "RE2020"] },
      { key: "neuf_finish_quality", label: "Qualité des finitions", type: "rating", hint: "Peinture, joints, alignements" },
      { key: "neuf_defects_noted", label: "Défauts / réserves à noter", type: "text", hint: "Pour le PV de livraison" },
      { key: "neuf_common_areas_done", label: "Parties communes terminées", type: "check" },
      { key: "neuf_smart_home", label: "Domotique / connecté", type: "check" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. QUESTIONS À POSER AU VENDEUR / AGENT
  // ═══════════════════════════════════════════════════════════════
  seller_questions: [
    {
      key: "sq_financial",
      label: "Finances & charges",
      icon: "💰",
      questions: [
        { key: "sq_reason_sale", label: "Raison de la vente ?", hint: "Rechercher urgence = marge de négo" },
        { key: "sq_since_when", label: "Depuis combien de temps en vente ?", hint: "Si longtemps → possible négo" },
        { key: "sq_price_negotiable", label: "Le prix est-il négociable ?", hint: "Demander directement" },
        { key: "sq_charges_amount", label: "Montant exact des charges mensuelles ?", hint: "Vérifier avec les appels de fonds" },
        { key: "sq_property_tax", label: "Montant de la taxe foncière ?", hint: "Demander le dernier avis" },
        { key: "sq_housing_tax", label: "Taxe d'habitation (si applicable) ?", hint: "Pour résidences secondaires" },
        { key: "sq_copro_fund", label: "Montant du fonds de travaux copro ?", hint: "Obligatoire depuis loi ALUR" },
        { key: "sq_unpaid_charges", label: "Impayés de charges en copro ?", hint: "Demander le pré-état daté" },
      ],
    },
    {
      key: "sq_legal",
      label: "Juridique & copro",
      icon: "📋",
      questions: [
        { key: "sq_copro_size", label: "Nombre de lots dans la copro ?", hint: "Petite copro = attention aux charges" },
        { key: "sq_copro_disputes", label: "Litiges en cours en copro ?", hint: "Vérifier les PV d'AG" },
        { key: "sq_copro_works", label: "Travaux votés non encore réalisés ?", hint: "Qui paie : vendeur ou acheteur ?" },
        { key: "sq_pv_ag", label: "Peut-on consulter les 3 derniers PV d'AG ?", hint: "Obligatoire avant compromis" },
        { key: "sq_syndic_type", label: "Type de syndic ?", hint: "Professionnel, bénévole, coopératif" },
        { key: "sq_servitudes", label: "Servitudes sur le bien ?", hint: "Passage, vue, etc." },
        { key: "sq_preemption", label: "Droit de préemption ?", hint: "Mairie, locataire en place" },
        { key: "sq_tenant_in_place", label: "Locataire en place ?", hint: "Si oui : bail en cours, montant, historique paiement" },
      ],
    },
    {
      key: "sq_technical",
      label: "Technique & travaux",
      icon: "🔧",
      questions: [
        { key: "sq_diagnostics", label: "Tous les diagnostics disponibles ?", hint: "DPE, amiante, plomb, électricité, gaz, termites" },
        { key: "sq_dpe_class", label: "Classe DPE exacte + consommation ?", hint: "Interdit de louer si F/G (loi Climat)" },
        { key: "sq_last_renovation", label: "Date des derniers travaux ?", hint: "Toiture, façade, plomberie, élec" },
        { key: "sq_boiler_age", label: "Âge de la chaudière / PAC ?", hint: "Budget remplacement si > 15 ans" },
        { key: "sq_water_heater_age", label: "Âge du chauffe-eau ?", hint: "Durée de vie ~10-15 ans" },
        { key: "sq_insulation_done", label: "Travaux d'isolation réalisés ?", hint: "Combles, murs, fenêtres" },
        { key: "sq_internet_type", label: "Fibre disponible ?", hint: "Vérifier sur eligibilite-fibre.fr" },
      ],
    },
    {
      key: "sq_rental",
      label: "Potentiel locatif",
      icon: "🏠",
      questions: [
        { key: "sq_rental_history", label: "Historique locatif du bien ?", hint: "Loyer pratiqué, vacance, incidents" },
        { key: "sq_rent_control", label: "Zone d'encadrement des loyers ?", hint: "Paris, Lyon, Lille, etc." },
        { key: "sq_furnished_allowed", label: "Location meublée autorisée ?", hint: "Vérifier règlement de copro" },
        { key: "sq_airbnb_allowed", label: "Location courte durée autorisée ?", hint: "Règlement copro + mairie" },
        { key: "sq_rental_demand", label: "Demande locative dans le quartier ?", hint: "Étudiants, actifs, touristes" },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 5. TAGS PHOTOS — base
  // ═══════════════════════════════════════════════════════════════
  photo_tags_base: [
    { key: "photo_facade", label: "Façade", icon: "🏠" },
    { key: "photo_entrance", label: "Entrée immeuble", icon: "🚪" },
    { key: "photo_staircase", label: "Cage d'escalier", icon: "🪜" },
    { key: "photo_living", label: "Séjour / salon", icon: "🛋️" },
    { key: "photo_kitchen", label: "Cuisine", icon: "🍳" },
    { key: "photo_bedroom", label: "Chambre", icon: "🛏️" },
    { key: "photo_bathroom", label: "Salle de bain", icon: "🛁" },
    { key: "photo_wc", label: "WC", icon: "🚽" },
    { key: "photo_corridor", label: "Couloir / entrée", icon: "🚶" },
    { key: "photo_storage", label: "Rangements", icon: "🗄️" },
    { key: "photo_electrical_panel", label: "Tableau électrique", icon: "⚡" },
    { key: "photo_heating", label: "Chauffage", icon: "🌡️" },
    { key: "photo_water_meter", label: "Compteur d'eau", icon: "💧" },
    { key: "photo_view", label: "Vue depuis le bien", icon: "🌇" },
    { key: "photo_street", label: "Rue / environnement", icon: "🛣️" },
    { key: "photo_defect", label: "Défaut / problème", icon: "⚠️" },
    { key: "photo_other", label: "Autre", icon: "📷" },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 5b. TAGS PHOTOS — conditionnels par amenity
  // ═══════════════════════════════════════════════════════════════
  photo_tags_by_amenity: {
    garage: [{ key: "photo_garage", label: "Garage", icon: "🚗" }],
    parking: [{ key: "photo_parking", label: "Parking", icon: "🅿️" }],
    cave: [{ key: "photo_cave", label: "Cave", icon: "🏚️" }],
    balcon: [
      { key: "photo_balcon", label: "Balcon", icon: "🌇" },
      { key: "photo_balcon_view", label: "Vue du balcon", icon: "👁️" },
    ],
    terrasse: [
      { key: "photo_terrasse", label: "Terrasse", icon: "☀️" },
      { key: "photo_terrasse_view", label: "Vue de la terrasse", icon: "👁️" },
    ],
    piscine: [
      { key: "photo_piscine", label: "Piscine", icon: "🏊" },
      { key: "photo_piscine_equipment", label: "Local technique piscine", icon: "🔧" },
    ],
    jardin: [{ key: "photo_jardin", label: "Jardin", icon: "🌳" }],
    ascenseur: [{ key: "photo_ascenseur", label: "Ascenseur", icon: "🛗" }],
    gardien: [{ key: "photo_gardien_loge", label: "Loge gardien", icon: "👤" }],
    interphone: [{ key: "photo_interphone", label: "Interphone / digicode", icon: "🔔" }],
    meuble: [{ key: "photo_mobilier", label: "Mobilier", icon: "🛋️" }],
    climatisation: [{ key: "photo_clim", label: "Climatisation", icon: "❄️" }],
    cheminee: [{ key: "photo_cheminee", label: "Cheminée", icon: "🔥" }],
    parquet: [{ key: "photo_parquet", label: "Parquet", icon: "🪵" }],
    double_vitrage: [{ key: "photo_vitrage", label: "Vitrage / fenêtres", icon: "🪟" }],
    fibre: [{ key: "photo_fibre", label: "Prise fibre", icon: "📡" }],
  },

  // ═══════════════════════════════════════════════════════════════
  // 6. RED FLAGS — signaux d'alerte
  // ═══════════════════════════════════════════════════════════════
  red_flags: [
    // Structure
    { key: "rf_major_cracks", label: "Fissures importantes (structurelles)", severity: "critical", hint: "Fissures en escalier ou > 2mm sur murs porteurs" },
    { key: "rf_subsidence", label: "Affaissement de plancher", severity: "critical", hint: "Sol visiblement pas de niveau" },
    { key: "rf_major_humidity", label: "Humidité sévère / moisissures", severity: "critical", hint: "Taches noires, odeur persistante, murs qui suintent" },
    { key: "rf_sagging_ceiling", label: "Plafond affaissé / bombé", severity: "critical", hint: "Risque structurel" },

    // Installations
    { key: "rf_old_electrical", label: "Installation électrique vétuste", severity: "critical", hint: "Pas de différentiel, fils apparents, portes-fusibles" },
    { key: "rf_lead_pipes", label: "Canalisations en plomb", severity: "critical", hint: "Remplacement obligatoire, budget important" },
    { key: "rf_asbestos_present", label: "Présence d'amiante", severity: "critical", hint: "Vérifier le diagnostic, coût désamiantage élevé" },
    { key: "rf_no_ventilation", label: "Aucune ventilation", severity: "critical", hint: "Pas de VMC ni grille = condensation et moisissures assurées" },
    { key: "rf_dpe_fg", label: "DPE classé F ou G", severity: "critical", hint: "Interdiction de louer (loi Climat 2025/2028), travaux obligatoires" },

    // Copro & juridique
    { key: "rf_copro_litigation", label: "Copro en procédure judiciaire", severity: "critical", hint: "Impayés massifs, syndic judiciaire" },
    { key: "rf_copro_heavy_works", label: "Gros travaux votés (> 10k€)", severity: "warning", hint: "Vérifier qui paie : vendeur ou acheteur" },
    { key: "rf_many_for_sale", label: "Beaucoup de lots en vente dans l'immeuble", severity: "warning", hint: "Signe de problèmes en copro" },
    { key: "rf_preemption_risk", label: "Risque de préemption", severity: "warning", hint: "Mairie ou locataire prioritaire" },

    // Environnement
    { key: "rf_flood_zone", label: "Zone inondable", severity: "critical", hint: "Vérifier le PPRI de la commune" },
    { key: "rf_noise_pollution", label: "Nuisances sonores importantes", severity: "warning", hint: "Route, voie ferrée, bar, école" },
    { key: "rf_industrial_nearby", label: "Site industriel / SEVESO à proximité", severity: "warning", hint: "Vérifier Géorisques" },
    { key: "rf_bad_neighborhood", label: "Quartier dégradé / insécurité", severity: "warning", hint: "Graffitis, vitres cassées, squats" },

    // Locatif
    { key: "rf_rent_control_zone", label: "Zone encadrement des loyers", severity: "warning", hint: "Plafond de loyer → vérifier rentabilité" },
    { key: "rf_tenant_issues", label: "Locataire en place avec impayés", severity: "critical", hint: "Procédure d'expulsion très longue" },
    { key: "rf_no_airbnb", label: "Interdiction location courte durée", severity: "warning", hint: "Règlement copro ou arrêté municipal" },

    // Visite elle-même
    { key: "rf_seller_evasive", label: "Vendeur évasif / pressant", severity: "warning", hint: "Cache potentiellement un problème" },
    { key: "rf_recent_paint", label: "Peinture fraîche suspecte", severity: "warning", hint: "Peut masquer humidité ou fissures" },
    { key: "rf_strong_perfume", label: "Parfum d'intérieur fort", severity: "warning", hint: "Peut masquer des odeurs (humidité, tabac)" },
    { key: "rf_visit_rushed", label: "Visite trop rapide / dirigée", severity: "warning", hint: "L'agent évite certaines pièces / zones" },
    { key: "rf_heating_off", label: "Chauffage coupé (en hiver)", severity: "warning", hint: "Impossible de vérifier le fonctionnement" },
  ],
};

// ─────────────────────────────────────────────
// Helper: build the full config for a given property
// ─────────────────────────────────────────────

import type { AmenityKey } from "@/domains/property/amenities";
import type {
  ChecklistCategory,
  PhotoTag,
  RedFlag,
  SellerQuestionCategory,
} from "./types";

export interface ResolvedVisitConfig {
  checklist: ChecklistCategory[];
  seller_questions: SellerQuestionCategory[];
  photo_tags: PhotoTag[];
  red_flags: RedFlag[];
}

/**
 * Resolves the full visit configuration for a specific property,
 * merging base items with conditional items based on amenities and type.
 */
export function resolveVisitConfig(
  amenities: AmenityKey[],
  propertyType: "ancien" | "neuf",
): ResolvedVisitConfig {
  const config = VISIT_CHECKLIST_CONFIG;

  // 1. Build checklist: base + amenity-specific items + type-specific items
  const checklist: ChecklistCategory[] = [
    ...config.base_checklist,
  ];

  // Gather amenity-specific items
  const amenityItems = amenities.flatMap(
    (a) => config.conditional_by_amenity[a] ?? [],
  );
  if (amenityItems.length > 0) {
    checklist.push({
      key: "amenity_specifics",
      label: "Équipements spécifiques",
      icon: "🔍",
      items: amenityItems,
    });
  }

  // Gather type-specific items
  const typeItems = config.conditional_by_type[propertyType] ?? [];
  if (typeItems.length > 0) {
    checklist.push({
      key: "type_specifics",
      label: propertyType === "ancien" ? "Spécifique ancien" : "Spécifique neuf",
      icon: propertyType === "ancien" ? "🏚️" : "🏗️",
      items: typeItems,
    });
  }

  // 2. Build photo tags: base + amenity-specific
  const photoTags: PhotoTag[] = [
    ...config.photo_tags_base,
    ...amenities.flatMap((a) => config.photo_tags_by_amenity[a] ?? []),
  ];

  return {
    checklist,
    seller_questions: config.seller_questions,
    photo_tags: photoTags,
    red_flags: config.red_flags,
  };
}
