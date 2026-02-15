import { test, expect } from '@playwright/test';
import { getTestProviders } from './fixtures/test-providers';

test('generates a 1-scene video end-to-end', async ({ page }) => {
  const providers = getTestProviders();

  // ── Stage 1: Config Screen ──

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible();

  // Scope sections by their h2 heading
  const llmSection = page.locator('section', { has: page.getByRole('heading', { name: 'LLM Settings', exact: true }) });
  const imageSection = page.locator('section', { has: page.getByRole('heading', { name: 'Image Settings', exact: true }) });
  const videoSection = page.locator('section', { has: page.getByRole('heading', { name: 'Video Settings', exact: true }) });
  const ttsSection = page.locator('section', { has: page.getByRole('heading', { name: 'TTS Settings', exact: true }) });

  // LLM: select provider, fill API key, select model
  await llmSection.getByRole('combobox').first().selectOption(providers.llm.provider);
  await llmSection.getByRole('textbox').fill(providers.llm.apiKey);

  const llmModelSelect = llmSection.getByRole('combobox').nth(1);
  await expect(llmModelSelect).toBeEnabled({ timeout: 10_000 });
  await llmModelSelect.selectOption(providers.llm.model);

  // Image: select provider, fill API key, wait for models, select model
  await imageSection.getByRole('combobox').first().selectOption(providers.image.provider);
  await imageSection.getByRole('textbox').fill(providers.image.apiKey);

  const imageModelSelect = imageSection.getByRole('combobox').nth(1);
  await expect(imageModelSelect).toBeEnabled({ timeout: 10_000 });
  await imageModelSelect.selectOption(providers.image.model);

  if (providers.image.provider === 'openai') {
    await imageSection.getByRole('combobox').nth(2).selectOption('low');
  }

  // Video: set 1 scene (second spinbutton after Frame Rate)
  await videoSection.getByRole('spinbutton').nth(1).fill('1');

  // TTS: fill ElevenLabs key
  await ttsSection.getByPlaceholder('Your ElevenLabs API key').fill(providers.tts.apiKey);

  // Start generation
  await page.getByRole('button', { name: 'Start Generation' }).click();
  await expect(page.getByRole('heading', { name: 'Generate Scenes' })).toBeVisible({ timeout: 5_000 });

  // ── Stage 2: Scene Generation ──

  await page.getByPlaceholder(/Enter your video topic/).fill('A cat sitting on a windowsill watching rain');
  await page.getByRole('button', { name: 'Generate Scenes' }).click();

  await expect(page.getByRole('button', { name: /Generate Assets/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /Generate Assets/ }).click();

  // ── Stage 3: Asset Generation ──

  await expect(page.getByRole('button', { name: 'Assemble Video' })).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Assemble Video' }).click();

  // ── Stage 4: Video Assembly → auto-transitions to output ──

  // ── Stage 5: Verification ──

  await expect(page.getByRole('heading', { name: /Your Video is Ready/ })).toBeVisible({ timeout: 60_000 });

  const video = page.locator('video');
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('src', /^blob:/);

  await expect(page.getByRole('button', { name: 'Download Video' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download Video' })).toBeEnabled();
});
