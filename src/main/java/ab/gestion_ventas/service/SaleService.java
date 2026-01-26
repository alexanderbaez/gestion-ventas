package ab.gestion_ventas.service;

import ab.gestion_ventas.model.Sale;

import java.util.List;

public interface SaleService {
    Sale createSale(Sale sale);
    List<Sale> getAllSales();
    void deleteSale(Long saleId);
}
