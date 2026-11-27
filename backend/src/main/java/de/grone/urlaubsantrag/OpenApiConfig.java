package de.grone.urlaubsantrag;

import io.swagger.v3.oas.models.*;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.*;
import io.swagger.v3.oas.models.parameters.*;
import io.swagger.v3.oas.models.responses.*;
import io.swagger.v3.oas.models.security.*;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.*;

@Configuration
public class OpenApiConfig {
    @Bean OpenAPI openAPI() {
        return new OpenAPI().info(new Info().title("Grone Urlaubsverwaltung").version("1.0")
                .description("Sitzungsbasierte Anmeldung. Vor schreibenden Anfragen den Token über GET /api/auth/csrf abrufen und als X-CSRF-TOKEN senden."))
                .components(new Components().addSecuritySchemes("session",new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE).name("JSESSIONID")))
                .addSecurityItem(new SecurityRequirement().addList("session"));
    }

    @Bean OpenApiCustomizer authenticationDocumentation() {
        return api -> {
            var schema=new ObjectSchema().addProperty("email",new StringSchema().format("email"))
                    .addProperty("password",new StringSchema().format("password")).required(List.of("email","password"));
            var login=new Operation().summary("Anmelden und Sitzung starten").operationId("login")
                    .security(List.of()).requestBody(new RequestBody().required(true).content(new Content()
                        .addMediaType("application/x-www-form-urlencoded",new MediaType().schema(schema))))
                    .responses(new ApiResponses().addApiResponse("204",new ApiResponse().description("Angemeldet; Sitzungs-Cookie wird gesetzt"))
                        .addApiResponse("401",new ApiResponse().description("Anmeldung fehlgeschlagen")));
            api.path("/api/auth/login",new PathItem().post(login));
            api.path("/api/auth/logout",new PathItem().post(new Operation().summary("Sitzung beenden").operationId("logout")
                    .responses(new ApiResponses().addApiResponse("204",new ApiResponse().description("Abgemeldet")))));
            api.getPaths().forEach((path,item) -> item.readOperationsMap().forEach((method,operation) -> {
                if (method!=PathItem.HttpMethod.GET && method!=PathItem.HttpMethod.HEAD)
                    operation.addParametersItem(new Parameter().in("header").name("X-CSRF-TOKEN").required(true)
                            .description("Token aus GET /api/auth/csrf").schema(new StringSchema()));
            }));
        };
    }
}
