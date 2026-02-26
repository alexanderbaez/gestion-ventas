package ab.gestion_ventas.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "supply_orders")
@Data
public class SupplyOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Product product; // Qué compraste

    private Integer quantityPacks; // Cuántos packs
    private BigDecimal totalCost; // Cuánto pagaste en total
    private LocalDateTime orderDate;

    @PrePersist
    public void init() { this.orderDate = LocalDateTime.now(); }
}