package ab.gestion_ventas.repository;

import ab.gestion_ventas.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {

}
