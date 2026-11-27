package de.grone.urlaubsantrag;

import static de.grone.urlaubsantrag.AccountService.error;
import static org.springframework.http.HttpStatus.*;
import java.net.http.HttpClient;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class HolidayService {
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown=true)
    public record ApiHoliday(LocalDate date,String localName,boolean global,List<String> counties,List<String> types) {}
    private record CachedYear(Instant fetchedAt,List<ApiHoliday> holidays) {}
    private final Map<Integer,CachedYear> cache=new ConcurrentHashMap<>();
    private final RestClient client;
    private final Clock clock;

    public HolidayService(@Value("${app.holiday-api-url}") String baseUrl,Clock clock) {
        var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(8));
        client=RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
        this.clock=clock;
    }

    public List<ApiModels.Holiday> holidays(int year,String state) {
        if (year<2020 || year>2100) throw error(BAD_REQUEST,"Das Jahr muss zwischen 2020 und 2100 liegen.");
        var cached=cache.get(year);
        if (cached==null || cached.fetchedAt().plus(Duration.ofHours(24)).isBefore(clock.instant())) {
            try {
                var response=client.get().uri("/PublicHolidays/{year}/DE",year).retrieve().body(ApiHoliday[].class);
                if (response==null || response.length==0 || Arrays.stream(response)
                        .anyMatch(h -> h.date()==null || h.localName()==null || h.date().getYear()!=year))
                    throw new IllegalStateException("Ungültige Feiertagsdaten");
                cached=new CachedYear(clock.instant(),List.of(response)); cache.put(year,cached);
            } catch (RuntimeException exception) {
                throw error(SERVICE_UNAVAILABLE,"Feiertage sind momentan nicht verfügbar. Bitte später erneut versuchen.");
            }
        }
        return cached.holidays().stream()
                .filter(h -> h.types()!=null && h.types().contains("Public"))
                .filter(h -> h.global() || (h.counties()!=null && h.counties().contains(state)))
                .map(h -> new ApiModels.Holiday(h.date(),h.localName()))
                .distinct().sorted(Comparator.comparing(ApiModels.Holiday::date)).toList();
    }

    public int workingDays(LocalDate start,LocalDate end,String state) {
        if (start==null || end==null || end.isBefore(start))
            throw error(BAD_REQUEST,"Das Enddatum darf nicht vor dem Startdatum liegen.");
        if (start.getYear()!=end.getYear())
            throw error(BAD_REQUEST,"Bitte für jedes Kalenderjahr einen eigenen Antrag erstellen.");
        var holidays=new HashSet<>(holidays(start.getYear(),state).stream().map(ApiModels.Holiday::date).toList());
        return (int)start.datesUntil(end.plusDays(1))
                .filter(day -> day.getDayOfWeek()!=DayOfWeek.SATURDAY && day.getDayOfWeek()!=DayOfWeek.SUNDAY)
                .filter(day -> !holidays.contains(day)).count();
    }
}
