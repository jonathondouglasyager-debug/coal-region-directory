const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

function slugify(str) {
  return str.toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function categorySlug(category) {
  const map = {
    funeral_home: "funeral-homes",
    cemetery: "cemeteries",
    cremation: "cremation-services",
    monument: "monument-companies"
  };
  return map[category] || category;
}

function categoryLabel(category) {
  const map = {
    funeral_home: "Funeral Homes",
    cemetery: "Cemeteries",
    cremation: "Cremation Services",
    monument: "Monument Companies"
  };
  return map[category] || category;
}

function categorySchemaType(category) {
  const map = {
    funeral_home: "FuneralHome",
    cemetery: "Cemetery",
    cremation: "CrematoriumOrCremationService",
    monument: "LocalBusiness"
  };
  return map[category] || "LocalBusiness";
}

// Names to exclude from directory
const EXCLUDE_NAMES = [
  "Albert Gricoski Funeral Home",
  "Frackville Memorial Pool",
  "Ruth Steinert Memorial SPCA",
  "Mothers' Memorial (Whistler's Mother Statue)",
  "Pine Grove Lion's Den",
  "Stonehedge Gardens",
  "Ashland Monument Co",
  "Cemetery Road"
];

module.exports = function() {
  const dataDir = path.join(__dirname, "../../data");

  // Read main business data
  const mainCsv = fs.readFileSync(path.join(dataDir, "schuylkill-businesses-cleaned.csv"), "utf8");
  const mainRecords = parse(mainCsv, { columns: true, skip_empty_lines: true, trim: true });

  // Read enrichment: target ranking
  const rankingCsv = fs.readFileSync(path.join(dataDir, "antigravity-target-ranking.csv"), "utf8");
  const rankingRecords = parse(rankingCsv, { columns: true, skip_empty_lines: true, trim: true });
  const rankingMap = {};
  for (const r of rankingRecords) {
    rankingMap[r.name] = r;
  }

  // Read enrichment: preneed assessment
  const preneedCsv = fs.readFileSync(path.join(dataDir, "phase3-preneed-assessment.csv"), "utf8");
  const preneedRecords = parse(preneedCsv, { columns: true, skip_empty_lines: true, trim: true, relax_quotes: true });
  const preneedMap = {};
  for (const r of preneedRecords) {
    preneedMap[r.name] = r;
  }

  // Filter and clean
  const businesses = mainRecords
    .filter(b => {
      if (b.tier !== "1") return false;
      if (b.business_status !== "OPERATIONAL") return false;
      if (EXCLUDE_NAMES.some(ex => b.name.includes(ex))) return false;
      // PA zips only
      if (b.zip && !b.zip.startsWith("17") && !b.zip.startsWith("18")) return false;
      return true;
    })
    .map(b => {
      const ranking = rankingMap[b.name] || {};
      const preneed = preneedMap[b.name] || {};

      const slug = slugify(b.name);
      const catSlug = categorySlug(b.category);
      const url = `/${catSlug}/${slug}/`;

      return {
        name: b.name,
        slug,
        category: b.category,
        categorySlug: catSlug,
        categoryLabel: categoryLabel(b.category),
        schemaType: categorySchemaType(b.category),
        address: b.address,
        city: b.city,
        citySlug: slugify(b.city),
        zip: b.zip,
        phone: b.phone,
        email: b.email,
        website: b.website,
        lat: b.lat,
        lng: b.lng,
        google_rating: b.google_rating ? parseFloat(b.google_rating) : null,
        google_review_count: b.google_review_count ? parseInt(b.google_review_count) : 0,
        google_maps_url: b.google_maps_url,
        url,

        // Enrichment from target ranking (public-safe fields only)
        website_tier: ranking.website_tier || null,
        has_facebook: ranking.has_facebook === "True",
        priority: ranking.priority || null,

        // Enrichment from preneed (public-safe fields only)
        has_preplanning: preneed.has_preplanning_section === "Yes",
        has_online_forms: preneed.has_online_forms === "Yes",
        preneed_maturity: preneed.preneed_maturity || null,

        // For listings
        services: buildServices(b, preneed)
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Group by category
  const byCategory = {};
  for (const b of businesses) {
    if (!byCategory[b.categorySlug]) {
      byCategory[b.categorySlug] = {
        slug: b.categorySlug,
        label: b.categoryLabel,
        items: []
      };
    }
    byCategory[b.categorySlug].items.push(b);
  }

  // Group by city
  const byCity = {};
  for (const b of businesses) {
    const city = b.city;
    if (!byCity[city]) {
      byCity[city] = {
        name: city,
        slug: b.citySlug,
        items: []
      };
    }
    byCity[city].items.push(b);
  }

  // Top cities sorted by number of businesses
  const cities = Object.values(byCity)
    .sort((a, b) => b.items.length - a.items.length);

  return {
    all: businesses,
    byCategory,
    byCity,
    cities,
    categories: Object.values(byCategory)
  };
};

function buildServices(business, preneed) {
  const services = [];
  const cat = business.category;

  if (cat === "funeral_home") {
    services.push("Funeral Services");
    services.push("Memorial Services");
    if (preneed.has_preplanning_section === "Yes") {
      services.push("Pre-Planning");
    }
    if (preneed.has_online_forms === "Yes") {
      services.push("Online Arrangements");
    }
    if (business.name.toLowerCase().includes("cremat")) {
      services.push("Cremation Services");
    }
  } else if (cat === "cremation") {
    services.push("Cremation Services");
    if (preneed.has_preplanning_section === "Yes") {
      services.push("Pre-Planning");
    }
  } else if (cat === "cemetery") {
    services.push("Burial Services");
    services.push("Cemetery Plots");
  } else if (cat === "monument") {
    services.push("Monuments & Headstones");
    services.push("Engraving");
  }

  return services;
}
