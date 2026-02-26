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
        // 1. Buscamos el producto fresco de la DB para tener el costo real
        Product product = productRepository.findById(sale.getProduct().getId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        if (product.getCurrentStock() < sale.getQuantity()) {
            throw new RuntimeException("Stock insuficiente");
        }

        // 2. Decidir precio (Minorista o Mayorista)
        BigDecimal unitPrice = product.getFinalSalesPrice();
        boolean wholesaleApplied = false;

        if (product.getWholesalePrice() != null &&
                product.getWholesaleQuantityThreshold() != null &&
                sale.getQuantity() >= product.getWholesaleQuantityThreshold()) {
            unitPrice = product.getWholesalePrice();
            wholesaleApplied = true;
        }

        // 3. LA LÓGICA CONTABLE (Aquí está el truco)
        // totalAmount: Lo que el cliente te paga (ej. 5000)
        BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(sale.getQuantity()));

        // totalReinvestment: Lo que a vos te costó (ej. 2000) -> VA A RECAUDACIÓN
        BigDecimal costPerUnit = product.getUnitCost(); // ¡Asegurate que este campo no sea 0 en la DB!
        BigDecimal totalCost = costPerUnit.multiply(BigDecimal.valueOf(sale.getQuantity()));

        // totalProfit: Tu ganancia pura (ej. 3000) -> VA A GANANCIA NETA
        BigDecimal profitAmount = totalAmount.subtract(totalCost);

        // 4. Guardamos los datos separados
        sale.setProduct(product);
        sale.setAppliedPrice(unitPrice);
        sale.setTotalSaleAmount(totalAmount);
        sale.setTotalReinvestment(totalCost); // Esto es lo que recuperas
        sale.setTotalProfit(profitAmount);    // Esto es lo que ganás
        sale.setIsWholesale(wholesaleApplied);

        // 5. Descontar stock
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
        // 1. Buscamos la venta con todos sus datos
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        // 2. Recuperamos el producto asociado
        Product product = sale.getProduct();

        // 3. Devolvemos el stock (con chequeo de seguridad por si el producto fue borrado antes)
        if (product != null) {
            product.setCurrentStock(product.getCurrentStock() + sale.getQuantity());
            productRepository.save(product);
        }

        // 4. Eliminamos el registro de la venta
        // Usamos delete(sale) porque ya tenemos el objeto cargado en memoria
        saleRepository.delete(sale);
    }
}