package com.housing.market;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class Domain {
  private Domain() {}

  public record Property(
      int id,
      double squareFootage,
      int bedrooms,
      double bathrooms,
      int yearBuilt,
      double lotSize,
      double distanceToCityCenter,
      double schoolRating,
      double price) {
    public Features features() {
      return new Features(
          BigDecimal.valueOf(squareFootage),
          bedrooms,
          BigDecimal.valueOf(bathrooms),
          yearBuilt,
          BigDecimal.valueOf(lotSize),
          BigDecimal.valueOf(distanceToCityCenter),
          BigDecimal.valueOf(schoolRating));
    }
  }

  public record Features(
      @NotNull @Positive BigDecimal squareFootage,
      @NotNull @Min(0) Integer bedrooms,
      @NotNull @Positive BigDecimal bathrooms,
      @NotNull @Min(1) @Max(9999) Integer yearBuilt,
      @NotNull @PositiveOrZero BigDecimal lotSize,
      @NotNull @PositiveOrZero BigDecimal distanceToCityCenter,
      @NotNull @PositiveOrZero BigDecimal schoolRating) {}

  public record Filter(
      @Min(0) Integer bedrooms,
      @PositiveOrZero Double minPrice,
      @PositiveOrZero Double maxPrice,
      @PositiveOrZero Double minArea,
      @PositiveOrZero Double maxArea,
      @PositiveOrZero Double minSchoolRating) {
    public void validate() {
      boolean nonFinite =
          Stream.of(minPrice, maxPrice, minArea, maxArea, minSchoolRating)
              .filter(Objects::nonNull)
              .anyMatch(value -> !Double.isFinite(value));
      if (nonFinite
          || (minPrice != null && maxPrice != null && minPrice > maxPrice)
          || (minArea != null && maxArea != null && minArea > maxArea)) {
        throw new ResponseStatusException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            "Filter bounds must be finite and minimum values must not exceed maximum values.");
      }
    }

    public boolean matches(Property property) {
      return (bedrooms == null || property.bedrooms() == bedrooms)
          && (minPrice == null || property.price() >= minPrice)
          && (maxPrice == null || property.price() <= maxPrice)
          && (minArea == null || property.squareFootage() >= minArea)
          && (maxArea == null || property.squareFootage() <= maxArea)
          && (minSchoolRating == null || property.schoolRating() >= minSchoolRating);
    }
  }

  public record Summary(
      int propertyCount,
      int datasetCount,
      Double meanPrice,
      Double medianPrice,
      Double minPrice,
      Double maxPrice,
      Double averageArea,
      Double averagePricePerSqft) {}

  public record Segment(
      String label, int bedrooms, int count, double meanPrice, double medianPrice) {}

  public record Distribution(String label, int count) {}

  public record Overview(
      Summary summary,
      List<Segment> segments,
      List<Distribution> distribution,
      List<Property> properties,
      String datasetVersion) {}

  public record WhatIfRequest(
      @NotNull @Valid Features baseline, @NotNull @Valid Features scenario) {}

  public record Prediction(Double price, List<String> warnings) {}

  public record ModelOutput(String modelVersion, String priceUnit, List<Prediction> predictions) {}

  public record WhatIfResult(
      Prediction baseline,
      Prediction scenario,
      double change,
      Double changePercent,
      String modelVersion,
      String priceUnit) {}
}
