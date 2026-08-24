import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseGoogleAdsSheetNumber,
  readGoogleAdsConversions,
  reconcileGoogleAdsCampaignConversions,
} from '../../src/lib/google-ads-sheet.ts';
import type { GoogleAdsRow } from '../../src/lib/dashboard-shared.ts';

function row(campaign: string, conversions: number): GoogleAdsRow {
  return {
    campaign,
    adGroup: '–',
    adName: '–',
    keyword: '–',
    searchQuery: '–',
    landingPage: '–',
    cost: 10,
    clicks: 5,
    impressions: 100,
    cpc: 2,
    roas: 0,
    conversions,
    sessions: 0,
    engagedSessions: 0,
  };
}

test('parses German and English Google Ads number formats', () => {
  assert.equal(parseGoogleAdsSheetNumber('1.234,56'), 1234.56);
  assert.equal(parseGoogleAdsSheetNumber('1,234.56'), 1234.56);
  assert.equal(parseGoogleAdsSheetNumber('2,00'), 2);
  assert.equal(parseGoogleAdsSheetNumber(2), 2);
});

test('recognizes conversion header variants', () => {
  assert.equal(readGoogleAdsConversions({ 'Conversions': '2,00' }), 2);
  assert.equal(readGoogleAdsConversions({ 'Conv.': '1.5' }), 1.5);
  assert.equal(readGoogleAdsConversions({ 'Alle Conversions': '3' }), 3);
});

test('uses one detail level when campaign conversions are missing', () => {
  const result = reconcileGoogleAdsCampaignConversions(
    [row('Steiermark', 0), row('Wien', 0)],
    [
      [row('Steiermark', 2), row('Wien', 1)],
      [row('Steiermark', 2), row('Wien', 1)],
    ],
  );

  assert.equal(result.conversions, 3);
  assert.equal(result.fallbackUsed, true);
  assert.deepEqual(result.rows.map((item) => item.conversions), [2, 1]);
});

test('keeps campaign conversions and does not double count detail levels', () => {
  const result = reconcileGoogleAdsCampaignConversions(
    [row('Steiermark', 2)],
    [[row('Steiermark', 2)]],
  );

  assert.equal(result.conversions, 2);
  assert.equal(result.fallbackUsed, false);
});
