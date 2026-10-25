// HTTP payloads retain backend snake_case names rather than remapping at each call.
export type PropertyFeatures = {
  square_footage: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  lot_size: number;
  distance_to_city_center: number;
  school_rating: number;
};

export type Property = PropertyFeatures & { id: number; price: number };

export type Estimate = {
  id: string;
  name: string;
  created_at: string;
  features: PropertyFeatures;
  price: number;
  warnings: string[];
  model_version: string;
  price_unit: string;
};

export type HistoryPage = {
  items: Estimate[];
  total: number;
  page: number;
  page_size: number;
};

// Query keys match the Java API; strings preserve unsubmitted form input values.
export type MarketFilters = {
  bedrooms?: string;
  minPrice?: string;
  maxPrice?: string;
  minArea?: string;
  maxArea?: string;
  minSchoolRating?: string;
};

export type MarketOverview = {
  summary: {
    property_count: number;
    dataset_count: number;
    mean_price: number | null;
    median_price: number | null;
    min_price: number | null;
    max_price: number | null;
    average_area: number | null;
    average_price_per_sqft: number | null;
  };
  segments: {
    label: string;
    bedrooms: number;
    count: number;
    mean_price: number;
    median_price: number;
  }[];
  distribution: { label: string; count: number }[];
  properties: Property[];
  dataset_version: string;
};

export type ModelInfo = {
  model_version: string;
  algorithm: string;
  training_rows: number;
  trained_at: string;
  dataset_sha256: string;
  feature_names: string[];
  coefficients: Record<string, number>;
  intercept: number;
  feature_ranges: Record<string, { minimum: number; maximum: number }>;
  evaluation: {
    method: string;
    folds: number;
    seed: number;
    regression: { mae: number; rmse: number; r2: number };
    baseline: { mae: number; rmse: number; r2: number };
  };
  price_unit: string;
  limitations: string[];
  library_versions: Record<string, string>;
};

export type WhatIfResult = {
  baseline: { price: number; warnings: string[] };
  scenario: { price: number; warnings: string[] };
  change: number;
  change_percent: number | null;
  model_version: string;
  price_unit: string;
};
