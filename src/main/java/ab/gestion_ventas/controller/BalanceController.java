package ab.gestion_ventas.controller;

import ab.gestion_ventas.dto.MonthlyBalanceDTO;
import ab.gestion_ventas.service.BalanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/balance")
@CrossOrigin(origins = "*")
public class BalanceController {

    @Autowired
    private BalanceService balanceService;

    @GetMapping("/current")
    public ResponseEntity<MonthlyBalanceDTO> getCurrentBalance() {
        return ResponseEntity.ok(balanceService.getCurrentMonthBalance());
    }

}