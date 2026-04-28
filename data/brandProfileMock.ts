export type StockStatus = "In Stock" | "Limited Stock" | "Out of Stock";

export type ProductReview = {
  id: string;
  author: string;
  role: string;
  rating: number;
  date: string;
  text: string;
  verified: boolean;
};

export const productReviews: Record<string, ProductReview[]> = {
  bp1: [
    { id: "r1", author: "Ramesh Nair", role: "Site Engineer, Bengaluru", rating: 5, date: "Apr 2026", text: "Used OPC 53 Grade for a 12-storey RCC frame. Compressive strength was consistently above 53 MPa at 28 days. No cracks at construction joints.", verified: true },
    { id: "r2", author: "Supriya Joshi", role: "Project Manager, Pune", rating: 5, date: "Mar 2026", text: "Excellent setting time control. Ideal for our precast yard where we need early demoulding. The cement behaves exactly as spec.", verified: true },
    { id: "r3", author: "Dinesh Kamat", role: "Civil Contractor, Mangaluru", rating: 4, date: "Feb 2026", text: "Good quality overall. Slight price variation between batches from different distributors but product consistency is top-notch.", verified: true },
    { id: "r4", author: "Anita Rajan", role: "Builder, Hyderabad", rating: 5, date: "Jan 2026", text: "Been using UltraTech OPC 53 for 6 years across 30+ projects. Never had a quality complaint from a structural consultant.", verified: true },
  ],
  bp2: [
    { id: "r1", author: "Kiran Mehta", role: "RCC Designer, Ahmedabad", rating: 5, date: "Apr 2026", text: "PPC gives excellent long-term strength. Used it for mass concrete foundations — minimal heat of hydration and no thermal cracking.", verified: true },
    { id: "r2", author: "Pradeep Rao", role: "Contractor, Chennai", rating: 4, date: "Mar 2026", text: "Great for plastering and masonry. Workability is very good. Price is slightly higher than regional brands but the quality difference is clear.", verified: true },
    { id: "r3", author: "Latha Subramaniam", role: "Builder, Coimbatore", rating: 5, date: "Feb 2026", text: "My go-to cement for residential projects. Consistent finish quality, and the bags are well-sealed with no moisture ingress.", verified: true },
  ],
  bp3: [
    { id: "r1", author: "Mohammed Asif", role: "Marine Civil Engineer, Kochi", rating: 5, date: "Mar 2026", text: "PSC is the right choice for coastal structures. We built a jetty with it — zero sulphate attack after 18 months inspection. Excellent choice.", verified: true },
    { id: "r2", author: "Varsha Pillai", role: "Infrastructure PM, Mumbai", rating: 5, date: "Feb 2026", text: "Used for basement retaining walls in a waterlogged zone. No carbonation or chloride intrusion. The slag cement lives up to its claims.", verified: true },
    { id: "r3", author: "Ajay Tiwari", role: "Structural Consultant, Nagpur", rating: 4, date: "Jan 2026", text: "Availability is slightly limited compared to OPC/PPC but worth the extra effort to source. Distinct advantage in aggressive soil environments.", verified: false },
  ],
  bp4: [
    { id: "r1", author: "Rekha Sharma", role: "Interior Designer, Delhi NCR", rating: 5, date: "Apr 2026", text: "UltraTech White Cement is by far the best in market for decorative plaster finishes. The whiteness index is consistent batch to batch.", verified: true },
    { id: "r2", author: "Sanjay Kulkarni", role: "Tile Contractor, Pune", rating: 4, date: "Mar 2026", text: "Good for tile grouting but the 25 kg bag price feels steep. Finish quality is excellent though — clients always happy.", verified: true },
  ],
  bp5: [
    { id: "r1", author: "Harish Patel", role: "Structural Engineer, Surat", rating: 5, date: "Apr 2026", text: "M25 RMC delivered right on slump spec. QC team came onsite for the first pour and everything checked out perfectly.", verified: true },
    { id: "r2", author: "Deepa Krishnan", role: "Project Director, Bengaluru", rating: 5, date: "Mar 2026", text: "We've been using UltraTech RMC M25 for all our residential slabs. Consistent cube strength and zero rejection in the last 3 projects.", verified: true },
    { id: "r3", author: "Ravi Shankar", role: "Site Supervisor, Hyderabad", rating: 4, date: "Feb 2026", text: "Good mix quality. Transit time is a bit tight in peak traffic but the driver coordination is excellent.", verified: true },
  ],
  bp6: [
    { id: "r1", author: "Nikhil Desai", role: "Structural Engineer, Nashik", rating: 4, date: "Apr 2026", text: "M40 RMC was supplied for our commercial podium slab. Cube results at 28 days were averaging 47 MPa — well above spec.", verified: true },
    { id: "r2", author: "Pooja Agarwal", role: "Builder, Jaipur", rating: 4, date: "Feb 2026", text: "Availability is limited in our area but worth waiting for. Quality is consistently better than local RMC plants.", verified: false },
  ],
  bp7: [
    { id: "r1", author: "Santosh Yadav", role: "Contractor, Lucknow", rating: 5, date: "Apr 2026", text: "AAC blocks are a game changer. Reduced plastering thickness by 30% and the thermal insulation during summer is noticeable on the top floor.", verified: true },
    { id: "r2", author: "Meena Reddy", role: "Architect, Hyderabad", rating: 5, date: "Mar 2026", text: "Specified these for a GRIHA-rated project. Lightweight, easy to cut, and fire resistant. All structural consultants approved without hesitation.", verified: true },
    { id: "r3", author: "Vikas Chandra", role: "Developer, Bhopal", rating: 4, date: "Jan 2026", text: "Good product. Cutting and drilling is clean. Only wish the block dimensions were more consistent across pallets.", verified: true },
  ],
  bp8: [
    { id: "r1", author: "Sunita Kaur", role: "Interior Contractor, Chandigarh", rating: 5, date: "Apr 2026", text: "Wall Care Putty gives the smoothest base for paint. Application is easy, coverage is great, and no peeling after 1 year of use.", verified: true },
    { id: "r2", author: "Prakash Nair", role: "Painter, Kochi", rating: 4, date: "Mar 2026", text: "The alkali resistance really shows — painted walls haven't shown any efflorescence in monsoon season. Highly recommended.", verified: true },
  ],
  bp9: [
    { id: "r1", author: "Akash Gupta", role: "Civil Engineer, Patna", rating: 4, date: "Mar 2026", text: "Used the waterproof compound in a flat roof slab. After 2 monsoon seasons — zero seepage. Dosage instructions are clear and easy to follow.", verified: true },
    { id: "r2", author: "Leela Menon", role: "Project Manager, Thiruvananthapuram", rating: 5, date: "Feb 2026", text: "Excellent product for basement water-proofing treatment in a waterlogged zone. Combined with PSC cement it gave outstanding results.", verified: true },
  ],
};

