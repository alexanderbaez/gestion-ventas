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
        LocalDateTime start = LocalDateTime.now().withDayOfMonth(1).with(LocalTime.MIN);
        LocalDateTime end = LocalDateTime.now().with(LocalTime.MAX);

        List<Sale> sales = saleRepository.findBySaleDateBetween(start, end);
        List<SupplyOrder> orders = supplyOrderRepository.findByOrderDateBetween(start, end);

        // 1. GANANCIA NETA (Los 3 mil de tu ejemplo)
        // Es la suma de la utilidad pura de cada venta
        BigDecimal netBalance = sales.stream()
                .map(Sale::getTotalProfit)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. RECAUDACIÓN / REINVERSIÓN (Los 2 mil de tu ejemplo)
        // Es el costo de la mercadería que vendiste (lo que recuperas para volver a comprar)
        BigDecimal totalSales = sales.stream()
                .map(Sale::getTotalReinvestment)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. EGRESOS PROV. (Lo que efectivamente pagaste al proveedor este mes)
        BigDecimal totalExpenses = orders.stream()
                .map(SupplyOrder::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return MonthlyBalanceDTO.builder()
                .monthName(LocalDateTime.now().getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "ES")))
                .totalSales(totalSales) // Aquí irán los "2 mil" (Recuperación de costo)
                .totalProfit(netBalance) // Dato extra
                .totalExpenses(totalExpenses) // Compras a proveedores
                .netBalance(netBalance) // Aquí irán los "3 mil" (Ganancia pura)
                .salesCount(sales.size())
                .build();
    }
}