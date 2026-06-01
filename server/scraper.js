import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const LAUNCH_OPTS = {
  executablePath: CHROME_PATH,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
};

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1280, height: 800 });
  return page;
}

/**
 * Extract Gardrops product links from a store/seller page URL.
 */
export async function scrapeGardropsStore(storeUrl, { onProduct, signal } = {}) {
  const browser = await puppeteer.launch(LAUNCH_OPTS);
  try {
    const page = await newPage(browser);
    await page.goto(storeUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for product cards to render (these containers appear when products load)
    await new Promise((r) => setTimeout(r, 8000));
    try {
      // Gardrops typically uses product-card containers or similar elements
      await page.waitForSelector(
        '[class*="product"], [class*="Product"], [class*="card"], [class*="Card"], a[href*="-p-"]',
        { timeout: 15000 }
      );
    } catch {
      console.log("Store: no product selector found, continuing anyway");
    }

    // Scroll to bottom repeatedly to load lazy items
    let prevHeight = 0;
    for (let i = 0; i < 15; i++) {
      prevHeight = await page.evaluate(() => document.body.scrollHeight);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((r) => setTimeout(r, 2500));
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === prevHeight && i > 3) break;
    }

    // Also scroll back to top to collect all rendered links
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 2000));

    // Extract all links that look like product URLs
    const links = await page.evaluate(() => {
      const skip = [
        "/login", "/signup", "/register", "/password", "/cart",
        "/favori", "/search", "cdn.", "images.", "javascript",
        "/mesaj", "/profil", "/begeni", "/takip", "/bildirim",
        "/yakininizdaki", "/hesabim", "/siparis", "/kupon",
        "/yardim", "/hakkimizda", "/iletisim", "/sss",
        "/blog", "/reklam", "/uyelik", "/giris",
      ];
      const base = "https://www.gardrops.com";
      const urls = new Set();
      document.querySelectorAll("a[href]").forEach((a) => {
        let href = a.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript")) return;
        const full = href.startsWith("http") ? href : base + (href.startsWith("/") ? href : "/" + href);
        if (!full.startsWith(base)) return;
        const path = full.replace(base, "");
        if (!path || path === "/" || skip.some((s) => path.includes(s))) return;
        // Product pages have: -p- OR at least 3 path segments AND some product-like word
        const segs = path.split("/").filter(Boolean);
        const isProduct = path.includes("-p-") || (segs.length >= 3 && /[a-z]/.test(path));
        if (isProduct) urls.add(full);
      });
      return Array.from(urls);
    });

    // Filter out category/store pages (keep only unique, likely product URLs)
    const uniqueLinks = [...new Set(links)].filter((url) => {
      const storeName = new URL(storeUrl).pathname.replace(/\//g, "");
      const path = new URL(url).pathname;
      const pathLower = path.toLowerCase();
      // Exclude the store page itself and known non-product patterns
      if (path === "/" || path === `/${storeName}` || path === `/${storeName}/`) return false;
      if (/^\/(kadin|erkek|cocuk|bebek|unisex)\/(giyim|ayakkabi|canta|aksesuar)$/i.test(path)) return false;
      return true;
    });

    console.log(`Store: found ${uniqueLinks.length} product links`);

    // Scrape all products sequentially, yield each via onProduct if provided
    const products = [];
    for (let i = 0; i < uniqueLinks.length; i++) {
      if (signal?.aborted) break;
      console.log(`Scraping ${i + 1}/${uniqueLinks.length}: ${uniqueLinks[i]}`);
      try {
        const data = await scrapeGardropsProduct(uniqueLinks[i], browser);
        products.push(data);
        if (onProduct) onProduct(data, i, uniqueLinks.length);
      } catch (err) {
        console.error(`Failed: ${uniqueLinks[i]}: ${err.message}`);
      }
    }
    return products;
  } finally {
    await browser.close();
  }
}

