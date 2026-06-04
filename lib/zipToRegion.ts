// ZIP → PS region lookup.
// Approximate v0.1 -- uses ZIP first-3-digit ranges. Real implementation
// in Session 3 should use a full USPS ZIP-to-state-to-region database.
// Fallback for unrecognized ZIPs is "northeast" with a flag.

export type RegionSlug =
  | "northeast"
  | "southeast"
  | "great-lakes"
  | "texas-south-central"
  | "plains-mountain"
  | "california"
  | "pacific-northwest";

export type RegionLookupResult = {
  region: RegionSlug;
  regionName: string;
  recognized: boolean;
  zip: string;
};

const REGION_NAMES: Record<RegionSlug, string> = {
  northeast: "Northeast",
  southeast: "Southeast",
  "great-lakes": "Great Lakes",
  "texas-south-central": "Texas + South Central",
  "plains-mountain": "Plains + Mountain",
  california: "California",
  "pacific-northwest": "Pacific Northwest",
};

// Common multi-DC adjacencies -- shown as cross-sell suggestions
// after a buyer's ZIP maps to a region. Operators with DCs in one
// region often have DCs in these adjacent regions too.
const ADJACENT_REGIONS: Record<RegionSlug, RegionSlug[]> = {
  northeast: ["southeast", "great-lakes"],
  southeast: ["northeast", "texas-south-central"],
  "great-lakes": ["northeast", "plains-mountain"],
  "texas-south-central": ["plains-mountain", "southeast"],
  "plains-mountain": ["great-lakes", "texas-south-central"],
  california: ["pacific-northwest", "plains-mountain"],
  "pacific-northwest": ["california", "plains-mountain"],
};

// ZIP first-3-digit ranges mapped to PS region. Based on USPS prefix
// allocation. Coverage is approximate; common metros are correct.
function zipPrefixToRegion(prefix: number): RegionSlug | null {
  // Northeast: ME/NH/VT/MA/RI/CT/NY/NJ/PA/MD/DE
  if (prefix >= 10 && prefix <= 219) return "northeast";

  // Southeast: VA/WV/NC/SC/GA/FL/AL/TN
  if (prefix >= 220 && prefix <= 397) return "southeast";

  // Great Lakes: KY/OH/MI/IN/IL/WI
  if (prefix >= 400 && prefix <= 499) return "great-lakes";
  if (prefix >= 530 && prefix <= 549) return "great-lakes"; // WI
  if (prefix >= 600 && prefix <= 629) return "great-lakes"; // IL

  // Plains + Mountain: IA/MN/MO/KS/NE/ND/SD/CO/UT/NV/AZ/NM/ID/WY/MT
  if (prefix >= 500 && prefix <= 528) return "plains-mountain"; // IA
  if (prefix >= 550 && prefix <= 599) return "plains-mountain"; // MN/SD/ND/MT
  if (prefix >= 630 && prefix <= 658) return "plains-mountain"; // MO
  if (prefix >= 660 && prefix <= 699) return "plains-mountain"; // KS/NE
  if (prefix >= 800 && prefix <= 898) return "plains-mountain"; // CO/WY/ID/UT/AZ/NM/NV

  // Texas + South Central: TX/OK/LA/AR/MS
  if (prefix >= 700 && prefix <= 729) return "texas-south-central"; // LA/AR
  if (prefix >= 730 && prefix <= 799) return "texas-south-central"; // OK/TX

  // California
  if (prefix >= 900 && prefix <= 966) return "california";

  // Pacific Northwest: OR/WA/AK
  if (prefix >= 970 && prefix <= 999) return "pacific-northwest";

  return null;
}

export function zipToRegion(rawZip: string): RegionLookupResult {
  const zip = (rawZip ?? "").trim().slice(0, 5);
  const isValid = /^\d{5}$/.test(zip);

  if (!isValid) {
    return {
      region: "northeast",
      regionName: REGION_NAMES.northeast,
      recognized: false,
      zip,
    };
  }

  const prefix = parseInt(zip.slice(0, 3), 10);
  const region = zipPrefixToRegion(prefix);

  if (region === null) {
    return {
      region: "northeast",
      regionName: REGION_NAMES.northeast,
      recognized: false,
      zip,
    };
  }

  return {
    region,
    regionName: REGION_NAMES[region],
    recognized: true,
    zip,
  };
}

export function getAdjacentRegions(region: RegionSlug): {
  slug: RegionSlug;
  name: string;
}[] {
  return ADJACENT_REGIONS[region].map((slug) => ({
    slug,
    name: REGION_NAMES[slug],
  }));
}

export function getRegionName(slug: RegionSlug): string {
  return REGION_NAMES[slug];
}
