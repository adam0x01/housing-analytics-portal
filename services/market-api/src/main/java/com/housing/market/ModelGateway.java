package com.housing.market;

import static com.housing.market.Domain.*;

import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ModelGateway {
  private final RestClient client;

  public ModelGateway(
      RestClient.Builder builder,
      @Value("${market.model-api-url}") String url,
      @Value("${market.model-timeout-ms}") long timeout) {
    if (timeout <= 0 || timeout > 120000)
      throw new IllegalArgumentException("Invalid model timeout");
    var requestFactory =
        new JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(Duration.ofMillis(timeout)).build());
    requestFactory.setReadTimeout(Duration.ofMillis(timeout));
    client = builder.baseUrl(url).requestFactory(requestFactory).build();
  }

  public WhatIfResult predict(WhatIfRequest input) {
    try {
      ModelOutput output =
          client
              .post()
              .uri("/predict")
              .body(List.of(input.baseline(), input.scenario()))
              .retrieve()
              .body(ModelOutput.class);
      if (output == null
          || output.modelVersion() == null
          || output.priceUnit() == null
          || output.predictions() == null
          || output.predictions().size() != 2
          || output.predictions().stream()
              .anyMatch(
                  p ->
                      p == null
                          || p.price() == null
                          || !Double.isFinite(p.price())
                          || p.warnings() == null)) {
        throw new ResponseStatusException(
            HttpStatus.BAD_GATEWAY, "The model returned an invalid response.");
      }
      var baseline = output.predictions().get(0);
      var scenario = output.predictions().get(1);
      double change = scenario.price() - baseline.price();
      Double percent = baseline.price() == 0 ? null : change / Math.abs(baseline.price()) * 100;
      if (!Double.isFinite(change) || (percent != null && !Double.isFinite(percent))) {
        throw new ResponseStatusException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            "Use less extreme property features to compare these prices.");
      }
      return new WhatIfResult(
          baseline, scenario, change, percent, output.modelVersion(), output.priceUnit());
    } catch (ResourceAccessException error) {
      boolean timedOut = false;
      for (Throwable cause = error; cause != null; cause = cause.getCause()) {
        if (cause instanceof HttpTimeoutException
            || cause instanceof java.net.SocketTimeoutException) timedOut = true;
      }
      throw new ResponseStatusException(
          timedOut ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.SERVICE_UNAVAILABLE,
          timedOut
              ? "The model timed out. Please try again."
              : "The model is unavailable. Please try again.");
    } catch (RestClientResponseException error) {
      throw new ResponseStatusException(
          error.getStatusCode().value() == 422
              ? HttpStatus.UNPROCESSABLE_ENTITY
              : HttpStatus.SERVICE_UNAVAILABLE,
          "The model could not evaluate this scenario. Check the inputs and try again.");
    } catch (RestClientException error) {
      throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY, "The model returned an invalid response.");
    }
  }
}
