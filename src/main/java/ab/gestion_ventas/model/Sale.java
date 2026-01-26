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

    @ManyToOne // Muchas ventas pueden pertenecer a un mismo producto
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private Integer quantity;

    private BigDecimal totalSaleAmount; // Precio final x cantidad
    private BigDecimal totalProfit;     // Ganancia neta total de esta venta
    private BigDecimal totalReinvestment; // Lo que hay que separar para volver a comprar

    private LocalDateTime saleDate;

    @PrePersist
    public void calculateSaleData() {
        this.saleDate = LocalDateTime.now();

        if (product != null && quantity != null) {
            // Monto total cobrado al cliente
            this.totalSaleAmount = product.getFinalSalesPrice().multiply(BigDecimal.valueOf(quantity));

            // Lo que costó el producto (Reinversión)
            this.totalReinvestment = product.getUnitCost().multiply(BigDecimal.valueOf(quantity));

            // La ganancia real
            this.totalProfit = this.totalSaleAmount.subtract(this.totalReinvestment);
        }
    }
}
