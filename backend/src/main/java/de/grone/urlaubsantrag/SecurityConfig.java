package de.grone.urlaubsantrag;

import java.time.*;
import java.util.Locale;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean Clock clock() { return Clock.system(ZoneId.of("Europe/Berlin")); }
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    UserDetailsService userDetailsService(UserRepository users) {
        return email -> {
            var account = users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
                    .orElseThrow(() -> new UsernameNotFoundException("Anmeldung fehlgeschlagen"));
            return User.withUsername(account.email).password(account.passwordHash)
                    .roles(account.role.name()).disabled(!account.active).build();
        };
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,UserRepository users) throws Exception {
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/health", "/api/auth/csrf", "/api/auth/register", "/api/setup/**", "/error").permitAll()
                .anyRequest().authenticated());
        http.requestCache(cache -> cache.disable());
        http.exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) -> {
                    response.setStatus(401);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"message\":\"Bitte melden Sie sich an.\"}");
                })
                .accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(403);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"message\":\"Zugriff verweigert. Bitte Seite neu laden und erneut versuchen.\"}");
                }));
        http.formLogin(login -> login.loginProcessingUrl("/api/auth/login")
                .usernameParameter("email")
                .successHandler((request, response, authentication) -> {
                    var account=users.findByEmail(authentication.getName()).orElseThrow();
                    request.getSession().setAttribute("credentialsVersion",account.credentialsVersion);
                    response.setStatus(204);
                })
                .failureHandler((request, response, exception) -> {
                    response.setStatus(401);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"message\":\"E-Mail oder Passwort ist falsch, oder das Konto ist deaktiviert.\"}");
                }).permitAll());
        http.logout(logout -> logout.logoutUrl("/api/auth/logout")
                .invalidateHttpSession(true).deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)));
        return http.build();
    }
}
