package de.grone.urlaubsantrag;

import static de.grone.urlaubsantrag.AccountService.error;
import static org.springframework.http.HttpStatus.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SetupService implements ApplicationRunner {
    private final UserRepository users;
    private final AccountService accounts;
    private final JdbcTemplate jdbc;
    private final Path tokenFile=Path.of(".local","setup-token.txt");
    private volatile String token;
    private final boolean generated;

    public SetupService(UserRepository users,AccountService accounts,JdbcTemplate jdbc,
            @Value("${app.setup-token:}") String configuredToken) {
        this.users=users; this.accounts=accounts; this.jdbc=jdbc;
        this.generated=configuredToken.isBlank();
        if (generated) {
            byte[] bytes=new byte[32]; new SecureRandom().nextBytes(bytes);
            token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        } else token=configuredToken;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (generated && required()) {
            Files.createDirectories(tokenFile.getParent());
            Files.writeString(tokenFile,token,StandardCharsets.UTF_8);
            org.slf4j.LoggerFactory.getLogger(getClass()).info("Ersteinrichtung: lokalen Einrichtungscode in .local/setup-token.txt öffnen.");
        }
    }

    public boolean required() { return users.count()==0; }

    @Transactional
    public ApiModels.UserView setup(ApiModels.SetupInput input) {
        jdbc.queryForObject("SELECT id FROM application_lock WHERE id = 1 FOR UPDATE",Integer.class);
        if (!required()) throw error(CONFLICT,"Die Ersteinrichtung ist bereits abgeschlossen.");
        if (!MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8),input.token().getBytes(StandardCharsets.UTF_8)))
            throw error(FORBIDDEN,"Der Einrichtungscode ist ungültig.");
        var user=accounts.createAccount(new ApiModels.CreateUser(input.firstName(),input.lastName(),
                input.email(),input.password(),Role.ADMIN,null,null,0));
        if (generated) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override public void afterCommit() {
                        try { Files.deleteIfExists(tokenFile); }
                        catch (java.io.IOException ignored) { /* Einrichtung ist bereits gesperrt. */ }
                    }
                });
        }
        return accounts.view(user);
    }
}
