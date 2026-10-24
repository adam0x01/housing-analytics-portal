package com.housing.market;

import static com.housing.market.Domain.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.springframework.stereotype.Component;

@Component
public class MarketExport {
  public String csv(Overview overview) throws IOException {
    var writer = new StringWriter();
    try (var printer =
        new CSVPrinter(
            writer,
            CSVFormat.DEFAULT
                .builder()
                .setHeader(HouseDataset.COLUMNS.toArray(String[]::new))
                .get())) {
      for (var row : overview.properties()) {
        printer.printRecord(
            row.id(),
            row.squareFootage(),
            row.bedrooms(),
            row.bathrooms(),
            row.yearBuilt(),
            row.lotSize(),
            row.distanceToCityCenter(),
            row.schoolRating(),
            row.price());
      }
    }
    return writer.toString();
  }

  public byte[] pdf(Overview overview, Filter filter) throws IOException {
    try (var document = new PDDocument();
        var output = new ByteArrayOutputStream()) {
      var normal = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
      var bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
      int perPage = 28;
      int pages = Math.max(1, (overview.properties().size() + perPage - 1) / perPage);
      for (int pageIndex = 0; pageIndex < pages; pageIndex++) {
        var page =
            new PDPage(new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth()));
        document.addPage(page);
        try (var canvas = new PDPageContentStream(document, page)) {
          text(canvas, bold, 23, 40, 546, "Housing market report");
          text(
              canvas,
              normal,
              9,
              40,
              526,
              "Supplied reference dataset | Price and distance units as supplied; currency"
                  + " unspecified");
          String generated =
              DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'HKT'")
                  .withZone(ZoneId.of("Asia/Hong_Kong"))
                  .format(Instant.now());
          text(
              canvas,
              normal,
              9,
              40,
              507,
              "Generated "
                  + generated
                  + " | "
                  + overview.summary().propertyCount()
                  + " matching properties");
          text(
              canvas,
              normal,
              9,
              40,
              489,
              "Filters: beds="
                  + filterLabel(filter.bedrooms())
                  + " price="
                  + filterLabel(filter.minPrice())
                  + " to "
                  + filterLabel(filter.maxPrice())
                  + " area="
                  + filterLabel(filter.minArea())
                  + " to "
                  + filterLabel(filter.maxArea())
                  + " min rating="
                  + filterLabel(filter.minSchoolRating()));
          text(
              canvas,
              bold,
              10,
              40,
              467,
              "Median: "
                  + label(overview.summary().medianPrice())
                  + " | Mean: "
                  + label(overview.summary().meanPrice()));
          float[] columns = {40, 86, 168, 226, 285, 354, 445, 558, 675};
          String[] headers = {
            "ID",
            "Area (sq ft)",
            "Beds",
            "Baths",
            "Built",
            "Lot size",
            "Distance",
            "School rating",
            "Price"
          };
          for (int i = 0; i < columns.length; i++)
            text(canvas, bold, 9, columns[i], 438, headers[i]);
          canvas.setStrokingColor(180 / 255f, 190 / 255f, 190 / 255f);
          canvas.moveTo(40, 428);
          canvas.lineTo(795, 428);
          canvas.stroke();
          int first = pageIndex * perPage;
          int last = Math.min(first + perPage, overview.properties().size());
          for (int j = first; j < last; j++) {
            var row = overview.properties().get(j);
            String[] cells = {
              Integer.toString(row.id()),
              label(row.squareFootage()),
              Integer.toString(row.bedrooms()),
              label(row.bathrooms()),
              Integer.toString(row.yearBuilt()),
              label(row.lotSize()),
              label(row.distanceToCityCenter()),
              label(row.schoolRating()),
              label(row.price())
            };
            for (int i = 0; i < columns.length; i++)
              text(canvas, normal, 9, columns[i], 410 - (j - first) * 12, cells[i]);
          }
          if (overview.properties().isEmpty())
            text(canvas, normal, 11, 40, 400, "No properties match these filters.");
          text(
              canvas,
              normal,
              8,
              40,
              45,
              "Cross-sectional sample, not a historical market trend. Dataset "
                  + overview.datasetVersion().substring(0, 12));
          text(canvas, normal, 8, 740, 45, "Page " + (pageIndex + 1) + " / " + pages);
        }
      }
      document.save(output);
      return output.toByteArray();
    }
  }

  private static String label(Number value) {
    return value == null
        ? "N/A"
        : String.format(Locale.US, "%,.2f", value.doubleValue()).replaceAll("\\.00$", "");
  }

  private static String filterLabel(Number value) {
    return value == null ? "Any" : label(value);
  }

  private static void text(
      PDPageContentStream stream, PDFont font, int size, float x, float y, String value)
      throws IOException {
    stream.beginText();
    stream.setFont(font, size);
    stream.newLineAtOffset(x, y);
    stream.showText(value);
    stream.endText();
  }
}
