package com.housing.market;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
@OpenAPIDefinition(
    info =
        @Info(
            title = "Housing Market Analysis API",
            version = "0.1.0",
            description =
                "Housing dataset statistics, segment exports, and model-backed what-if analysis."))
public class MarketApplication {
  public static void main(String[] args) {
    SpringApplication.run(MarketApplication.class, args);
  }
}