export async function scrapeGardropsProduct(url, existingBrowser) {
  const ownBrowser = !existingBrowser;
  const browser = existingBrowser || (await puppeteer.launch(LAUNCH_OPTS));
  let page;

  try {
    page = await newPage(browser);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    // Wait for page to settle
    await new Promise((r) => setTimeout(r, 5000));
    try {
      await page.waitForSelector("h1, [class*='price'], [class*='Price'], img[src*='user_items']", { timeout: 10000 });
    } catch {
      // Continue even if selector not found
    }
    await new Promise((r) => setTimeout(r, 3000));

    const pageText = await page.evaluate(() => document.body.innerText || "");
    if (pageText.includes("404") || pageText.includes("yayında değil")) {
      throw new Error("Bu ürün artık yayında değil.");
    }

    const result = await page.evaluate(() => {
      const doc = document;
      const bodyText = doc.body.innerText || "";
      const lines = bodyText.split("\n").filter((l) => l.trim().length > 0);

      // Name
      let name = doc.querySelector("h1")?.textContent?.trim() || "";

      // Price - find first line with ₺ or TL (handles both 430 ₺ and ₺430)
      let priceStr = "";
      let priceNum = 0;
      for (const line of lines) {
        const m = line.match(/(?:(\d+)\s*[₺TL])|(?:[₺TL]\s*(\d+))/);
        if (m) {
          priceNum = parseInt(m[1] || m[2]);
          if (priceNum > 0) { priceStr = `₺${priceNum}`; break; }
        }
      }

      // Description - find #hashtag line
      let description = "";
      for (const line of lines) {
        if (line.startsWith("#") && line.length > 10) {
          description = line;
          break;
        }
      }
      if (!description) {
        for (const line of lines) {
          if (line.length > 40 && line.length < 500 && !line.includes("₺") && !line.includes("Kargo") && !line.includes("Beden")) {
            description = line;
            break;
          }
        }
      }

      // Category from URL path (handles both /kategori/urun-adi and ...-kategori-p-123)
      let category = "";
      const path = window.location.pathname;
      const parts = path.split("/").filter(Boolean);
      const catMap = {
        "giyim": "Giyim", "elbise": "Elbise", "etek": "Etek", "pantolon": "Pantolon",
        "ust-giyim": "Üst Giyim", "dis-giyim": "Dış Giyim", "triko": "Triko",
        "gomlek": "Gömlek", "tulum": "Tulum", "aksesuar": "Aksesuar",
        "taki": "Aksesuar", "canta": "Çanta", "ayakkabi": "Ayakkabı",
        "mont": "Mont", "ceket": "Ceket", "kazak": "Kazak", "hırka": "Hırka",
        "blazer": "Blazer", "sort": "Şort", "mayo": "Mayo", "abiye": "Abiye",
        "ic-giyim": "İç Giyim", "kozmetik": "Kozmetik", "cilt-bakimi": "Cilt Bakımı",
      };
      if (parts.length >= 2) {
        // Try second segment (new format: /kadin/etek/urun-adi)
        category = catMap[parts[1]] || "";
      }
      if (!category && parts.length >= 3) {
        // Try third segment
        category = catMap[parts[2]] || "";
      }
      // Fallback: search URL parts for category keyword
      if (!category) {
        for (const part of parts) {
          for (const [key, val] of Object.entries(catMap)) {
            if (part.includes(key)) { category = val; break; }
          }
          if (category) break;
        }
      }

      // Condition
      let condition = "second";
      if (/Sıfır|Yeni|Etiketli|New|sıfır|yeni|etiketli/i.test(bodyText)) condition = "new";

      // Images - get all image URLs from the page
      const imgSet = new Set();
      doc.querySelectorAll("img").forEach((img) => {
        const src = img.getAttribute("src");
        if (src && src.startsWith("http") && !src.includes("avatar") && !src.includes("favicon") && !src.includes("positive_impact")) {
          if (src.includes("user_items") || src.includes("images.gardrops")) {
            imgSet.add(src);
          }
        }
      });

      // If only 1-2 images found, try broader approach
      if (imgSet.size < 2) {
        doc.querySelectorAll("img").forEach((img) => {
          const src = img.getAttribute("src");
          if (src && src.startsWith("http") && !src.includes("avatar") && !src.includes("favicon")) {
            imgSet.add(src);
          }
        });
      }

      return {
        name: name || lines[3] || "",
        price: priceStr,
        priceNum,
        description,
        category,
        condition,
        images: Array.from(imgSet).slice(0, 10),
      };
    });

    if (!result.name) {
      throw new Error("Ürün bilgileri bulunamadı.");
    }

    return {
      ...result,
      gardropsUrl: page.url(),
      hasDiscount: false,
      originalPrice: "",
      originalPriceNum: 0,
    };
  } finally {
    if (page) await page.close().catch(() => {});
    if (ownBrowser) await browser.close();
  }
}
