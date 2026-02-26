package ab.gestion_ventas.service;

import ab.gestion_ventas.model.Product;
import ab.gestion_ventas.model.SupplyOrder;
import ab.gestion_ventas.repository.ProductRepository;
import ab.gestion_ventas.repository.SupplyOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SupplyOrderServiceImpl implements SupplyOrderService {

    @Autowired
    private SupplyOrderRepository supplyOrderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Override
    @Transactional
    public SupplyOrder createOrder(SupplyOrder order) {
        // 1. Buscamos el producto al que le estamos comprando stock
        Product product = productRepository.findById(order.getProduct().getId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado para la compra"));

        // 2. Calculamos cuántas unidades entran (packs * unidades por pack)
        int unidadesNuevas = order.getQuantityPacks() * product.getUnitsPerPack();

        // 3. Actualizamos el stock del producto
        product.setCurrentStock(product.getCurrentStock() + unidadesNuevas);

        // 4. (Opcional) Si el costo del pack cambió, actualizamos el costo en el producto
        product.setPackCost(order.getTotalCost().divide(
                java.math.BigDecimal.valueOf(order.getQuantityPacks()), 2, java.math.RoundingMode.HALF_UP));

        productRepository.save(product);

        // 5. Guardamos el registro del egreso
        return supplyOrderRepository.save(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupplyOrder> getAllOrders() {
        return supplyOrderRepository.findAll();
    }

    @Override
    @Transactional
    public void deleteOrder(Long id) {
        // Nota: Si borras una orden, podrías decidir si restas el stock o no.
        // Por seguridad contable, aquí solo borramos el registro.
        supplyOrderRepository.deleteById(id);
    }
}