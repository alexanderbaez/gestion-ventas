package ab.gestion_ventas.controller;

import ab.gestion_ventas.model.SupplyOrder;
import ab.gestion_ventas.service.SupplyOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/supply-orders")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class SupplyOrderController {

    @Autowired
    private SupplyOrderService supplyOrderService;

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody SupplyOrder order) {
        try {
            SupplyOrder newOrder = supplyOrderService.createOrder(order);
            return new ResponseEntity<>(newOrder, HttpStatus.CREATED);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<SupplyOrder>> getAllOrders() {
        return ResponseEntity.ok(supplyOrderService.getAllOrders());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        supplyOrderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }
}