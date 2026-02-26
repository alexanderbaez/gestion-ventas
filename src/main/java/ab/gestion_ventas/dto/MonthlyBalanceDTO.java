package ab.gestion_ventas.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class MonthlyBalanceDTO {
    private String monthName;
    private BigDecimal totalSales;       // bruto que entró
    private BigDecimal totalProfit;      // ganancia teórica sobre ventas
    private BigDecimal totalExpenses;    // lo que se gastó en proveedores
    private BigDecimal netBalance;       // ganancia real
    private long salesCount;
}