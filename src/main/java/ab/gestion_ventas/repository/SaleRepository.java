package ab.gestion_ventas.repository;

import ab.gestion_ventas.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SaleRepository extends JpaRepository<Sale, Long> {
}
