// Curated worldwide airport dataset for autocomplete (top hubs across every region).
// IATA code, city, airport name, country, country ISO.

export type Airport = {
  code: string;
  city: string;
  name: string;
  country: string;
  cc: string;
};

export const AIRPORTS: Airport[] = [
  // --- Africa
  { code: "LOS", city: "Lagos", name: "Murtala Muhammed Intl", country: "Nigeria", cc: "NG" },
  { code: "ABV", city: "Abuja", name: "Nnamdi Azikiwe Intl", country: "Nigeria", cc: "NG" },
  { code: "PHC", city: "Port Harcourt", name: "Port Harcourt Intl", country: "Nigeria", cc: "NG" },
  { code: "KAN", city: "Kano", name: "Mallam Aminu Kano Intl", country: "Nigeria", cc: "NG" },
  { code: "ACC", city: "Accra", name: "Kotoka Intl", country: "Ghana", cc: "GH" },
  { code: "NBO", city: "Nairobi", name: "Jomo Kenyatta Intl", country: "Kenya", cc: "KE" },
  { code: "ADD", city: "Addis Ababa", name: "Bole Intl", country: "Ethiopia", cc: "ET" },
  { code: "JNB", city: "Johannesburg", name: "OR Tambo Intl", country: "South Africa", cc: "ZA" },
  { code: "CPT", city: "Cape Town", name: "Cape Town Intl", country: "South Africa", cc: "ZA" },
  { code: "CAI", city: "Cairo", name: "Cairo Intl", country: "Egypt", cc: "EG" },
  { code: "CMN", city: "Casablanca", name: "Mohammed V Intl", country: "Morocco", cc: "MA" },
  { code: "DAR", city: "Dar es Salaam", name: "Julius Nyerere Intl", country: "Tanzania", cc: "TZ" },
  { code: "EBB", city: "Entebbe", name: "Entebbe Intl", country: "Uganda", cc: "UG" },
  { code: "ALG", city: "Algiers", name: "Houari Boumediene", country: "Algeria", cc: "DZ" },
  { code: "TUN", city: "Tunis", name: "Tunis–Carthage Intl", country: "Tunisia", cc: "TN" },
  { code: "DKR", city: "Dakar", name: "Blaise Diagne Intl", country: "Senegal", cc: "SN" },
  { code: "ABJ", city: "Abidjan", name: "Félix-Houphouët-Boigny", country: "Côte d'Ivoire", cc: "CI" },

  // --- Middle East
  { code: "DXB", city: "Dubai", name: "Dubai Intl", country: "United Arab Emirates", cc: "AE" },
  { code: "AUH", city: "Abu Dhabi", name: "Zayed Intl", country: "United Arab Emirates", cc: "AE" },
  { code: "DOH", city: "Doha", name: "Hamad Intl", country: "Qatar", cc: "QA" },
  { code: "RUH", city: "Riyadh", name: "King Khalid Intl", country: "Saudi Arabia", cc: "SA" },
  { code: "JED", city: "Jeddah", name: "King Abdulaziz Intl", country: "Saudi Arabia", cc: "SA" },
  { code: "MED", city: "Medina", name: "Prince Mohammad Intl", country: "Saudi Arabia", cc: "SA" },
  { code: "BAH", city: "Manama", name: "Bahrain Intl", country: "Bahrain", cc: "BH" },
  { code: "KWI", city: "Kuwait City", name: "Kuwait Intl", country: "Kuwait", cc: "KW" },
  { code: "MCT", city: "Muscat", name: "Muscat Intl", country: "Oman", cc: "OM" },
  { code: "TLV", city: "Tel Aviv", name: "Ben Gurion", country: "Israel", cc: "IL" },
  { code: "AMM", city: "Amman", name: "Queen Alia Intl", country: "Jordan", cc: "JO" },
  { code: "BEY", city: "Beirut", name: "Rafic Hariri Intl", country: "Lebanon", cc: "LB" },
  { code: "IST", city: "Istanbul", name: "Istanbul Airport", country: "Türkiye", cc: "TR" },
  { code: "SAW", city: "Istanbul", name: "Sabiha Gökçen", country: "Türkiye", cc: "TR" },
  { code: "THR", city: "Tehran", name: "Imam Khomeini Intl", country: "Iran", cc: "IR" },

  // --- Europe
  { code: "LHR", city: "London", name: "Heathrow", country: "United Kingdom", cc: "GB" },
  { code: "LGW", city: "London", name: "Gatwick", country: "United Kingdom", cc: "GB" },
  { code: "STN", city: "London", name: "Stansted", country: "United Kingdom", cc: "GB" },
  { code: "LTN", city: "London", name: "Luton", country: "United Kingdom", cc: "GB" },
  { code: "MAN", city: "Manchester", name: "Manchester", country: "United Kingdom", cc: "GB" },
  { code: "EDI", city: "Edinburgh", name: "Edinburgh", country: "United Kingdom", cc: "GB" },
  { code: "DUB", city: "Dublin", name: "Dublin", country: "Ireland", cc: "IE" },
  { code: "CDG", city: "Paris", name: "Charles de Gaulle", country: "France", cc: "FR" },
  { code: "ORY", city: "Paris", name: "Orly", country: "France", cc: "FR" },
  { code: "NCE", city: "Nice", name: "Côte d'Azur", country: "France", cc: "FR" },
  { code: "AMS", city: "Amsterdam", name: "Schiphol", country: "Netherlands", cc: "NL" },
  { code: "BRU", city: "Brussels", name: "Brussels Airport", country: "Belgium", cc: "BE" },
  { code: "FRA", city: "Frankfurt", name: "Frankfurt am Main", country: "Germany", cc: "DE" },
  { code: "MUC", city: "Munich", name: "Munich", country: "Germany", cc: "DE" },
  { code: "BER", city: "Berlin", name: "Brandenburg", country: "Germany", cc: "DE" },
  { code: "DUS", city: "Düsseldorf", name: "Düsseldorf", country: "Germany", cc: "DE" },
  { code: "HAM", city: "Hamburg", name: "Hamburg", country: "Germany", cc: "DE" },
  { code: "ZRH", city: "Zürich", name: "Zürich", country: "Switzerland", cc: "CH" },
  { code: "GVA", city: "Geneva", name: "Geneva", country: "Switzerland", cc: "CH" },
  { code: "VIE", city: "Vienna", name: "Vienna Intl", country: "Austria", cc: "AT" },
  { code: "FCO", city: "Rome", name: "Fiumicino", country: "Italy", cc: "IT" },
  { code: "MXP", city: "Milan", name: "Malpensa", country: "Italy", cc: "IT" },
  { code: "VCE", city: "Venice", name: "Marco Polo", country: "Italy", cc: "IT" },
  { code: "MAD", city: "Madrid", name: "Barajas", country: "Spain", cc: "ES" },
  { code: "BCN", city: "Barcelona", name: "El Prat", country: "Spain", cc: "ES" },
  { code: "LIS", city: "Lisbon", name: "Humberto Delgado", country: "Portugal", cc: "PT" },
  { code: "OPO", city: "Porto", name: "Francisco Sá Carneiro", country: "Portugal", cc: "PT" },
  { code: "ATH", city: "Athens", name: "Eleftherios Venizelos", country: "Greece", cc: "GR" },
  { code: "CPH", city: "Copenhagen", name: "Kastrup", country: "Denmark", cc: "DK" },
  { code: "OSL", city: "Oslo", name: "Gardermoen", country: "Norway", cc: "NO" },
  { code: "ARN", city: "Stockholm", name: "Arlanda", country: "Sweden", cc: "SE" },
  { code: "HEL", city: "Helsinki", name: "Helsinki-Vantaa", country: "Finland", cc: "FI" },
  { code: "WAW", city: "Warsaw", name: "Chopin", country: "Poland", cc: "PL" },
  { code: "PRG", city: "Prague", name: "Václav Havel", country: "Czechia", cc: "CZ" },
  { code: "BUD", city: "Budapest", name: "Ferenc Liszt", country: "Hungary", cc: "HU" },
  { code: "OTP", city: "Bucharest", name: "Henri Coandă", country: "Romania", cc: "RO" },
  { code: "SVO", city: "Moscow", name: "Sheremetyevo", country: "Russia", cc: "RU" },
  { code: "DME", city: "Moscow", name: "Domodedovo", country: "Russia", cc: "RU" },

  // --- Asia
  { code: "DEL", city: "Delhi", name: "Indira Gandhi Intl", country: "India", cc: "IN" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji", country: "India", cc: "IN" },
  { code: "BLR", city: "Bengaluru", name: "Kempegowda Intl", country: "India", cc: "IN" },
  { code: "MAA", city: "Chennai", name: "Chennai Intl", country: "India", cc: "IN" },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi Intl", country: "India", cc: "IN" },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhas Chandra Bose", country: "India", cc: "IN" },
  { code: "COK", city: "Kochi", name: "Cochin Intl", country: "India", cc: "IN" },
  { code: "KHI", city: "Karachi", name: "Jinnah Intl", country: "Pakistan", cc: "PK" },
  { code: "ISB", city: "Islamabad", name: "Islamabad Intl", country: "Pakistan", cc: "PK" },
  { code: "LHE", city: "Lahore", name: "Allama Iqbal Intl", country: "Pakistan", cc: "PK" },
  { code: "DAC", city: "Dhaka", name: "Hazrat Shahjalal Intl", country: "Bangladesh", cc: "BD" },
  { code: "CMB", city: "Colombo", name: "Bandaranaike Intl", country: "Sri Lanka", cc: "LK" },
  { code: "KTM", city: "Kathmandu", name: "Tribhuvan Intl", country: "Nepal", cc: "NP" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi", country: "Thailand", cc: "TH" },
  { code: "DMK", city: "Bangkok", name: "Don Mueang", country: "Thailand", cc: "TH" },
  { code: "HKT", city: "Phuket", name: "Phuket Intl", country: "Thailand", cc: "TH" },
  { code: "SIN", city: "Singapore", name: "Changi", country: "Singapore", cc: "SG" },
  { code: "KUL", city: "Kuala Lumpur", name: "KLIA", country: "Malaysia", cc: "MY" },
  { code: "CGK", city: "Jakarta", name: "Soekarno-Hatta", country: "Indonesia", cc: "ID" },
  { code: "DPS", city: "Denpasar", name: "Ngurah Rai (Bali)", country: "Indonesia", cc: "ID" },
  { code: "MNL", city: "Manila", name: "Ninoy Aquino Intl", country: "Philippines", cc: "PH" },
  { code: "SGN", city: "Ho Chi Minh City", name: "Tan Son Nhat", country: "Vietnam", cc: "VN" },
  { code: "HAN", city: "Hanoi", name: "Noi Bai", country: "Vietnam", cc: "VN" },
  { code: "PNH", city: "Phnom Penh", name: "Phnom Penh Intl", country: "Cambodia", cc: "KH" },
  { code: "RGN", city: "Yangon", name: "Yangon Intl", country: "Myanmar", cc: "MM" },
  { code: "HKG", city: "Hong Kong", name: "Chek Lap Kok", country: "Hong Kong", cc: "HK" },
  { code: "TPE", city: "Taipei", name: "Taoyuan Intl", country: "Taiwan", cc: "TW" },
  { code: "PEK", city: "Beijing", name: "Capital Intl", country: "China", cc: "CN" },
  { code: "PKX", city: "Beijing", name: "Daxing Intl", country: "China", cc: "CN" },
  { code: "PVG", city: "Shanghai", name: "Pudong Intl", country: "China", cc: "CN" },
  { code: "SHA", city: "Shanghai", name: "Hongqiao Intl", country: "China", cc: "CN" },
  { code: "CAN", city: "Guangzhou", name: "Baiyun Intl", country: "China", cc: "CN" },
  { code: "SZX", city: "Shenzhen", name: "Bao'an Intl", country: "China", cc: "CN" },
  { code: "CTU", city: "Chengdu", name: "Tianfu Intl", country: "China", cc: "CN" },
  { code: "ICN", city: "Seoul", name: "Incheon Intl", country: "South Korea", cc: "KR" },
  { code: "GMP", city: "Seoul", name: "Gimpo Intl", country: "South Korea", cc: "KR" },
  { code: "NRT", city: "Tokyo", name: "Narita Intl", country: "Japan", cc: "JP" },
  { code: "HND", city: "Tokyo", name: "Haneda", country: "Japan", cc: "JP" },
  { code: "KIX", city: "Osaka", name: "Kansai Intl", country: "Japan", cc: "JP" },
  { code: "ALA", city: "Almaty", name: "Almaty Intl", country: "Kazakhstan", cc: "KZ" },
  { code: "TAS", city: "Tashkent", name: "Tashkent Intl", country: "Uzbekistan", cc: "UZ" },
  { code: "BAK", city: "Baku", name: "Heydar Aliyev Intl", country: "Azerbaijan", cc: "AZ" },

  // --- North America
  { code: "JFK", city: "New York", name: "John F. Kennedy", country: "United States", cc: "US" },
  { code: "EWR", city: "New York", name: "Newark Liberty", country: "United States", cc: "US" },
  { code: "LGA", city: "New York", name: "LaGuardia", country: "United States", cc: "US" },
  { code: "LAX", city: "Los Angeles", name: "Los Angeles Intl", country: "United States", cc: "US" },
  { code: "SFO", city: "San Francisco", name: "San Francisco Intl", country: "United States", cc: "US" },
  { code: "ORD", city: "Chicago", name: "O'Hare Intl", country: "United States", cc: "US" },
  { code: "MDW", city: "Chicago", name: "Midway", country: "United States", cc: "US" },
  { code: "ATL", city: "Atlanta", name: "Hartsfield-Jackson", country: "United States", cc: "US" },
  { code: "DFW", city: "Dallas", name: "Dallas/Fort Worth Intl", country: "United States", cc: "US" },
  { code: "IAH", city: "Houston", name: "George Bush Intercontinental", country: "United States", cc: "US" },
  { code: "MIA", city: "Miami", name: "Miami Intl", country: "United States", cc: "US" },
  { code: "MCO", city: "Orlando", name: "Orlando Intl", country: "United States", cc: "US" },
  { code: "BOS", city: "Boston", name: "Logan Intl", country: "United States", cc: "US" },
  { code: "SEA", city: "Seattle", name: "Sea-Tac", country: "United States", cc: "US" },
  { code: "DEN", city: "Denver", name: "Denver Intl", country: "United States", cc: "US" },
  { code: "PHX", city: "Phoenix", name: "Sky Harbor", country: "United States", cc: "US" },
  { code: "LAS", city: "Las Vegas", name: "Harry Reid Intl", country: "United States", cc: "US" },
  { code: "IAD", city: "Washington", name: "Dulles Intl", country: "United States", cc: "US" },
  { code: "DCA", city: "Washington", name: "Reagan National", country: "United States", cc: "US" },
  { code: "PHL", city: "Philadelphia", name: "Philadelphia Intl", country: "United States", cc: "US" },
  { code: "MSP", city: "Minneapolis", name: "MSP Intl", country: "United States", cc: "US" },
  { code: "DTW", city: "Detroit", name: "Detroit Metro", country: "United States", cc: "US" },
  { code: "YYZ", city: "Toronto", name: "Pearson Intl", country: "Canada", cc: "CA" },
  { code: "YUL", city: "Montréal", name: "Trudeau Intl", country: "Canada", cc: "CA" },
  { code: "YVR", city: "Vancouver", name: "Vancouver Intl", country: "Canada", cc: "CA" },
  { code: "YYC", city: "Calgary", name: "Calgary Intl", country: "Canada", cc: "CA" },
  { code: "MEX", city: "Mexico City", name: "Benito Juárez Intl", country: "Mexico", cc: "MX" },
  { code: "CUN", city: "Cancún", name: "Cancún Intl", country: "Mexico", cc: "MX" },

  // --- Latin America
  { code: "GRU", city: "São Paulo", name: "Guarulhos", country: "Brazil", cc: "BR" },
  { code: "GIG", city: "Rio de Janeiro", name: "Galeão", country: "Brazil", cc: "BR" },
  { code: "BSB", city: "Brasília", name: "Brasília Intl", country: "Brazil", cc: "BR" },
  { code: "EZE", city: "Buenos Aires", name: "Ezeiza", country: "Argentina", cc: "AR" },
  { code: "SCL", city: "Santiago", name: "Arturo Merino Benítez", country: "Chile", cc: "CL" },
  { code: "LIM", city: "Lima", name: "Jorge Chávez", country: "Peru", cc: "PE" },
  { code: "BOG", city: "Bogotá", name: "El Dorado", country: "Colombia", cc: "CO" },
  { code: "UIO", city: "Quito", name: "Mariscal Sucre", country: "Ecuador", cc: "EC" },
  { code: "PTY", city: "Panama City", name: "Tocumen Intl", country: "Panama", cc: "PA" },
  { code: "SJO", city: "San José", name: "Juan Santamaría", country: "Costa Rica", cc: "CR" },
  { code: "HAV", city: "Havana", name: "José Martí Intl", country: "Cuba", cc: "CU" },

  // --- Oceania
  { code: "SYD", city: "Sydney", name: "Kingsford Smith", country: "Australia", cc: "AU" },
  { code: "MEL", city: "Melbourne", name: "Tullamarine", country: "Australia", cc: "AU" },
  { code: "BNE", city: "Brisbane", name: "Brisbane Airport", country: "Australia", cc: "AU" },
  { code: "PER", city: "Perth", name: "Perth Airport", country: "Australia", cc: "AU" },
  { code: "AKL", city: "Auckland", name: "Auckland Airport", country: "New Zealand", cc: "NZ" },
  { code: "WLG", city: "Wellington", name: "Wellington Intl", country: "New Zealand", cc: "NZ" },
  { code: "NAN", city: "Nadi", name: "Nadi Intl", country: "Fiji", cc: "FJ" },
];

export function searchAirports(query: string, limit = 8): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return AIRPORTS.slice(0, limit);
  // exact code match first
  const exact = AIRPORTS.filter((a) => a.code.toLowerCase() === q);
  const starts = AIRPORTS.filter(
    (a) =>
      a.code.toLowerCase().startsWith(q) ||
      a.city.toLowerCase().startsWith(q) ||
      a.country.toLowerCase().startsWith(q),
  );
  const contains = AIRPORTS.filter(
    (a) =>
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q),
  );
  const seen = new Set<string>();
  const out: Airport[] = [];
  for (const list of [exact, starts, contains]) {
    for (const a of list) {
      if (seen.has(a.code)) continue;
      seen.add(a.code);
      out.push(a);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function findAirport(code: string): Airport | undefined {
  return AIRPORTS.find((a) => a.code === code.toUpperCase());
}

/** Parse a free-form input like "Lagos (LOS)" or "LOS" → IATA code. */
export function toIata(value: string): string {
  const m = value.match(/\(([A-Z]{3})\)/);
  if (m) return m[1];
  const trimmed = value.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  // fall back to first matching airport by city/name
  const found = searchAirports(value, 1)[0];
  return found ? found.code : trimmed.slice(0, 3);
}
