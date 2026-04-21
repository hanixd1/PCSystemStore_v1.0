import sys
import json
import numpy as np
from sklearn.ensemble import RandomForestRegressor

def predecir_urgencia():
    # 1. RECIBIR DATOS DESDE TYPESCRIPT (NODE.JS)
    try:
        # Node.js nos enviará un JSON con los productos y su stock por la terminal
        input_data = json.loads(sys.argv[1])
    except Exception as e:
        # Si Node no manda nada o manda mal, devolvemos error seguro
        print(json.dumps({"error": "No se recibieron datos válidos", "detalle": str(e)}))
        return

    resultados = []
    
    # Modelo de IA (Instanciado de forma rápida para la predicción al vuelo)
    model = RandomForestRegressor(n_estimators=50, random_state=42)

    try:
        for item in input_data:
            nombre = item.get("name", "Producto Desconocido")
            precio = float(item.get("price", 0))
            stock = int(item.get("stock", 0))
            
            # Simulamos el historial de ventas basado en el precio (Para no depender del Excel)
            # En un entorno real, Node.js también pasaría el historial de ventas del mes
            X_sim = np.random.randint(100, 5000, (50, 1))
            y_sim = np.maximum((30 - (X_sim * 0.005)) / 30, 0.01)
            model.fit(X_sim, y_sim.ravel())
            
            venta_diaria = model.predict([[precio]])[0]
            
            # 2. LÓGICA DE NEGOCIO Y FOMO (Fear Of Missing Out)
            if stock <= 0:
                mensaje_cliente = "Agotado temporalmente. ¡Pregúntame por alternativas!"
                alerta_admin = "🔴 AGOTADO. Reposición urgente requerida."
                estado = "AGOTADO"
            else:
                dias_restantes = stock / venta_diaria
                
                if dias_restantes < 7 or stock <= 3:
                    mensaje_cliente = f"🔥 ¡Alta demanda! Solo quedan {stock} unidades en stock."
                    alerta_admin = f"⚠️ RIESGO DE QUIEBRE. Stock estimado para {int(dias_restantes)} días."
                    estado = "CRITICO"
                elif dias_restantes < 15:
                    mensaje_cliente = "Stock disponible, pero se está vendiendo rápido."
                    alerta_admin = f"🟡 Demanda regular. Monitorear (Quedan {stock})."
                    estado = "MODERADO"
                else:
                    mensaje_cliente = "¡Tenemos stock disponible para entrega inmediata!"
                    alerta_admin = "✅ Stock saludable."
                    estado = "SALUDABLE"

            # Guardamos el análisis de este producto
            resultados.append({
                "id": item.get("id"),
                "nombre": nombre,
                "stock": stock,
                "estado": estado,
                "mensaje_cliente": mensaje_cliente, # Lo que dirá el chatbot
                "alerta_admin": alerta_admin        # Lo que verá el inventariador
            })

        # 3. DEVOLVER RESPUESTA A TYPESCRIPT EN JSON
        print(json.dumps({"success": True, "data": resultados}))

    except Exception as e:
        print(json.dumps({"error": "Error interno en el cálculo de IA", "detalle": str(e)}))

if __name__ == "__main__":
    predecir_urgencia()