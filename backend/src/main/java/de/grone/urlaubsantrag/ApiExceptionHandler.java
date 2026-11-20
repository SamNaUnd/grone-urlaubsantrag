package de.grone.urlaubsantrag;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("message",
                error.getReason()==null?"Die Anfrage konnte nicht verarbeitet werden.":error.getReason()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class,
            org.springframework.http.converter.HttpMessageNotReadableException.class,
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
            jakarta.validation.ConstraintViolationException.class})
    ResponseEntity<?> invalid(Exception error) {
        return ResponseEntity.badRequest().body(Map.of("message","Bitte Eingaben, Datumswerte und Pflichtfelder prüfen."));
    }

    @ExceptionHandler({DataIntegrityViolationException.class,org.springframework.dao.PessimisticLockingFailureException.class})
    ResponseEntity<?> conflict(Exception error) {
        return ResponseEntity.status(409).body(Map.of("message","Die Daten wurden zwischenzeitlich geändert oder sind bereits vorhanden. Bitte neu laden."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unexpected(Exception error) {
        org.slf4j.LoggerFactory.getLogger(getClass()).error("Unerwarteter Anwendungsfehler",error);
        return ResponseEntity.internalServerError().body(Map.of("message","Ein interner Fehler ist aufgetreten. Bitte später erneut versuchen."));
    }
}