export type BrandTutorial = {
  id: string;
  title: string;
  description: string;
  duration: string;
  views: number;
  likes: number;
  tag: string;
  category: string;
  gradientClasses: string;
  emoji: string;
};

export const brandTutorials: BrandTutorial[] = [
  {
    id: "t1",
    title: "Correct Water-Cement Ratio for OPC 53",
    description: "Learn the exact water-cement ratios for M20, M25, and M30 grades using UltraTech OPC 53. Covers IS code recommendations and field adjustment tips.",
    duration: "2:34",
    views: 24500,
    likes: 1840,
    tag: "Cement Basics",
    category: "cement",
    gradientClasses: "from-sky-800 via-sky-900 to-slate-900",
    emoji: "🏗️",
  },
  {
    id: "t2",
    title: "How to Cure Concrete the Right Way",
    description: "Step-by-step curing techniques for RCC slabs, columns, and walls. Avoid common mistakes that lead to surface cracking and strength loss.",
    duration: "3:12",
    views: 18200,
    likes: 1420,
    tag: "Curing",
    category: "cement",
    gradientClasses: "from-violet-900 via-indigo-900 to-slate-900",
    emoji: "💧",
  },
  {
    id: "t3",
    title: "RMC M25 Pour — Full Site Process",
    description: "Complete RMC M25 pour at an actual residential site. Covers transit mixer coordination, slump test, vibrator usage, and finishing.",
    duration: "4:55",
    views: 42100,
    likes: 3290,
    tag: "Ready Mix",
    category: "rmc",
    gradientClasses: "from-emerald-900 via-teal-900 to-slate-900",
    emoji: "🪣",
  },
  {
    id: "t4",
    title: "AAC Block Masonry — Cutting & Laying Guide",
    description: "Step-by-step tutorial for cutting, laying, and bonding UltraTech AAC blocks. Includes jointing compound ratio and corner detailing.",
    duration: "3:47",
    views: 31800,
    likes: 2560,
    tag: "AAC Blocks",
    category: "building",
    gradientClasses: "from-amber-900 via-orange-900 to-slate-900",
    emoji: "🧱",
  },
  {
    id: "t5",
    title: "Wall Care Putty Application — Pro Technique",
    description: "Professional application technique for UltraTech Wall Care Putty. Covers surface preparation, mixing ratios, and final sanding finish.",
    duration: "2:18",
    views: 16700,
    likes: 1180,
    tag: "Wall Care",
    category: "putty",
    gradientClasses: "from-rose-900 via-pink-900 to-slate-900",
    emoji: "🖌️",
  },
  {
    id: "t6",
    title: "Slump Test — Quality Control at Site",
    description: "How to perform a slump cone test on freshly delivered concrete to verify mix consistency and workability. Includes acceptance criteria per IS 1199.",
    duration: "1:58",
    views: 29300,
    likes: 2110,
    tag: "Quality Control",
    category: "cement",
    gradientClasses: "from-cyan-900 via-blue-900 to-slate-900",
    emoji: "🔬",
  },
];

