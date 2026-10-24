package com.housing.market;

import static com.housing.market.Domain.*;

import jakarta.validation.Valid;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

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
  public Overview overview(@Valid @ModelAttribute Filter filter) {
    filter.validate();
    return market.overview(filter);
  }

  @PostMapping("/market/what-if")
  public WhatIfResult whatIf(@Valid @RequestBody WhatIfRequest input) {
    return model.predict(input);
  }

  @GetMapping("/market/export.csv")
  public ResponseEntity<String> csv(@Valid @ModelAttribute Filter filter) throws IOException {
    filter.validate();
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=market-properties.csv")
        .body(export.csv(market.overview(filter)));
  }

  @GetMapping("/market/export.pdf")
  public ResponseEntity<byte[]> pdf(@Valid @ModelAttribute Filter filter) throws IOException {
    filter.validate();
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=market-report.pdf")
        .body(export.pdf(market.overview(filter), filter));
  }
}
