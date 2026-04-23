// ─────────────────────────────────────────────────────────────
//  SAMPLE / FALLBACK DATA  –  shown only when backend returns []
//  Shape mirrors the real /api/businesses response so the UI
//  code never needs two separate rendering paths.
// ─────────────────────────────────────────────────────────────

export const sampleBusinesses = [
  {
    id: "s1",
    name: "SmileCare Dental",
    category: "Hospital",
    city: "Hyderabad",
    address: "12-4-56 MG Road, Opp. City Center Mall",
    average_rating: 4.5,
    rating_count: 127,
    services_offered: ["Dental Checkup", "Teeth Cleaning", "Root Canal", "Braces"],
    emergencyAvailable: true,
    _isSample: true,
  },
  {
    id: "s2",
    name: "LifeCare Multi-Specialty",
    category: "Hospital",
    city: "Chennai",
    address: "Anna Salai, Near Marina Beach",
    average_rating: 4.8,
    rating_count: 243,
    services_offered: ["General Consultation", "Cardiology", "Orthopaedics", "Pediatrics"],
    emergencyAvailable: true,
    _isSample: true,
  },
  {
    id: "s3",
    name: "Glow & Shine Salon",
    category: "Salon",
    city: "Chennai",
    address: "T Nagar, 3rd Street",
    average_rating: 4.2,
    rating_count: 88,
    services_offered: ["Haircut", "Facial", "Manicure", "Pedicure"],
    emergencyAvailable: false,
    _isSample: true,
  },
  {
    id: "s4",
    name: "Royal Touch Beauty Studio",
    category: "Salon",
    city: "Mumbai",
    address: "Bandra West, Hill Road",
    average_rating: 4.6,
    rating_count: 192,
    services_offered: ["Hair Styling", "Bridal Makeup", "Spa", "Threading"],
    emergencyAvailable: false,
    _isSample: true,
  },
  {
    id: "s5",
    name: "HDFC Bank – Indiranagar",
    category: "Bank",
    city: "Bangalore",
    address: "100 Feet Road, Indiranagar",
    average_rating: 4.0,
    rating_count: 55,
    services_offered: ["Account Opening", "Loan Services", "Lockers", "Forex"],
    emergencyAvailable: false,
    _isSample: true,
  },
  {
    id: "s6",
    name: "SBI – MG Road Branch",
    category: "Bank",
    city: "Pune",
    address: "MG Road, Camp Area",
    average_rating: 3.9,
    rating_count: 41,
    services_offered: ["Fixed Deposits", "Home Loans", "NRI Services", "Insurance"],
    emergencyAvailable: false,
    _isSample: true,
  },
];

// ── Category icon / accent helpers ────────────────────────────
export const categoryMeta = {
  Hospital: { icon: "🏥", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
  Salon:    { icon: "✂️", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
  Bank:     { icon: "🏦", color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100"   },
};

export const getCategoryMeta = (category = "") =>
  categoryMeta[category] ?? { icon: "🏢", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" };
