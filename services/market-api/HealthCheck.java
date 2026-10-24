import java.net.URI;
import java.net.http.*;
import java.time.Duration;

class HealthCheck {
  public static void main(String[] args) throws Exception {
    var response =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build()
            .send(
                HttpRequest.newBuilder(
                        URI.create(
                            "http://127.0.0.1:"
                                + System.getenv().getOrDefault("PORT", "8002")
                                + "/health"))
                    .timeout(Duration.ofSeconds(3))
                    .build(),
                HttpResponse.BodyHandlers.discarding());
    if (response.statusCode() != 200) System.exit(1);
  }
}
