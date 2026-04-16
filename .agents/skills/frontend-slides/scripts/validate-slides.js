#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/validate-slides.js <presentation.html>");
    process.exit(1);
  }

  const absolutePath = path.resolve(inputPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(absolutePath, "utf8");
  const results = { errors: [], warnings: [], infos: [] };

  runStaticChecks(html, results);
  const runtimeOk = await runRuntimeChecks(absolutePath, results);

  printResults(absolutePath, results, runtimeOk);
  process.exit(results.errors.length > 0 ? 1 : 0);
}

function runStaticChecks(html, results) {
  const slideMatches = html.match(/class=["'][^"']*\bslide\b[^"']*["']/g) || [];
  const navDotMatches = html.match(/class=["'][^"']*\bnav-dots\b[^"']*["']/g) || [];
  const progressMatches = html.match(/class=["'][^"']*\bprogress-bar\b[^"']*["']/g) || [];

  if (slideMatches.length === 0) {
    results.errors.push("No `.slide` elements found.");
  } else {
    results.infos.push(`Found ${slideMatches.length} slide elements.`);
  }

  if (navDotMatches.length === 0) {
    results.warnings.push("No `.nav-dots` container found; dot navigation cannot render.");
  }

  if (progressMatches.length === 0) {
    results.warnings.push("No `.progress-bar` element found; progress sync cannot render.");
  }

  requirePattern(html, /scroll-snap-type\s*:\s*y\s+mandatory/i, results, "Missing `scroll-snap-type: y mandatory`.");
  requirePattern(html, /height\s*:\s*100vh/i, results, "Missing `height: 100vh` for slides.");
  requirePattern(html, /height\s*:\s*100dvh/i, results, "Missing `height: 100dvh` for slides.");
  requirePattern(html, /scroll-snap-align\s*:\s*start/i, results, "Missing `scroll-snap-align: start` for slides.");
  requirePattern(html, /overflow\s*:\s*hidden/i, results, "Missing `overflow: hidden` guard in slide styles.");
  requirePattern(html, /prefers-reduced-motion/i, results, "Missing `prefers-reduced-motion` block.");
  requirePattern(html, /max-height\s*:\s*700px|max-height:\s*700px/i, results, "Missing `max-height: 700px` breakpoint.");
  requirePattern(html, /max-height\s*:\s*600px|max-height:\s*600px/i, results, "Missing `max-height: 600px` breakpoint.");
  requirePattern(html, /max-height\s*:\s*500px|max-height:\s*500px/i, results, "Missing `max-height: 500px` breakpoint.");

  if (!/fonts\.googleapis\.com|fonts\.gstatic\.com|api\.fontshare\.com/i.test(html)) {
    results.warnings.push("No supported external font provider found.");
  }

  if (/fonts\.googleapis\.com/i.test(html) && !/display=swap/i.test(html)) {
    results.warnings.push("Google Fonts link is missing `display=swap`.");
  }

  if (!/preconnect/i.test(html)) {
    results.warnings.push("No font `preconnect` links found.");
  }

  if (!/goToSlide\s*\(/.test(html)) {
    results.errors.push("Missing `goToSlide()` implementation.");
  }

  if (!/IntersectionObserver/.test(html)) {
    results.warnings.push("No `IntersectionObserver` found for reveal animations.");
  }

  if (/IntersectionObserver[\s\S]{0,1200}currentSlide/.test(html)) {
    results.warnings.push("`IntersectionObserver` appears to touch `currentSlide`; prefer scroll-derived active slide state.");
  }

  if (!/innerHTML\s*=\s*["']{2}/.test(html) && !/replaceChildren\s*\(/.test(html)) {
    results.warnings.push("Nav dots do not appear to clear existing children before rebuilding.");
  }

  const headingLineHeights = [...html.matchAll(/line-height\s*:\s*([0-9.]+)/gi)];
  headingLineHeights.forEach((match) => {
    const value = Number(match[1]);
    if (!Number.isNaN(value) && value < 1) {
      results.warnings.push(`Found risky line-height ${value}; headings may clip in fallback fonts.`);
    }
  });

  const riskyTitleWidths = [...html.matchAll(/max-width\s*:\s*([0-9.]+)ch/gi)];
  riskyTitleWidths.forEach((match) => {
    const value = Number(match[1]);
    if (!Number.isNaN(value) && value <= 8) {
      results.warnings.push(`Found very tight title width ${value}ch; verify fallback fonts do not wrap or clip.`);
    }
  });

  if (/-clamp\(|-min\(|-max\(/.test(html)) {
    results.errors.push("Found invalid negated CSS math function like `-clamp()` / `-min()` / `-max()`.");
  }
}

function requirePattern(html, pattern, results, message) {
  if (!pattern.test(html)) {
    results.errors.push(message);
  }
}

async function runRuntimeChecks(absolutePath, results) {
  let playwright;
  try {
    playwright = require("playwright");
  } catch (error) {
    results.warnings.push("Playwright is not installed; skipped runtime browser checks.");
    return false;
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    await page.goto(pathToFileURL(absolutePath).href, { waitUntil: "load" });
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });
    await page.waitForTimeout(600);

    const initial = await page.evaluate(() => {
      const slides = Array.from(document.querySelectorAll(".slide"));
      const dots = Array.from(document.querySelectorAll(".nav-dot"));
      const activeDots = dots.filter((dot) => dot.classList.contains("active"));
      const visibleSlide = slides.find((slide) => {
        const rect = slide.getBoundingClientRect();
        return rect.top <= window.innerHeight * 0.5 && rect.bottom >= window.innerHeight * 0.5;
      }) || slides[0] || null;

      const headings = visibleSlide
        ? Array.from(visibleSlide.querySelectorAll("h1, h2, h3, .headline, .hero-title, .section-title, .chapter-title")).map((el) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return {
              text: (el.textContent || "").trim().slice(0, 80),
              top: rect.top,
              bottom: rect.bottom,
              height: rect.height,
              lineHeight: style.lineHeight,
            };
          })
        : [];

      return {
        slideCount: slides.length,
        dotCount: dots.length,
        activeDotCount: activeDots.length,
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        headings,
      };
    });

    if (initial.slideCount > 1 && initial.scrollHeight <= initial.viewportHeight + 2) {
      results.errors.push("Page is not vertically scrollable even though multiple slides exist.");
    }

    if (initial.dotCount > 0 && initial.dotCount !== initial.slideCount) {
      results.errors.push(`Nav dot count (${initial.dotCount}) does not match slide count (${initial.slideCount}).`);
    }

    if (initial.dotCount > 0 && initial.activeDotCount !== 1) {
      results.errors.push(`Expected exactly one active nav dot on load, found ${initial.activeDotCount}.`);
    }

    if (initial.scrollWidth > initial.viewportWidth + 4) {
      results.warnings.push("Detected horizontal overflow in runtime layout.");
    }

    initial.headings.forEach((heading) => {
      if (heading.height === 0) {
        results.warnings.push(`Heading has zero height: "${heading.text}".`);
      }
      if (heading.top < -2 || heading.bottom > initial.viewportHeight + 2) {
        results.warnings.push(`Heading may be clipped in viewport: "${heading.text}".`);
      }
    });

    await page.evaluate(() => {
      const slides = Array.from(document.querySelectorAll(".slide"));
      const lastSlide = slides[slides.length - 1];
      lastSlide?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await page.waitForTimeout(400);

    const afterLast = await page.evaluate(() => {
      const dots = Array.from(document.querySelectorAll(".nav-dot"));
      const activeIndex = dots.findIndex((dot) => dot.classList.contains("active"));
      const progressBar = document.querySelector(".progress-bar");
      return {
        activeIndex,
        progressTransform: progressBar ? getComputedStyle(progressBar).transform : null,
      };
    });

    if (initial.slideCount > 1 && initial.dotCount > 0 && afterLast.activeIndex !== initial.slideCount - 1) {
      results.errors.push("Active nav dot did not move to the last slide after scrolling.");
    }

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(300);

    const backToFirst = await page.evaluate(() => {
      const dots = Array.from(document.querySelectorAll(".nav-dot"));
      return dots.findIndex((dot) => dot.classList.contains("active"));
    });

    if (initial.dotCount > 0 && backToFirst !== 0) {
      results.errors.push("Active nav dot did not return to the first slide after scrolling back.");
    }

    consoleErrors.forEach((message) => results.errors.push(`Console error: ${message}`));
    pageErrors.forEach((message) => results.errors.push(`Page error: ${message}`));
    return true;
  } finally {
    await browser.close();
  }
}

function printResults(absolutePath, results, runtimeOk) {
  console.log(`Validated ${absolutePath}`);
  console.log(runtimeOk ? "Runtime checks: enabled" : "Runtime checks: skipped");

  if (results.infos.length) {
    console.log("\nInfo:");
    results.infos.forEach((item) => console.log(`- ${item}`));
  }

  if (results.warnings.length) {
    console.log("\nWarnings:");
    results.warnings.forEach((item) => console.log(`- ${item}`));
  }

  if (results.errors.length) {
    console.log("\nErrors:");
    results.errors.forEach((item) => console.log(`- ${item}`));
  } else {
    console.log("\nNo blocking errors found.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
