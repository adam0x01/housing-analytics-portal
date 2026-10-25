"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fields, type EstimateForm } from "@/lib/property-schema";

/** Shared field metadata keeps estimator and what-if forms consistent. */
export function PropertyFields({
  register,
  errors,
  disabled,
  prefix = "property",
}: {
  register: UseFormRegister<EstimateForm>;
  errors: FieldErrors<EstimateForm>;
  disabled?: boolean;
  prefix?: string;
}) {
  return (
    <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
      {fields.map((field) => {
        const error = errors.features?.[field.name];
        const id = `${prefix}-${field.name}`;

        return (
          <div
            key={field.name}
            className={
              field.name === "school_rating"
                ? "sm:col-span-2 sm:max-w-[calc(50%-10px)]"
                : ""
            }
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label htmlFor={id} className="text-xs font-medium">
                {field.label}
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {field.unit}
              </span>
            </div>
            <Input
              id={id}
              type="number"
              inputMode={field.step === "1" ? "numeric" : "decimal"}
              step={field.step}
              min={field.min}
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={`${id}-hint`}
              className="h-10 bg-background/40 tabular-nums"
              {...register(`features.${field.name}`, { valueAsNumber: true })}
            />
            <p
              id={`${id}-hint`}
              className={`mt-1.5 text-[10px] leading-4 ${error ? "text-destructive" : "text-muted-foreground"}`}
            >
              {error?.message ?? field.hint}
            </p>
          </div>
        );
      })}
    </div>
  );
}
