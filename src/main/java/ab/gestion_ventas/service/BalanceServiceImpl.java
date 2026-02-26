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
import java.time.LocalTime;
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
        // Rango de fechas: Desde el primer día del mes hasta el último segundo de hoy
        LocalDateTime start = LocalDateTime.now().withDayOfMonth(1).with(LocalTime.MIN);
        LocalDateTime end = LocalDateTime.now().with(LocalTime.MAX);

        List<Sale> sales = saleRepository.findBySaleDateBetween(start, end);
        List<SupplyOrder> orders = supplyOrderRepository.findByOrderDateBetween(start, end);

        // 1. DINERO RECUPERADO (Lo que destinamos a reposición en cada venta)
        // Ejemplo: Si vendiste a 5000 y costó 2000, sumamos los 2000.
        BigDecimal recoveredCapital = sales.stream()
                .map(s -> s.getTotalReinvestment() != null ? s.getTotalReinvestment() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. EGRESOS TOTALES (Lo que efectivamente pagaste a proveedores)
        BigDecimal totalExpenses = orders.stream()
                .map(o -> o.getTotalCost() != null ? o.getTotalCost() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. RECAUDACIÓN DISPONIBLE (Capital Recuperado - Compras Realizadas)
        // Aquí es donde ocurre el descuento: si tenías 47.633 y gastaste 19.000, quedará en 28.633.
        BigDecimal availableRecap = recoveredCapital.subtract(totalExpenses);

        // 4. GANANCIA NETA (Tu utilidad pura)
        // Este número es sagrado y no se ve afectado por las compras al proveedor.
        BigDecimal netProfit = sales.stream()
                .map(s -> s.getTotalProfit() != null ? s.getTotalProfit() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return MonthlyBalanceDTO.builder()
                .monthName(LocalDateTime.now().getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "ES")))
                .totalSales(availableRecap) // Se muestra en el Dashboard como "Recaudación"
                .totalProfit(netProfit)    // Se usa para estadísticas internas
                .totalExpenses(totalExpenses)
                .netBalance(netProfit)     // Se muestra en el Dashboard como "Ganancia Neta"
                .salesCount(sales.size())
                .build();
    }
}