import type { GoogleAdsRow } from '@/lib/dashboard-shared';

export const GOOGLE_ADS_SHEET_DATA_VERSION = 2;

export type GoogleAdsSheetRawRow = Record<string, string>;

const CONVERSION_HEADERS = [
  'Conversions',
  'Conversionen',
  'Konversionen',
  'Conv.',
  'Conversions (nach Conv.-Zeit)',
  'Alle Conversions',
  'All conversions',
];

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

export function parseGoogleAdsSheetNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).trim().replace(/[^\d,.\-]/g, '');
  if (!cleaned || cleaned === '-') return 0;

  const comma = cleaned.lastIndexOf(',');
  const dot = cleaned.lastIndexOf('.');
  let normalized = cleaned;

  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (comma >= 0) {
    const thousandsOnly = /^-?\d{1,3}(,\d{3})+$/.test(cleaned);
    normalized = thousandsOnly ? cleaned.replace(/,/g, '') : cleaned.replace(',', '.');
  } else if (dot >= 0 && (cleaned.match(/\./g)?.length ?? 0) > 1) {
    normalized = cleaned.replace(/\./g, '');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function readGoogleAdsSheetNumber(
  row: GoogleAdsSheetRawRow,
  headers: string[],
): number {
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  const match = Object.entries(row).find(([header]) => normalizedHeaders.has(normalizeHeader(header)));
  return parseGoogleAdsSheetNumber(match?.[1]);
}

export function readGoogleAdsConversions(row: GoogleAdsSheetRawRow): number {
  return readGoogleAdsSheetNumber(row, CONVERSION_HEADERS);
}

function sumConversions(rows: GoogleAdsRow[]) {
  return rows.reduce((sum, row) => sum + (Number.isFinite(row.conversions) ? row.conversions : 0), 0);
}

function conversionsByCampaign(rows: GoogleAdsRow[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.campaign, (totals.get(row.campaign) ?? 0) + row.conversions);
  }
  return totals;
}

export function reconcileGoogleAdsCampaignConversions(
  campaignRows: GoogleAdsRow[],
  detailLevels: GoogleAdsRow[][],
): { rows: GoogleAdsRow[]; conversions: number; fallbackUsed: boolean } {
  const campaignTotal = sumConversions(campaignRows);
  if (campaignTotal > 0 || campaignRows.length === 0) {
    return { rows: campaignRows, conversions: campaignTotal, fallbackUsed: false };
  }

  const fallbackRows = detailLevels.find((rows) => sumConversions(rows) > 0);
  if (!fallbackRows) {
    return { rows: campaignRows, conversions: 0, fallbackUsed: false };
  }

  const fallbackByCampaign = conversionsByCampaign(fallbackRows);
  const assignedCampaigns = new Set<string>();
  const reconciled = campaignRows.map((row) => {
    const conversionTotal = fallbackByCampaign.get(row.campaign) ?? 0;
    if (conversionTotal <= 0 || assignedCampaigns.has(row.campaign)) return row;
    assignedCampaigns.add(row.campaign);
    return { ...row, conversions: conversionTotal };
  });

  return {
    rows: reconciled,
    conversions: sumConversions(reconciled),
    fallbackUsed: true,
  };
}
