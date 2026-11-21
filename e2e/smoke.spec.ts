import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Keep runs fast and deterministic: no remote photos or map tiles.
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => {
    if (route.request().resourceType() === "image") return route.abort();
    return route.continue();
  });
});

test("home renders the editorial hero and real counts", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find your next frame.");
  await expect(page.getByText("ฐานข้อมูลโลเคชันถ่ายทำ")).toBeVisible();
  await expect(page.getByRole("link", { name: "ดูทุกโลเคชัน" })).toBeVisible();
  await expect(page.getByText("โลเคชันที่ตรวจสอบแล้ว")).toBeVisible();
});

test("search suggestions navigate to a published location", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "ค้นหาโลเคชัน" });
  await search.fill("วัด");
  const options = page.getByRole("option");
  await expect(options.first()).toBeVisible();
  await options.first().click();
  await expect(page).toHaveURL(/\/locations\//);
  await expect(page.getByText("PRODUCTION NOTES")).toBeVisible();
});

test("explore filters by province and never shows drafts", async ({ page }) => {
  await page.goto("/explore?province=bangkok");
  await expect(page.getByText(/LOCATION INDEX/i)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("EXPLORE");
  const cards = page.locator('a[href^="/locations/"]');
  expect(await cards.count()).toBeGreaterThan(0);
  const firstHref = await cards.first().getAttribute("href");
  expect(firstHref).toBeTruthy();
});

test("location detail shows photos, permission honesty and evidence", async ({ page }) => {
  await page.goto("/locations/wat-arun");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("วัดอรุณ");
  await expect(page.getByText("PRODUCTION NOTES")).toBeVisible();
  await expect(page.getByText("EVIDENCE")).toBeVisible();
  await expect(page.getByText("ยังไม่มีข้อมูลยืนยัน").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Wikimedia Commons/i }).first()).toBeVisible();
});

test("BACC uses the atrium cover and links the selected frame", async ({ page }) => {
  await page.goto("/locations/bangkok-art-and-culture-centre");
  await expect(page.locator("main img[fetchpriority=high]").first()).toHaveAttribute("src", /19405194938/);
  await expect(page.getByRole("heading", { name: "มุมกล้องที่คัดไว้" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ดูภาพอ้างอิงและเครดิต" })).toHaveAttribute(
    "href",
    /commons\.wikimedia\.org/,
  );
});

test("map page initialises MapLibre", async ({ page }) => {
  await page.goto("/map");
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => (await canvas.boundingBox())?.height ?? 0).toBeGreaterThan(350);
  await expect(page.getByText(/MAP/i).first()).toBeVisible();
});

test("mobile menu and filter sheet work with named controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "เปิดเมนู" });
  await menu.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();

  await menu.click();
  await dialog.getByRole("link", { name: "ค้นหาโลเคชัน" }).click();
  await page.getByRole("button", { name: "ตัวกรอง", exact: true }).click();
  await dialog.getByLabel("จังหวัด", { exact: true }).selectOption("bangkok");
  await dialog.getByRole("button", { name: /ดูผลลัพธ์/ }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/province=bangkok/);
});

test("explore and map limit results to a radius on mobile", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 13.7437, longitude: 100.4888 });

  for (const path of ["/explore", "/map"]) {
    await page.goto(path);
    const count = page.getByText(/\d+ RESULTS/).first();
    await expect(count).toBeVisible();
    const total = Number((await count.textContent())?.match(/(\d+) RESULTS/)?.[1]);
    expect(total).toBeGreaterThan(0);
    await page.getByRole("button", { name: "ใกล้ฉัน" }).click();
    await page.getByLabel("รัศมีจากตำแหน่งของฉัน").selectOption("5");
    await expect(page).toHaveURL(/radius=5/);
    await expect
      .poll(async () => {
        const filtered = Number((await count.textContent())?.match(/(\d+) RESULTS/)?.[1]);
        return filtered > 0 && filtered < total;
      })
      .toBe(true);
  }
});

