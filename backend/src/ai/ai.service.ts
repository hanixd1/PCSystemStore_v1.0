import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';

// Promisificamos exec para poder usar async/await
const execAsync = promisify(exec);

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  // ====================================================================
  // FUNCIÓN PRINCIPAL: Comunica TypeScript con Python de forma segura
  // ====================================================================
  async getAiPredictions(productsContext?: any[]) {
    try {
      // 1. Si no nos pasan productos específicos, sacamos todo el catálogo de Prisma
      const products = productsContext || await this.prisma.product.findMany({
        select: { id: true, name: true, price: true, stock: true },
        take: 10, // Limitamos a 10 para que sea rápido en el chat
      });

      // 2. Convertimos los datos a texto para pasarlos por la consola
      const inputJson = JSON.stringify(products);

      // 3. Ejecutamos el script de Python (El path depende de dónde pusiste el predictor.py)
      // Ajustamos el comando para que no explote si tiene comillas raras
      const command = `python predictor.py '${inputJson.replace(/'/g, "'\\''")}'`;
      
      const { stdout } = await execAsync(command);

      // 4. Parseamos la respuesta de la IA
      const aiResponse = JSON.parse(stdout);

      if (aiResponse.error) {
        throw new Error(aiResponse.error);
      }

      return aiResponse.data;

    } catch (error: any) { // Le decimos a TypeScript que acepte el tipo
      // 🛡️ SISTEMA ANTI-CAÍDAS (RESILIENCIA)
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error en el motor de IA de Python: ${errorMessage}`);
      
      // Si la IA falla, la página NO SE CAE. Devolvemos un mensaje genérico seguro.
      return [{
        id: "error-fallback",
        estado: "DESCONOCIDO",
        mensaje_cliente: "El producto está disponible, consulta con un asesor en el chat para confirmar la cantidad exacta.",
        alerta_admin: "⚠️ No se pudo predecir. Revisar stock manualmente."
      }];
    }
  }

  // ====================================================================
  // FUNCIÓN PARA EL CHATBOT DEL CLIENTE
  // ====================================================================
  async processCustomerChat(userMessage: string) {
    // Aquí iría tu lógica de NLP sencilla (ej. buscar palabras clave como "procesador", "ryzen", "presupuesto")
    // Por ahora, simularemos que el cliente preguntó por un producto y buscamos la predicción de urgencia.
    
    // 1. Buscamos productos que coincidan con lo que dice el cliente
    const matchedProducts = await this.prisma.product.findMany({
      where: { name: { contains: "Ryzen" } }, // Ejemplo estático, aquí lo harías dinámico
    });

    if (matchedProducts.length === 0) {
      return { 
        reply: "No encontré ese componente en PCSystemStore. ¿Tienes en mente algún otro modelo?" 
      };
    }

    // 2. Le preguntamos a Python el estado de ese producto para meter el FOMO
    const predictions = await this.getAiPredictions(matchedProducts);
    const aiData = predictions[0]; // Tomamos el primer producto que encontró

    // 3. Armamos la respuesta inteligente para el cliente
    return {
      reply: `¡Claro! El ${matchedProducts[0].name} es una excelente opción para armar tu PC. ${aiData.mensaje_cliente}`,
      productLink: `http://localhost:3001/productos/${matchedProducts[0].slug}`
    };
  }
}