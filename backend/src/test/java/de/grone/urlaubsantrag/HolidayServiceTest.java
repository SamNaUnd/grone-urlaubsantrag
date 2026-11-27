package de.grone.urlaubsantrag;

import static org.junit.jupiter.api.Assertions.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class HolidayServiceTest {
    @Test void countsBerlinHolidaysAndWeekendsAndCachesResponse() throws Exception {
        var calls=new AtomicInteger();
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/PublicHolidays/2027/DE",exchange -> {
            calls.incrementAndGet();
            byte[] json=("[{\"date\":\"2027-03-08\",\"localName\":\"Frauentag\",\"global\":false,\"counties\":[\"DE-BE\"],\"types\":[\"Public\"]},"
                +"{\"date\":\"2027-03-09\",\"localName\":\"Andere Region\",\"global\":false,\"counties\":[\"DE-BY\"],\"types\":[\"Public\"]}]")
                .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.sendResponseHeaders(200,json.length); exchange.getResponseBody().write(json); exchange.close();
        });
        server.start();
        try {
            var service=new HolidayService("http://127.0.0.1:"+server.getAddress().getPort(),Clock.systemUTC());
            assertEquals(1,service.workingDays(LocalDate.of(2027,3,5),LocalDate.of(2027,3,8),"DE-BE"));
            assertEquals(1,service.workingDays(LocalDate.of(2027,3,9),LocalDate.of(2027,3,9),"DE-BE"));
            assertEquals(0,service.workingDays(LocalDate.of(2027,3,6),LocalDate.of(2027,3,7),"DE-BE"));
            assertEquals(1,calls.get());
            assertThrows(ResponseStatusException.class,() -> service.workingDays(LocalDate.of(2027,1,2),LocalDate.of(2027,1,1),"DE-BE"));
            assertThrows(ResponseStatusException.class,() -> service.workingDays(LocalDate.of(2027,12,31),LocalDate.of(2028,1,1),"DE-BE"));
        } finally { server.stop(0); }
    }

    @Test void unavailableHolidayApiFailsClosed() throws Exception {
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange -> { exchange.sendResponseHeaders(503,-1); exchange.close(); });
        server.start();
        try {
            var service=new HolidayService("http://127.0.0.1:"+server.getAddress().getPort(),Clock.systemUTC());
            var error=assertThrows(ResponseStatusException.class,() -> service.holidays(2027,"DE-BE"));
            assertEquals(503,error.getStatusCode().value());
        } finally { server.stop(0); }
    }
}