export type BrandProduct = {
  id: string;
  name: string;
  brand: string;
  priceMin: number;
  priceMax: number;
  unit: string;
  stockStatus: StockStatus;
  category: string;
  description: string;
};

export type BrandProductLine = {
  id: string;
  name: string;
  icon: string;
  description: string;
  productCount: number;
};

export type BrandCertification = {
  label: string;
  icon: string;
  issuer: string;
  year: string;
};

export type DistributorZone = {
  zone: string;
  cities: string[];
  supplierCount: number;
};

export const brandProfile = {
  name: "UltraTech Cement Ltd.",
  tagline: "India's No. 1 Cement Brand",
  category: "Cement Manufacturer",
  verified: true,
  foundedYear: 1983,
  marketPresence: "Pan India",
  website: "www.ultratechcement.com",
  description:
    "UltraTech Cement is India's largest manufacturer of grey cement, Ready Mix Concrete (RMC) and white cement. With a capacity of over 132 million tonnes per annum, UltraTech has 23 integrated plants, 1 clinkerisation plant, 26 grinding units and 7 bulk terminals across India. The brand is synonymous with quality and reliability in the Indian construction ecosystem.",
  logoInitials: "UC",
  logoColor: "from-sky-600 to-sky-800",

  stats: {
    totalProducts: 47,
    marketShare: 22,
    avgRating: 4.8,
    totalReviews: 8420,
    activeDistributors: 2300,
  },

  trustScores: {
    productQuality: 94,
    marketReliability: 97,
    certificationScore: 100,
    customerSatisfaction: 92,
  },

  aiInsights: {
    positives: [
      "Widely available across all regions — strong pan-India distribution network",
      "Consistent durability and quality across all product grades",
      "Trusted by large contractors, developers, and government infrastructure projects",
      "Extensive R&D backing with ISI and BIS certifications on all products",
    ],
    negatives: [
      "Premium pricing in Tier-2 and Tier-3 markets compared to regional brands",
      "Limited direct availability in remote or hilly regions — depends on distributor reach",
    ],
  },
};

export const brandProductLines: BrandProductLine[] = [
  {
    id: "cement",
    name: "Cement",
    icon: "🏗️",
    description: "OPC, PPC, PSC, and White Cement grades for all construction needs.",
    productCount: 12,
  },
  {
    id: "rmc",
    name: "Ready Mix Concrete",
    icon: "🪣",
    description: "Factory-batched RMC in M20 to M60 grades for structural and commercial use.",
    productCount: 9,
  },
  {
    id: "building",
    name: "Building Products",
    icon: "🧱",
    description: "AAC blocks, Dry Mix mortars, and waterproofing compounds.",
    productCount: 14,
  },
  {
    id: "putty",
    name: "Wall Care",
    icon: "🖌️",
    description: "White cement-based wall care putty for smooth, durable interior finishes.",
    productCount: 5,
  },
];

