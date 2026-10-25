package com.housing.market;

import static com.housing.market.Domain.*;

import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/** Computes overviews from an immutable dataset; equivalent filters share a bounded cache. */
@Service
public class MarketService {
  private final HouseDataset dataset;

  public MarketService(HouseDataset dataset) {
    this.dataset = dataset;
  }

  @Cacheable(cacheNames = "market-overview", sync = true)
  public Overview overview(Filter filter) {
    filter.validate();
    List<Property> rows = dataset.properties().stream().filter(filter::matches).toList();

    // Empty segments have no meaningful price statistics; do not present zero as a price.
    Summary summary =
        rows.isEmpty()
            ? new Summary(0, dataset.properties().size(), null, null, null, null, null, null)
            : new Summary(
                rows.size(),
                dataset.properties().size(),
                mean(rows),
                median(rows),
                rows.stream().mapToDouble(Property::price).min().orElseThrow(),
                rows.stream().mapToDouble(Property::price).max().orElseThrow(),
                rows.stream().mapToDouble(Property::squareFootage).average().orElseThrow(),
                rows.stream()
                    .mapToDouble(p -> p.price() / p.squareFootage())
                    .average()
                    .orElseThrow());

    var grouped =
        rows.stream()
            .collect(Collectors.groupingBy(Property::bedrooms, TreeMap::new, Collectors.toList()));
    List<Segment> segments =
        grouped.entrySet().stream()
            .map(
                entry ->
                    new Segment(
                        entry.getKey() + " bedrooms",
                        entry.getKey(),
                        entry.getValue().size(),
                        mean(entry.getValue()),
                        median(entry.getValue())))
            .toList();

    // Fixed full-dataset bands keep the histogram comparable when segment filters change.
    List<Distribution> distribution = new ArrayList<>();
    double low = dataset.properties().stream().mapToDouble(Property::price).min().orElseThrow();
    double high = dataset.properties().stream().mapToDouble(Property::price).max().orElseThrow();
    double width = (high - low) / 5;

    for (int i = 0; i < 5; i++) {
      double start = low + i * width;
      double end = low + (i + 1) * width;
      boolean last = i == 4;
      int count =
          (int)
              rows.stream()
                  .filter(p -> p.price() >= start && (last ? p.price() <= end : p.price() < end))
                  .count();
      distribution.add(
          new Distribution(Math.round(start / 1000) + "k-" + Math.round(end / 1000) + "k", count));
    }

    return new Overview(summary, segments, distribution, rows, dataset.version());
  }

  private static double mean(List<Property> rows) {
    return rows.stream().mapToDouble(Property::price).average().orElseThrow();
  }

  private static double median(List<Property> rows) {
    double[] values = rows.stream().mapToDouble(Property::price).sorted().toArray();
    int middle = values.length / 2;
    return values.length % 2 == 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
  }
}