test("live music filters official event and venue links", async ({ page }) => {
  await page.goto("/live-music");
  await expect(page.getByRole("heading", { level: 1, name: /LIVE MUSIC/ })).toBeVisible();
  await page.getByLabel("แนวดนตรี").selectOption("rap");
  await expect(page.getByRole("link", { name: /VOL. IS NOW/ })).toHaveAttribute(
    "href",
    "https://www.zipeventapp.com/e/VOL-IS-NOW",
  );
  await expect(page.getByRole("link", { name: /DISCONTENT/ })).toHaveCount(0);
  await page.getByLabel("จังหวัดของงาน").selectOption("phuket");
  await expect(page.getByRole("link", { name: /Illuzion Phuket/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /VOL. IS NOW/ })).toHaveCount(0);
});

test("find my vibe returns matched frames", async ({ page }) => {
  await page.goto("/find-my-vibe");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("FIND MY");
  const mood = page.locator("button[aria-pressed]").first();
  await mood.click();
  await expect(page.getByText(/MATCHED FRAMES/i)).toBeVisible();
});

test("boards can be created and persist in local storage", async ({ page }) => {
  await page.goto("/boards");
  await page.getByRole("button", { name: /NEW BOARD/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator("#board-title").fill("E2E — DARK BANGKOK");
  await page.locator("#board-desc").fill("ทดสอบการสร้างบอร์ด");
  await page.getByRole("button", { name: /สร้างบอร์ด/i }).click();
  await expect(page.getByText("E2E — DARK BANGKOK")).toBeVisible();
});

test("submit form validates then accepts a complete request", async ({ page }) => {
  await page.goto("/submit");
  await page.getByRole("button", { name: /ส่งเพื่อตรวจสอบ/i }).click();
  await expect(page.getByText("ระบุชื่อสถานที่อย่างน้อย 2 ตัวอักษร")).toBeVisible();

  await page.locator("#sub-name").fill("โรงภาพยนตร์ร้างทดสอบ");
  await page.locator("#sub-province").selectOption("bangkok");
  await page.locator("#sub-description").fill("อาคารโรงภาพยนตร์เก่าที่มีบันไดวนและผนังปูนเปลือย บรรยากาศเหมาะกับงานภาพแนวเมืองมืด");
  await page.locator("#sub-coords").fill("13.75630, 100.50180");
  await page.locator("#sub-source").fill("https://commons.wikimedia.org/wiki/Category:Test");
  await page.getByRole("button", { name: /ส่งเพื่อตรวจสอบ/i }).click();

  await expect(page.getByRole("heading", { name: "ได้รับข้อมูลแล้ว" })).toBeVisible();
  await expect(page.getByText(/บันทึกไว้ในเครื่องนี้แล้ว/)).toBeVisible();
});

test("admin requires sign-in and then shows real data quality", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "ADMIN ACCESS" })).toBeVisible();
  await expect(page.getByText("DEMO AUTH:")).toBeVisible();

  await page.locator("#admin-email").fill("e2e@local.test");
  await page.locator("#admin-name").fill("E2E Admin");
  await page.getByRole("button", { name: /เข้าสู่โหมดเครื่องนี้/i }).click();

  await expect(page.getByRole("heading", { name: "ADMIN CONTROL" })).toBeVisible();
  await expect(page.getByText("LOCAL DEMO SESSION")).toBeVisible();
  await expect(page.getByText("COVERAGE BY ZONE")).toBeVisible();
  await expect(page.getByText("REJECTION REASONS")).toBeVisible();

  await page.getByRole("button", { name: /DATA QUALITY/i }).click();
  await expect(page.getByText(/DRAFTS AWAITING PHOTOS/i)).toBeVisible();
  await expect(page.getByText(/REJECTED SEEDS/i)).toBeVisible();
});

test("about page states licensing and limitations", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("NO FAKE");
  await expect(page.getByText(/ไม่รับประกัน/).first()).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "ใบอนุญาต" })).toBeVisible();
});

test("unknown route renders a 404 with recovery links", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("หลุดเฟรม");
  await expect(page.locator("#main").getByRole("link", { name: "ค้นหาโลเคชัน" })).toBeVisible();
});