export const brandProducts: BrandProduct[] = [
  {
    id: "bp1",
    name: "UltraTech OPC 53 Grade",
    brand: "UltraTech",
    priceMin: 370,
    priceMax: 395,
    unit: "per bag (50 kg)",
    stockStatus: "In Stock",
    category: "cement",
    description:
      "High-early-strength Ordinary Portland Cement. Ideal for fast-track projects, precast, and prestressed concrete.",
  },
  {
    id: "bp2",
    name: "UltraTech PPC",
    brand: "UltraTech",
    priceMin: 355,
    priceMax: 380,
    unit: "per bag (50 kg)",
    stockStatus: "In Stock",
    category: "cement",
    description:
      "Portland Pozzolana Cement — enhanced durability for RCC structures, plastering, and masonry work.",
  },
  {
    id: "bp3",
    name: "UltraTech PSC (Slag Cement)",
    brand: "UltraTech",
    priceMin: 340,
    priceMax: 365,
    unit: "per bag (50 kg)",
    stockStatus: "In Stock",
    category: "cement",
    description:
      "Portland Slag Cement with superior resistance to sulphate attack. Best for marine, coastal, and basement structures.",
  },
  {
    id: "bp4",
    name: "UltraTech White Cement",
    brand: "UltraTech",
    priceMin: 580,
    priceMax: 620,
    unit: "per bag (25 kg)",
    stockStatus: "In Stock",
    category: "cement",
    description:
      "Premium white cement for decorative finishes, tile grouting, and waterproofing applications.",
  },
  {
    id: "bp5",
    name: "UltraTech RMC M25",
    brand: "UltraTech",
    priceMin: 4800,
    priceMax: 5200,
    unit: "per cubic metre",
    stockStatus: "In Stock",
    category: "rmc",
    description:
      "Ready Mix Concrete M25 grade — factory-batched for consistent strength. Suitable for slabs, beams, and columns.",
  },
  {
    id: "bp6",
    name: "UltraTech RMC M40",
    brand: "UltraTech",
    priceMin: 5600,
    priceMax: 6100,
    unit: "per cubic metre",
    stockStatus: "Limited Stock",
    category: "rmc",
    description:
      "High-strength RMC M40 for commercial buildings, bridges, and infrastructure projects.",
  },
  {
    id: "bp7",
    name: "UltraTech AAC Blocks",
    brand: "UltraTech",
    priceMin: 42,
    priceMax: 55,
    unit: "per block",
    stockStatus: "In Stock",
    category: "building",
    description:
      "Autoclaved Aerated Concrete blocks — lightweight, thermal-insulating, fire-resistant wall material.",
  },
  {
    id: "bp8",
    name: "UltraTech Wall Care Putty",
    brand: "UltraTech",
    priceMin: 820,
    priceMax: 870,
    unit: "per bag (40 kg)",
    stockStatus: "In Stock",
    category: "putty",
    description:
      "White cement-based wall putty for smooth and long-lasting interior finish. Alkali-resistant formula.",
  },
  {
    id: "bp9",
    name: "UltraTech Waterproof Compound",
    brand: "UltraTech",
    priceMin: 390,
    priceMax: 420,
    unit: "per bag (1 kg)",
    stockStatus: "Limited Stock",
    category: "building",
    description:
      "Waterproofing admixture for concrete and cement mortar. Prevents moisture ingress in roofs and basements.",
  },
];

export const brandCertifications: BrandCertification[] = [
  {
    label: "ISO 9001:2015",
    icon: "🏅",
    issuer: "Bureau Veritas",
    year: "2023",
  },
  {
    label: "BIS Certified",
    icon: "🇮🇳",
    issuer: "Bureau of Indian Standards",
    year: "2024",
  },
  {
    label: "Environmental Compliance",
    icon: "🌿",
    issuer: "MoEFCC, India",
    year: "2023",
  },
  {
    label: "Government Approved",
    icon: "✅",
    issuer: "CPWD & NHAI Listed",
    year: "2024",
  },
];

export const distributorZones: DistributorZone[] = [
  {
    zone: "South India",
    cities: ["Bengaluru", "Chennai", "Hyderabad", "Kochi", "Coimbatore", "Visakhapatnam"],
    supplierCount: 520,
  },
  {
    zone: "West India",
    cities: ["Mumbai", "Pune", "Ahmedabad", "Surat", "Nagpur", "Nashik"],
    supplierCount: 480,
  },
  {
    zone: "North India",
    cities: ["Delhi NCR", "Jaipur", "Lucknow", "Chandigarh", "Agra", "Amritsar"],
    supplierCount: 610,
  },
  {
    zone: "East India",
    cities: ["Kolkata", "Bhubaneswar", "Patna", "Guwahati", "Ranchi"],
    supplierCount: 390,
  },
  {
    zone: "Central India",
    cities: ["Bhopal", "Indore", "Raipur", "Jabalpur", "Bilaspur"],
    supplierCount: 300,
  },
];
