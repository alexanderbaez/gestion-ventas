package ab.gestion_ventas.repository;

import ab.gestion_ventas.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    // Sumar ganancias de un mes específico
    @Query("SELECT SUM(s.totalProfit) FROM Sale s WHERE s.saleDate BETWEEN :start AND :end")
    BigDecimal sumProfitByPeriod(LocalDateTime start, LocalDateTime end);

    // Listar ventas del mes actual para la interfaz principal
    List<Sale> findBySaleDateBetween(LocalDateTime start, LocalDateTime end);



}
