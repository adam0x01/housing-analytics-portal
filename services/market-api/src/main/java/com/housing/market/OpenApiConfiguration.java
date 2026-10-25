package com.housing.market;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.core.jackson.ModelResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {
  @Bean
  public ModelResolver openApiModelResolver(ObjectMapper objectMapper) {
    // Document the same snake_case JSON field names that the API accepts and returns.
    return new ModelResolver(objectMapper);
  }
}
