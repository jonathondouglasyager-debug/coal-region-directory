module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("site/css");
  eleventyConfig.addPassthroughCopy("site/js");

  eleventyConfig.addFilter("phone_link", function(phone) {
    if (!phone) return "";
    return "tel:" + phone.replace(/[^+\d]/g, "");
  });

  eleventyConfig.addFilter("slugify", function(str) {
    if (!str) return "";
    return str.toLowerCase()
      .replace(/['']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  });

  eleventyConfig.addFilter("stars_width", function(rating) {
    if (!rating) return "0";
    return ((parseFloat(rating) / 5) * 100).toFixed(1);
  });

  eleventyConfig.addFilter("by_city", function(businesses) {
    const grouped = {};
    for (const b of businesses) {
      const city = b.city || "Other";
      if (!grouped[city]) grouped[city] = [];
      grouped[city].push(b);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([city, items]) => ({ city, items }));
  });

  eleventyConfig.addFilter("json_escape", function(str) {
    if (!str) return "";
    return JSON.stringify(str).slice(1, -1);
  });

  return {
    dir: {
      input: "site",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
