package ab.gestion_ventas.service;

import ab.gestion_ventas.model.Product;
import ab.gestion_ventas.model.Sale;
import ab.gestion_ventas.repository.ProductRepository;
import ab.gestion_ventas.repository.SaleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SaleServiceImpl implements SaleService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Override
    @Transactional
    public Sale createSale(Sale sale) {
        Product product = productRepository.findById(sale.getProduct().getId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (product.getCurrentStock() < sale.getQuantity()) {
            throw new RuntimeException("Stock insuficiente");
        }

        // 1. Decidir qué precio aplicar
        BigDecimal unitPrice = product.getFinalSalesPrice();
        boolean wholesaleApplied = false;

        if (product.getWholesalePrice() != null &&
                product.getWholesaleQuantityThreshold() != null &&
                sale.getQuantity() >= product.getWholesaleQuantityThreshold()) {

            unitPrice = product.getWholesalePrice();
            wholesaleApplied = true;
        }

        // 2. Calcular montos
        BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(sale.getQuantity()));
        BigDecimal costAmount = product.getUnitCost().multiply(BigDecimal.valueOf(sale.getQuantity()));
        BigDecimal profitAmount = totalAmount.subtract(costAmount);

        // 3. Seteamos los datos en el objeto Sale
        sale.setProduct(product);
        sale.setAppliedPrice(unitPrice);
        sale.setTotalSaleAmount(totalAmount);
        sale.setTotalReinvestment(costAmount);
        sale.setTotalProfit(profitAmount);
        sale.setIsWholesale(wholesaleApplied);

        // 4. Descontar stock y guardar
        product.setCurrentStock(product.getCurrentStock() - sale.getQuantity());
        productRepository.save(product);

        return saleRepository.save(sale);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Sale> getAllSales() {
        return saleRepository.findAll();
    }

    @Override
    @Transactional
    public void deleteSale(Long id) {
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        // Recuperamos el producto y devolvemos el stock
        Product product = sale.getProduct();
        if (product != null) {
            product.setCurrentStock(product.getCurrentStock() + sale.getQuantity());
            productRepository.save(product);
        }

        saleRepository.delete(sale);
    }
}