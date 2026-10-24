import { z } from "zod";
export const featuresSchema = z.object({
  square_footage: z
    .number({ error: "Enter a valid floor area" })
    .finite()
    .positive("Floor area must be greater than zero"),
  bedrooms: z
    .number({ error: "Enter the number of bedrooms" })
    .int("Use a whole number")
    .min(0),
  bathrooms: z
    .number({ error: "Enter the number of bathrooms" })
    .finite()
    .positive("Bathrooms must be greater than zero"),
  year_built: z
    .number({ error: "Enter the year built" })
    .int()
    .min(1)
    .max(9999),
  lot_size: z.number({ error: "Enter a valid lot size" }).finite().min(0),
  distance_to_city_center: z
    .number({ error: "Enter a valid distance" })
    .finite()
    .min(0),
  school_rating: z
    .number({ error: "Enter a valid school rating" })
    .finite()
    .min(0),
});
export const estimateSchema = z.object({
  name: z.string().trim().max(80, "Use 80 characters or fewer"),
  features: featuresSchema,
});
export type EstimateForm = z.infer<typeof estimateSchema>;
export const sampleFeatures = {
  square_footage: 1550,
  bedrooms: 3,
  bathrooms: 2,
  year_built: 1997,
  lot_size: 6800,
  distance_to_city_center: 4.1,
  school_rating: 7.6,
};
export const fields = [
  {
    name: "square_footage",
    label: "Floor area",
    unit: "sq ft",
    step: "any",
    min: 0,
    hint: "Interior floor area",
  },
  {
    name: "bedrooms",
    label: "Bedrooms",
    unit: "rooms",
    step: "1",
    min: 0,
    hint: "Whole number, including studios",
  },
  {
    name: "bathrooms",
    label: "Bathrooms",
    unit: "rooms",
    step: "0.5",
    min: 0,
    hint: "Half bathrooms are supported",
  },
  {
    name: "year_built",
    label: "Year built",
    unit: "year",
    step: "1",
    min: 1,
    hint: "Original construction year",
  },
  {
    name: "lot_size",
    label: "Lot size",
    unit: "source units",
    step: "any",
    min: 0,
    hint: "Units follow the supplied dataset",
  },
  {
    name: "distance_to_city_center",
    label: "Distance to city centre",
    unit: "source units",
    step: "any",
    min: 0,
    hint: "Units follow the supplied dataset",
  },
  {
    name: "school_rating",
    label: "School rating",
    unit: "source scale",
    step: "any",
    min: 0,
    hint: "Use the source dataset rating scale",
  },
] as const;
