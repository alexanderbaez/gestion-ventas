package ab.gestion_ventas.service;

import ab.gestion_ventas.dto.MonthlyBalanceDTO;
import ab.gestion_ventas.model.Sale;
import ab.gestion_ventas.model.SupplyOrder;
import ab.gestion_ventas.repository.SaleRepository;
import ab.gestion_ventas.repository.SupplyOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

@Service
public class BalanceServiceImpl implements BalanceService {

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private SupplyOrderRepository supplyOrderRepository;

    @Override
    public MonthlyBalanceDTO getCurrentMonthBalance() {
        LocalDateTime start = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
        LocalDateTime end = LocalDateTime.now().withHour(23).withMinute(59);

        List<Sale> sales = saleRepository.findBySaleDateBetween(start, end);
        List<SupplyOrder> orders = supplyOrderRepository.findByOrderDateBetween(start, end);

        // Total que entró por ventas (Precio de venta * cantidad)
        BigDecimal totalSales = sales.stream()
                .map(Sale::getTotalSaleAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Ganancia bruta de esas ventas
        BigDecimal totalProfit = sales.stream()
                .map(Sale::getTotalProfit) // Esto ya viene calculado como (Venta - Costo)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Total pagado a proveedores (Egresos)
        BigDecimal totalExpenses = orders.stream()
                .map(SupplyOrder::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // BALANCE NETO: Recaudación total de ventas MENOS los pagos a proveedores
        // Esto te dice cuánto dinero real tienes después de reponer mercadería
        BigDecimal netBalance = totalSales.subtract(totalExpenses);

        return MonthlyBalanceDTO.builder()
                .monthName(LocalDateTime.now().getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "ES")))
                .totalSales(totalSales)
                .totalProfit(totalProfit) // Mantenemos este dato para estadísticas
                .totalExpenses(totalExpenses)
                .netBalance(netBalance) // Este valor ahora refleja Recaudación - Compras
                .salesCount(sales.size())
                .build();
    }
}