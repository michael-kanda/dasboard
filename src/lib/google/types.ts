

export interface DailyDataPoint {
  date: number; // Timestamp
  value: number;
}

export interface DateRangeData {
  total: number;
  daily: DailyDataPoint[];
}

export interface Ga4ExtendedData {
  sessions: DateRangeData;
  totalUsers: DateRangeData;
  newUsers: DateRangeData;
  conversions: DateRangeData;
  bounceRate: DateRangeData;
  engagementRate: DateRangeData;
  avgEngagementTime: DateRangeData;
  clicks: DateRangeData;
  impressions: DateRangeData;
  paidSearch: DateRangeData;
}
