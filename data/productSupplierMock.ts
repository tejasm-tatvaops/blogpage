export type StockStatus = "In Stock" | "Limited Stock" | "Out of Stock";

export type Product = {
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

export type Category = {
  id: string;
  name: string;
  icon: string;
  description: string;
  productCount: number;
};

export const supplierProfile = {
  name: "RajBuild Materials Pvt. Ltd.",
  tagline: "Building Materials Supplier",
  rating: 4.7,
  reviewCount: 214,
  verified: true,
  yearsActive: 12,
  avatar: "/images/construction/house-exterior-1.png",

  priceRange: { min: 350, max: 420, unit: "per bag" },
  stockStatus: "In Stock" as StockStatus,
  minOrder: "50 units",
  deliveryTime: "24–48 hrs",

  description:
    "Reliable supplier of cement, steel, and construction materials with consistent stock availability and competitive bulk pricing. Serving contractors, builders, and developers across South India for over 12 years with doorstep delivery and dedicated account management.",

  about: {
    warehouseLocation: "Peenya Industrial Area, Bengaluru",
    brandsSupplied: ["Ultratech", "JSW Steel", "Asian Paints", "Birla White", "Kajaria"],
    supplyCapacity: "200 tons / week",
    serviceAreas: ["Bengaluru", "Mysuru", "Tumkur", "Mangaluru", "Hubballi"],
    established: "2012",
    gstNumber: "29AABCR1234M1ZX",
  },

  performance: {
    fulfillmentRate: 97,
    avgDispatch: "<24 hrs",
    repeatBuyers: 41,
  },

  trustScore: {
    overall: 91,
    breakdown: [
      { label: "Stock Reliability", score: 95 },
      { label: "Pricing Competitiveness", score: 88 },
      { label: "Delivery Performance", score: 93 },
      { label: "Product Quality", score: 90 },
      { label: "Verification", score: 100 },
    ],
  },

  ratings: {
    overall: 4.7,
    breakdown: [
      { label: "Product Quality", value: 4.8 },
      { label: "Pricing Fairness", value: 4.6 },
      { label: "Delivery Speed", value: 4.7 },
      { label: "Packaging Condition", value: 4.5 },
    ],
  },

  aiInsights: {
    positives: [
      "Consistent stock availability across all SKUs",
      "Competitive bulk pricing — up to 18% below market rate",
      "Fast dispatch — average <24 hrs from order confirmation",
    ],
    negatives: [
      "Limited premium brand options in the tiles category",
      "Occasional delays in delivery during peak construction season",
    ],
  },

  certifications: [
    { label: "GST Verified", icon: "✓" },
    { label: "Authorized Dealer", icon: "★" },
    { label: "Brand Partnerships", icon: "🤝" },
    { label: "Distributor License", icon: "📋" },
  ],

  availability: {
    deliveryZones: ["Bengaluru Urban", "Bengaluru Rural", "Mysuru District", "Tumkur", "Davanagere"],
    deliveryTime: "24–48 hrs (standard), Same Day (express)",
    bulkOrderCapacity: "Up to 500 tons per order",
    transportAvailability: "Own fleet + third-party logistics",
  },

  reviews: [
    {
      id: "r1",
      author: "Suresh Nair",
      company: "Nair Constructions",
      rating: 5,
      date: "April 2026",
      text: "Excellent service — cement arrived on time and in perfect condition. Bulk pricing was the best we found in Bengaluru.",
    },
    {
      id: "r2",
      author: "Priya Mehta",
      company: "Mehta Developers",
      rating: 4,
      date: "March 2026",
      text: "Very reliable. Minor delay during the peak Jan–Feb period but the team kept us informed throughout.",
    },
    {
      id: "r3",
      author: "Mohammed Rafi",
      company: "Rafi Infra",
      rating: 5,
      date: "March 2026",
      text: "JSW steel quality and packaging were top-notch. The account manager is responsive and helpful.",
    },
  ],
};

export const categories: Category[] = [
  {
    id: "cement",
    name: "Cement",
    icon: "🏗️",
    description: "OPC, PPC, and white cement from top brands. Available in 50 kg bags.",
    productCount: 8,
  },
  {
    id: "steel",
    name: "Steel",
    icon: "⚙️",
    description: "TMT bars, structural steel, and reinforcement rods. All ISI marked.",
    productCount: 12,
  },
  {
    id: "tiles",
    name: "Tiles",
    icon: "🪟",
    description: "Floor, wall, and vitrified tiles in varied sizes from premium brands.",
    productCount: 34,
  },
  {
    id: "paint",
    name: "Paint",
    icon: "🎨",
    description: "Interior, exterior, and waterproof coatings. Full colour range available.",
    productCount: 21,
  },
  {
    id: "electrical",
    name: "Electrical Materials",
    icon: "⚡",
    description: "Wires, MCBs, conduit pipes, and fittings from certified manufacturers.",
    productCount: 47,
  },
];

export const products: Product[] = [
  {
    id: "p1",
    name: "Ultratech PPC Cement",
    brand: "Ultratech",
    priceMin: 370,
    priceMax: 390,
    unit: "per bag (50 kg)",
    stockStatus: "In Stock",
    category: "cement",
    description: "Portland Pozzolana Cement — ideal for RCC, plastering, and masonry.",
  },
  {
    id: "p2",
    name: "Birla White Cement",
    brand: "Birla White",
    priceMin: 415,
    priceMax: 430,
    unit: "per bag (25 kg)",
    stockStatus: "In Stock",
    category: "cement",
    description: "Premium white cement for decorative finishes and waterproofing.",
  },
  {
    id: "p3",
    name: "JSW TMT Fe500D Bars",
    brand: "JSW Steel",
    priceMin: 58000,
    priceMax: 62000,
    unit: "per ton",
    stockStatus: "In Stock",
    category: "steel",
    description: "High-strength, earthquake-resistant TMT bars for structural RCC work.",
  },
  {
    id: "p4",
    name: "Kajaria Vitrified Tiles",
    brand: "Kajaria",
    priceMin: 45,
    priceMax: 80,
    unit: "per sq ft",
    stockStatus: "Limited Stock",
    category: "tiles",
    description: "Double-charged vitrified tiles — 600×600 mm, anti-skid finish.",
  },
  {
    id: "p5",
    name: "Asian Paints Apex Exterior",
    brand: "Asian Paints",
    priceMin: 210,
    priceMax: 240,
    unit: "per litre",
    stockStatus: "In Stock",
    category: "paint",
    description: "100% waterproof exterior emulsion with 10-year warranty.",
  },
  {
    id: "p6",
    name: "Polycab FR Wires",
    brand: "Polycab",
    priceMin: 38,
    priceMax: 55,
    unit: "per metre",
    stockStatus: "In Stock",
    category: "electrical",
    description: "FRLS copper conductor wires — 1.5 sq mm to 6 sq mm available.",
  },
  {
    id: "p7",
    name: "Ambuja OPC 53 Grade",
    brand: "Ambuja",
    priceMin: 355,
    priceMax: 375,
    unit: "per bag (50 kg)",
    stockStatus: "In Stock",
    category: "cement",
    description: "High-early-strength cement for fast-track construction projects.",
  },
  {
    id: "p8",
    name: "Havells MCB 6A–32A",
    brand: "Havells",
    priceMin: 120,
    priceMax: 450,
    unit: "per piece",
    stockStatus: "Limited Stock",
    category: "electrical",
    description: "ISI-certified miniature circuit breakers for residential and commercial panels.",
  },
  {
    id: "p9",
    name: "RAK Ceramic Wall Tiles",
    brand: "RAK Ceramics",
    priceMin: 35,
    priceMax: 60,
    unit: "per sq ft",
    stockStatus: "Out of Stock",
    category: "tiles",
    description: "Glossy ceramic wall tiles — 300×450 mm, bathroom and kitchen grade.",
  },
];
