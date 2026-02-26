package ab.gestion_ventas.service;

import ab.gestion_ventas.dto.MonthlyBalanceDTO;
import ab.gestion_ventas.model.Sale;
import ab.gestion_ventas.model.SupplyOrder;
import ab.gestion_ventas.repository.SaleRepository;
import ab.gestion_ventas.repository.SupplyOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

public interface BalanceService {

    public MonthlyBalanceDTO getCurrentMonthBalance();
}
