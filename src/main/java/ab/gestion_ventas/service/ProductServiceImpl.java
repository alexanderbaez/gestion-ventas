package ab.gestion_ventas.service;

import ab.gestion_ventas.model.Product;
import ab.gestion_ventas.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
@Service
public class ProductServiceImpl implements ProductService{

    @Autowired
    private ProductRepository productRepository;



    @Override
    @Transactional(readOnly = true)
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }

    @Override
    @Transactional
    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    @Override
    @Transactional
    public Product updateProduct(Long id, Product productDetails) {
        return productRepository.findById(id).map(product -> {
            product.setName(productDetails.getName());
            product.setDescription(productDetails.getDescription());
            product.setCurrentStock(productDetails.getCurrentStock());
            product.setPackCost(productDetails.getPackCost());
            product.setUnitsPerPack(productDetails.getUnitsPerPack());
            product.setProfitMarginPercentage(productDetails.getProfitMarginPercentage());
            product.setUseManualPrice(productDetails.getUseManualPrice());
            product.setFinalSalesPrice(productDetails.getFinalSalesPrice());

            // --- ESTO ES LO QUE TE FALTABA ---
            product.setWholesalePrice(productDetails.getWholesalePrice());
            product.setWholesaleQuantityThreshold(productDetails.getWholesaleQuantityThreshold());
            // ---------------------------------

            return productRepository.save(product);
        }).orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
    }

    @Override
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }
}
