package com.housing.market;

import static com.housing.market.Domain.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.Map;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/** Exposes market workflows while analysis, model calls, and rendering stay in separate services. */
@RestController
public class MarketController {
  private final MarketService market;
  private final ModelGateway model;
  private final HouseDataset dataset;
  private final MarketExport export;

  public MarketController(
      MarketService market, ModelGateway model, HouseDataset dataset, MarketExport export) {
    this.market = market;
    this.model = model;
    this.dataset = dataset;
    this.export = export;
  }

  @GetMapping("/health")
  @Operation(summary = "Check dataset readiness")
  public Map<String, Object> health() {
    return Map.of(
        "status",
        "ok",
        "dataset_version",
        dataset.version(),
        "properties",
        dataset.properties().size());
  }

  @GetMapping("/market/overview")
  @Operation(summary = "Get market statistics and properties for a segment")
  public Overview overview(@Valid @ParameterObject @ModelAttribute Filter filter) {
    filter.validate();
    return market.overview(filter);
  }

  @PostMapping("/market/what-if")
  @Operation(summary = "Compare baseline and scenario prices using the housing model")
  public WhatIfResult whatIf(@Valid @RequestBody WhatIfRequest input) {
    return model.predict(input);
  }

  @GetMapping("/market/export.csv")
  @Operation(summary = "Download matching properties as CSV")
  @ApiResponse(
      responseCode = "200",
      description = "CSV download",
      content = @Content(mediaType = "text/csv", schema = @Schema(type = "string")))
  public ResponseEntity<String> csv(@Valid @ParameterObject @ModelAttribute Filter filter)
      throws IOException {
    filter.validate();
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=market-properties.csv")
        .body(export.csv(market.overview(filter)));
  }

  @GetMapping("/market/export.pdf")
  @Operation(summary = "Download a market report as PDF")
  @ApiResponse(
      responseCode = "200",
      description = "PDF download",
      content =
          @Content(
              mediaType = "application/pdf", schema = @Schema(type = "string", format = "binary")))
  public ResponseEntity<byte[]> pdf(@Valid @ParameterObject @ModelAttribute Filter filter)
      throws IOException {
    filter.validate();
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=market-report.pdf")
        .body(export.pdf(market.overview(filter), filter));
  }
}
