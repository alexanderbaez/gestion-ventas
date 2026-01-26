package ab.gestion_ventas.model;


import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;
    private String description;
    @PositiveOrZero
    private Integer currentStock;

    //pack logic
    private BigDecimal packCost;
    private Integer unitsPerPack;
    private BigDecimal unitCost;

    // --- Sales Logic ---
    private Double profitMarginPercentage; // Ej: 50.0
    private BigDecimal suggestedSalesPrice; // Calculated
    private BigDecimal finalSalesPrice; // Manual or Suggesed
    private Boolean useManualPrice;

    @PrePersist
    @PreUpdate
    public void calculatePrices() {
        // 1. Calculate Unit Cost
        if (packCost != null && unitsPerPack != null && unitsPerPack > 0) {
            this.unitCost = packCost.divide(BigDecimal.valueOf(unitsPerPack), 2, RoundingMode.HALF_UP);
        }

        // 2. Calculate Suggested Price
        if (unitCost != null && profitMarginPercentage != null) {
            BigDecimal margin = BigDecimal.valueOf(1 + (profitMarginPercentage / 100));
            this.suggestedSalesPrice = unitCost.multiply(margin).setScale(2, RoundingMode.HALF_UP);
        }

        // 3. Final Price Logic
        if (Boolean.FALSE.equals(useManualPrice) || finalSalesPrice == null) {
            this.finalSalesPrice = this.suggestedSalesPrice;
        }
    }

}
