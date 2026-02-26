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

        // 1. Obtener datos del mes desde los Repositorios
        // Nota: Deberás agregar estos métodos findByDateBetween en tus JpaRepository
        List<Sale> sales = saleRepository.findBySaleDateBetween(start, end);
        List<SupplyOrder> orders = supplyOrderRepository.findByOrderDateBetween(start, end);

        // 2. Sumar totales de Ventas
        BigDecimal totalSales = sales.stream()
                .map(Sale::getTotalSaleAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalProfit = sales.stream()
                .map(Sale::getTotalProfit)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. Sumar egresos por Compras al Proveedor
        BigDecimal totalExpenses = orders.stream()
                .map(SupplyOrder::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 4. Calcular el Balance Neto
        BigDecimal netBalance = totalProfit.subtract(totalExpenses);

        return MonthlyBalanceDTO.builder()
                .monthName(LocalDateTime.now().getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "ES")))
                .totalSales(totalSales)
                .totalProfit(totalProfit)
                .totalExpenses(totalExpenses)
                .netBalance(netBalance)
                .salesCount(sales.size())
                .build();
    }
}