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

    // --- Pack Logic ---
    private BigDecimal packCost;
    private Integer unitsPerPack;
    private BigDecimal unitCost;

    // --- Sales Logic (Minorista) ---
    private Double profitMarginPercentage; // Ej: 50.0
    private BigDecimal suggestedSalesPrice; // Calculado
    private BigDecimal finalSalesPrice; // Manual o Sugerido
    private Boolean useManualPrice;

    // --- Wholesale Logic (Mayorista / Emprendedores) ---
    private BigDecimal wholesalePrice; // Precio por unidad para mayoristas
    private Integer wholesaleQuantityThreshold; // Cantidad mínima para aplicar este precio (Ej: 6 unidades)

    @PrePersist
    @PreUpdate
    public void calculatePrices() {
        // 1. Calcular Costo Unitario
        if (packCost != null && unitsPerPack != null && unitsPerPack > 0) {
            this.unitCost = packCost.divide(BigDecimal.valueOf(unitsPerPack), 2, RoundingMode.HALF_UP);
        }

        // 2. Calcular Precio Sugerido (Minorista)
        if (unitCost != null && profitMarginPercentage != null) {
            BigDecimal margin = BigDecimal.valueOf(1 + (profitMarginPercentage / 100));
            this.suggestedSalesPrice = unitCost.multiply(margin).setScale(2, RoundingMode.HALF_UP);
        }

        // 3. Lógica de Precio Final Minorista
        if (Boolean.FALSE.equals(useManualPrice) || finalSalesPrice == null) {
            this.finalSalesPrice = this.suggestedSalesPrice;
        }

        // 4. Validación de seguridad para Mayorista
        if (wholesaleQuantityThreshold == null || wholesaleQuantityThreshold <= 0) {
            this.wholesaleQuantityThreshold = 1; // Por defecto mínimo 1 si no se define
        }
    }
}