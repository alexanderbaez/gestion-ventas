package ab.gestion_ventas.service;

import ab.gestion_ventas.model.SupplyOrder;

import java.util.List;

public interface SupplyOrderService {


    SupplyOrder createOrder(SupplyOrder order);
    List<SupplyOrder> getAllOrders();
    void deleteOrder(Long id);
}