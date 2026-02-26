package ab.gestion_ventas.repository;

import ab.gestion_ventas.model.SupplyOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SupplyOrderRepository extends JpaRepository<SupplyOrder, Long> {
    List<SupplyOrder> findByOrderDateBetween(LocalDateTime start, LocalDateTime end);
}
