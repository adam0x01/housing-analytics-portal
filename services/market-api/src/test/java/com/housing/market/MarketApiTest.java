package com.housing.market;

import static com.housing.market.Domain.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class MarketApiTest {
  @Autowired MockMvc mvc;
  @Autowired MarketService market;
  @Autowired com.fasterxml.jackson.databind.ObjectMapper mapper;
  @Autowired org.springframework.web.client.RestClient.Builder restClientBuilder;
  static HttpServer server;
  static AtomicReference<String> response = new AtomicReference<>();
  static AtomicReference<String> lastRequest = new AtomicReference<>();
  static AtomicReference<String> lastUpgrade = new AtomicReference<>();

  @DynamicPropertySource
  static void configure(DynamicPropertyRegistry registry) throws Exception {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/predict",
        exchange -> {
          lastUpgrade.set(exchange.getRequestHeaders().getFirst("Upgrade"));
          lastRequest.set(
              new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          byte[] bytes = response.get().getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.start();
    registry.add("market.model-api-url", () -> "http://127.0.0.1:" + server.getAddress().getPort());
  }

  @AfterAll
  static void stop() {
    if (server != null) server.stop(0);
  }

  @BeforeEach
  void setup() {
    response.set(
        "{\"model_version\":\"test-v1\",\"price_unit\":\"source"
            + " units\",\"predictions\":[{\"price\":250000,\"warnings\":[]},{\"price\":275000,\"warnings\":[]}]}");
    lastRequest.set(null);
    lastUpgrade.set(null);
  }

  @Test
  void openApiDescribesEndpointsFiltersAndSnakeCaseFeatures() throws Exception {
    String json =
        mvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith("application/json"))
            .andExpect(jsonPath("$.info.title").value("Housing Market Analysis API"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    var document = mapper.readTree(json);
    var paths = document.path("paths");
    assertThat(paths.has("/health")).isTrue();
    assertThat(paths.path("/market/what-if").path("post").has("requestBody")).isTrue();
    for (String endpoint :
        List.of("/market/overview", "/market/export.csv", "/market/export.pdf")) {
      var operation = paths.path(endpoint).path("get");
      assertThat(operation.has("requestBody")).isFalse();
      assertThat(operation.path("parameters").findValuesAsText("name"))
          .containsExactlyInAnyOrder(
              "bedrooms", "minPrice", "maxPrice", "minArea", "maxArea", "minSchoolRating");
      assertThat(operation.path("parameters").findValuesAsText("in")).containsOnly("query");
    }
    assertThat(
            document
                .path("components")
                .path("schemas")
                .path("Features")
                .path("properties")
                .has("square_footage"))
        .isTrue();
    assertThat(
            paths
                .path("/market/export.csv")
                .path("get")
                .path("responses")
                .path("200")
                .path("content")
                .has("text/csv"))
        .isTrue();
    assertThat(
            paths
                .path("/market/export.pdf")
                .path("get")
                .path("responses")
                .path("200")
                .path("content")
                .path("application/pdf")
                .path("schema")
                .path("format")
                .asText())
        .isEqualTo("binary");
  }

  @Test
  void swaggerUiAndItsOpenApiConfigurationAreAvailable() throws Exception {
    mvc.perform(get("/docs"))
        .andExpect(status().is3xxRedirection())
        .andExpect(redirectedUrl("/swagger-ui/index.html"));
    mvc.perform(get("/swagger-ui/index.html"))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith("text/html"));
    mvc.perform(get("/v3/api-docs/swagger-config"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.url").value("/v3/api-docs"));
  }

  @Test
  void overviewUsesDatasetAndHandlesEmptySegments() throws Exception {
    mvc.perform(get("/market/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.summary.property_count").value(50))
        .andExpect(jsonPath("$.properties.length()").value(50));
    mvc.perform(get("/market/overview").param("bedrooms", "9"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.summary.property_count").value(0))
        .andExpect(jsonPath("$.summary.median_price").isEmpty());
    var filter = new Filter(3, null, null, null, null, null);
    var filtered = market.overview(filter);
    assertThat(filtered.properties()).allMatch(p -> p.bedrooms() == 3);
    assertThat(filtered.summary().meanPrice())
        .isEqualTo(
            filtered.properties().stream().mapToDouble(Property::price).average().orElseThrow());
    assertThat(market.overview(filter)).isSameAs(filtered);
  }

  @Test
  void validatesFiltersAndPayloadBeforeCallingModel() throws Exception {
    mvc.perform(get("/market/overview").param("minPrice", "400000").param("maxPrice", "100000"))
        .andExpect(status().isUnprocessableEntity());
    mvc.perform(get("/market/overview").param("minPrice", "-1"))
        .andExpect(status().isUnprocessableEntity());
    mvc.perform(post("/market/what-if").contentType("application/json").content("{}"))
        .andExpect(status().isUnprocessableEntity());
    assertThat(lastRequest.get()).isNull();
  }

  @Test
  void modelRequestsUseHttp11WithoutCleartextUpgrade() {
    var features =
        market.overview(new Filter(null, null, null, null, null, null))
            .properties().get(0).features();
    var gateway =
        new ModelGateway(
            restClientBuilder.clone(), "http://127.0.0.1:" + server.getAddress().getPort(), 10000);
    gateway.predict(new WhatIfRequest(features, features));
    assertThat(lastUpgrade.get()).isNull();
  }

  @Test
  void scenarioUsesBatchModelContractAndCalculatesDelta() throws Exception {
    var property =
        Map.of(
            "square_footage",
            1550,
            "bedrooms",
            3,
            "bathrooms",
            2,
            "year_built",
            1997,
            "lot_size",
            6800,
            "distance_to_city_center",
            4.1,
            "school_rating",
            7.6);
    mvc.perform(
            post("/market/what-if")
                .contentType("application/json")
                .content(
                    mapper.writeValueAsString(Map.of("baseline", property, "scenario", property))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.change").value(25000))
        .andExpect(jsonPath("$.change_percent").value(10.0));
    assertThat(mapper.readTree(lastRequest.get()).isArray()).isTrue();
    assertThat(mapper.readTree(lastRequest.get()).get(0).has("square_footage")).isTrue();
    response.set("{\"predictions\":[]}");
    mvc.perform(
            post("/market/what-if")
                .contentType("application/json")
                .content(
                    mapper.writeValueAsString(Map.of("baseline", property, "scenario", property))))
        .andExpect(status().isBadGateway());
  }

  @Test
  void exportsRespectFiltersAndProduceReadablePaginatedPdf() throws Exception {
    String csv =
        mvc.perform(get("/market/export.csv").param("bedrooms", "2"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(csv).startsWith("id,square_footage,bedrooms,bathrooms");
    assertThat(csv.lines().count())
        .isEqualTo(
            market.overview(new Filter(2, null, null, null, null, null)).properties().size() + 1L);
    byte[] pdf =
        mvc.perform(get("/market/export.pdf"))
            .andExpect(status().isOk())
            .andExpect(content().contentType("application/pdf"))
            .andReturn()
            .getResponse()
            .getContentAsByteArray();
    try (var document = Loader.loadPDF(pdf)) {
      assertThat(document.getNumberOfPages()).isEqualTo(2);
      String text = new PDFTextStripper().getText(document);
      assertThat(text).contains("Housing market report", "50 matching properties", "Page 2 / 2");
    }
  }
}
