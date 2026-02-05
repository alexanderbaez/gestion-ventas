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
        // 1. Buscar el producto real en la DB
        Product product = productRepository.findById(sale.getProduct().getId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // 2. Validar si hay stock suficiente
        if (product.getCurrentStock() < sale.getQuantity()) {
            throw new RuntimeException("Insufficient stock for product: " + product.getName());
        }

        // 3. Lógica de Precio Mayorista vs Minorista
        // Si el producto tiene precio mayorista y la cantidad supera el umbral, aplicamos ese precio.
        BigDecimal unitPriceToApply = product.getFinalSalesPrice();

        if (product.getWholesalePrice() != null &&
                product.getWholesaleQuantityThreshold() != null &&
                sale.getQuantity() >= product.getWholesaleQuantityThreshold()) {

            unitPriceToApply = product.getWholesalePrice();
        }

        // 4. Descontar el stock
        product.setCurrentStock(product.getCurrentStock() - sale.getQuantity());
        productRepository.save(product);

        // 5. Preparar los datos de la venta
        sale.setProduct(product);

        /* Nota: Aunque Sale tiene @PrePersist, recalculamos aquí o nos aseguramos
           de que el precio aplicado sea el correcto según la lógica mayorista.
           Seteamos el total usando el precio que decidimos arriba.
        */
        BigDecimal totalAmount = unitPriceToApply.multiply(BigDecimal.valueOf(sale.getQuantity()));
        sale.setTotalSaleAmount(totalAmount);

        // 6. Guardar la venta
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