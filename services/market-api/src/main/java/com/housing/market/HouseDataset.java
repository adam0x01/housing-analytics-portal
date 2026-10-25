package com.housing.market;

import static com.housing.market.Domain.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Validates one immutable dataset snapshot shared by analysis and exports. */
@Component
public class HouseDataset {
  public static final List<String> COLUMNS =
      List.of(
          "id",
          "square_footage",
          "bedrooms",
          "bathrooms",
          "year_built",
          "lot_size",
          "distance_to_city_center",
          "school_rating",
          "price");
  private final List<Property> properties;
  private final String version;

  public HouseDataset(@Value("${market.dataset-path}") String path)
      throws IOException, NoSuchAlgorithmException {
    byte[] bytes = Files.readAllBytes(Path.of(path));
    // Match the model's fingerprint using the original bytes, including the CSV BOM.
    version = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    String content =
        new String(bytes, java.nio.charset.StandardCharsets.UTF_8).replaceFirst("^\uFEFF", "");
    List<Property> rows = new ArrayList<>();
    Set<Integer> ids = new HashSet<>();
    try (CSVParser parser =
        CSVParser.parse(
            content, CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).get())) {
      if (!parser.getHeaderNames().equals(COLUMNS)) {
        throw new IllegalArgumentException("Housing CSV has an unexpected column structure");
      }
      for (var row : parser) {
        var property =
            new Property(
                Integer.parseInt(row.get("id")),
                number(row.get("square_footage")),
                Integer.parseInt(row.get("bedrooms")),
                number(row.get("bathrooms")),
                Integer.parseInt(row.get("year_built")),
                number(row.get("lot_size")),
                number(row.get("distance_to_city_center")),
                number(row.get("school_rating")),
                number(row.get("price")));
        if (!ids.add(property.id())
            || property.id() <= 0
            || property.price() <= 0
            || property.squareFootage() <= 0
            || property.bathrooms() <= 0
            || property.bedrooms() < 0
            || property.yearBuilt() < 1
            || property.yearBuilt() > 9999
            || property.lotSize() < 0
            || property.distanceToCityCenter() < 0
            || property.schoolRating() < 0) {
          throw new IllegalArgumentException(
              "Invalid or duplicate housing record: " + property.id());
        }
        rows.add(property);
      }
    }
    if (rows.isEmpty()) throw new IllegalArgumentException("Housing dataset is empty");
    properties = List.copyOf(rows);
  }

  private static double number(String value) {
    double parsed = Double.parseDouble(value);
    if (!Double.isFinite(parsed)) throw new IllegalArgumentException("Non-finite housing feature");
    return parsed;
  }

  public List<Property> properties() {
    return properties;
  }

  public String version() {
    return version;
  }
}
