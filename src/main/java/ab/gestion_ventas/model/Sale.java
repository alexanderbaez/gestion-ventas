package ab.gestion_ventas.model;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sales")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private Integer quantity;
    private BigDecimal appliedPrice; // Precio unitario real aplicado (Sea minorista o mayorista)
    private BigDecimal totalSaleAmount;
    private BigDecimal totalProfit;
    private BigDecimal totalReinvestment;
    private Boolean isWholesale; // Para saber en el historial si fue por mayor

    private LocalDateTime saleDate;

    @PrePersist
    public void initDate() {
        this.saleDate = LocalDateTime.now();
    }
}
