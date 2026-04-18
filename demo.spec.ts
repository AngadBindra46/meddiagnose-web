/**
 * MedDiagnose Demo - Records video of full patient flow:
 * Login → Insurance → Upload report → AI diagnosis → Find pharmacy
 *
 * Run: npx playwright test demo.spec.ts --project=chromium
 * Video saved to: test-results/.../video.webm
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.DEMO_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:8000';

test.describe('MedDiagnose Demo Flow', () => {
  test.use({ video: 'on', trace: 'on' });

  test('Patient: login → insurance → diagnosis → find pharmacy', async ({ page }) => {
    // 1. Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'patient1@gmail.com');
    await page.fill('input[type="password"]', 'Patient@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 10000 });

    // 2. Insurance - show policies
    await page.click('a[href="/insurance"]');
    await page.waitForSelector('text=Insurance', { timeout: 5000 });
    await page.waitForTimeout(1500);

    // 3. New Diagnosis
    await page.click('a[href="/new-diagnosis"]');
    await page.fill('textarea, input[placeholder*="symptom" i]', 'fever, fatigue, body ache for 3 days');
    await page.waitForTimeout(500);

    // 4. Get AI Diagnosis (may use mock if Ollama not running)
    await page.click('button:has-text("Get AI Diagnosis"), button:has-text("Analyze")');
    await page.waitForSelector('text=Diagnosis, text=Medications, text=Paracetamol, text=confidence', {
      timeout: 60000,
    }).catch(() => {});
    await page.waitForTimeout(3000);

    // 5. Find pharmacy (click if medications shown)
    const findPharmacy = page.locator('a:has-text("Find nearest pharmacy")');
    if (await findPharmacy.isVisible()) {
      await findPharmacy.click();
      await page.waitForSelector('text=Pharmacy, text=Search, text=Nearby', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // 6. Search pharmacies
    const searchBtn = page.locator('button:has-text("Search")');
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.waitForTimeout(2000);
  });
});
