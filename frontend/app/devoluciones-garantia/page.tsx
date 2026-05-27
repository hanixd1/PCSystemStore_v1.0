const RETURN_SECTIONS = [
  {
    title: 'Condiciones generales para solicitar una devolución',
    paragraphs: [
      'Para que una devolución pueda ser evaluada, el producto debe cumplir con las siguientes condiciones:',
    ],
    items: [
      'El producto debe encontrarse en buen estado físico.',
      'La caja, empaque, accesorios, manuales, sellos, protectores y demás elementos incluidos deben conservarse en buen estado.',
      'El producto debe encontrarse sellado cuando corresponda.',
      'No debe presentar señales de uso, manipulación indebida, golpes, rayaduras, deterioro, instalación incorrecta o intervención por terceros.',
      'El cliente debe presentar el comprobante de compra correspondiente.',
      'El cliente debe acreditar ser el titular de la compra mediante un documento de identidad vigente, cuando sea necesario.',
      'El producto debe ser entregado para revisión en el punto o canal indicado por PCSystemStore.',
    ],
  },
  {
    title: 'Productos abiertos o con empaque alterado',
    paragraphs: [
      'En caso de que el producto haya sido abierto, retirado de su empaque original o presente alteraciones en la caja, PCSystemStore realizará una revisión del estado del producto antes de determinar si corresponde aceptar la devolución.',
      'Luego de la evaluación, PCSystemStore podrá determinar una de las siguientes acciones:',
    ],
    items: [
      'Aprobar la devolución total del monto pagado por el producto.',
      'Aprobar una devolución parcial, cuando existan condiciones que afecten el estado comercial del producto, empaque o accesorios.',
      'Rechazar la devolución si el producto presenta uso, daño, deterioro, manipulación indebida, accesorios incompletos o condiciones que impidan su aceptación.',
    ],
  },
  {
    title: 'Rechazo de la devolución',
    paragraphs: [
      'Si luego de la evaluación PCSystemStore determina que la devolución no procede, el producto será devuelto al cliente.',
      'En caso de que la solicitud haya sido gestionada mediante envío, el cliente asumirá los costos de retorno del producto, salvo que PCSystemStore indique expresamente lo contrario.',
    ],
  },
  {
    title: 'Costos de envío y retorno',
    paragraphs: [
      'Los costos de envío, traslado o retorno necesarios para la evaluación o devolución del producto estarán a cargo del cliente, salvo que PCSystemStore determine una excepción por responsabilidad comprobada de la empresa.',
      'Los costos de delivery, instalación u otros servicios adicionales ya prestados no serán reembolsables.',
    ],
  },
];

const WARRANTY_SECTIONS = [
  {
    title: 'Documentos requeridos para garantía',
    paragraphs: ['Para iniciar la evaluación de garantía, el cliente deberá presentar:'],
    orderedItems: [
      'Copia legible del comprobante de compra.',
      'Documento o descripción detallada de la falla reportada.',
      'Producto completo con sus accesorios, empaques y elementos originales cuando la marca o el caso lo requiera.',
    ],
  },
  {
    title: 'Garantía DOA',
    paragraphs: [
      'La garantía DOA, también conocida como garantía por producto defectuoso de origen, podrá aplicar cuando la falla sea detectada dentro del plazo establecido por la marca o fabricante y se cumplan todas las condiciones exigidas para este tipo de atención.',
      'Para acceder a este beneficio, deberán cumplirse las siguientes condiciones:',
    ],
    orderedItems: [
      'El producto debe encontrarse dentro del plazo establecido por la marca para atención DOA.',
      'Debe contarse con la autorización de la marca o centro autorizado cuando corresponda.',
      'El producto debe ser de línea vigente y no encontrarse obsoleto o descontinuado.',
      'El producto debe ingresar en perfectas condiciones físicas.',
      'El producto debe conservar caja, empaques, manuales, accesorios y elementos originales.',
      'El producto no debe presentar ralladuras, golpes, roturas, rayaduras, manipulación indebida o señales de uso inadecuado.',
      'La falla no debe haber sido ocasionada por software, agentes externos, instalación incorrecta o intervención de terceros.',
    ],
  },
  {
    title: 'Trámite directo con la marca',
    paragraphs: [
      'Cuando el trámite de garantía corresponda directamente con la marca, el producto deberá ser llevado o enviado al centro autorizado de servicio indicado por el fabricante o representante correspondiente.',
      'En estos casos, PCSystemStore podrá orientar al cliente sobre el procedimiento, pero la evaluación, plazos, aprobación y solución final estarán sujetos a las políticas de la marca.',
    ],
  },
  {
    title: 'Casos en los que la garantía no aplica',
    paragraphs: ['La garantía no aplicará en los siguientes casos:'],
    orderedItems: [
      'Cuando no se cumplan los términos, condiciones o plazos establecidos por la marca o fabricante.',
      'Cuando el producto haya sido utilizado de forma indebida o contraria al manual, instructivo o recomendaciones del fabricante.',
      'Cuando el producto haya sido intervenido, manipulado, reparado o alterado por terceros no autorizados.',
      'Cuando el producto se encuentre roto, golpeado, rayado, quemado o con daño físico.',
      'Cuando la falla sea provocada por instalación de software, configuración incorrecta, virus, agentes externos o uso no adecuado.',
      'Cuando existan daños por variaciones eléctricas, humedad, líquidos, polvo excesivo, caídas o mala manipulación.',
      'Cuando el producto presente accesorios incompletos si estos son necesarios para la evaluación.',
      'Cuando se trate de píxeles dañados en notebooks o monitores LCD/LED y la cantidad no alcance el mínimo establecido por el fabricante para cambio o garantía.',
    ],
  },
  {
    title: 'Resultado de la revisión técnica',
    paragraphs: [
      'Una vez culminada la revisión por parte del centro de servicio autorizado, fabricante o área técnica correspondiente, se informará al cliente el resultado de la evaluación.',
      'Si se determina que el producto no presenta falla, funciona correctamente o la incidencia no está cubierta por garantía, el cliente deberá asumir los costos de diagnóstico, revisión o retorno que correspondan.',
      'PCSystemStore podrá aplicar un cargo por diagnóstico de S/. 30.00 cuando, luego de la revisión, se determine que el producto no presenta falla o que la incidencia no corresponde a garantía.',
    ],
  },
  {
    title: 'Cambio, reparación o solución aplicable',
    paragraphs: [
      'Si la evaluación determina que corresponde aplicar garantía, la solución podrá consistir en reparación, cambio de pieza, reemplazo parcial, reemplazo del producto o la alternativa definida por la marca o fabricante.',
      'Si la solución aplicable es el cambio del equipo, se reemplazará exclusivamente el equipo, parte o pieza defectuosa, según corresponda. El cliente deberá conservar sus accesorios, empaques y elementos incluidos originalmente, salvo que la marca solicite lo contrario.',
    ],
  },
  {
    title: 'Costos de traslado',
    paragraphs: [
      'Los costos de envío o traslado para el ingreso del producto a evaluación estarán a cargo del cliente, salvo que PCSystemStore o la marca indique expresamente una condición diferente.',
      'Cuando corresponda el retorno del producto al cliente, el costo de flete de retorno también podrá ser asumido por el cliente, especialmente en casos donde el producto no presente falla o la garantía no sea aplicable.',
    ],
  },
];

type PolicySubsection = {
  title: string;
  paragraphs: string[];
  items?: string[];
  orderedItems?: string[];
};

function PolicySubsections({ sections }: { sections: PolicySubsection[] }) {
  return (
    <div className="mt-8 space-y-8">
      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
          <div className="mt-4 space-y-4 text-base leading-8 text-gray-700">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.items ? (
              <ul className="list-disc space-y-2 pl-6">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {section.orderedItems ? (
              <ol className="list-decimal space-y-2 pl-6">
                {section.orderedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function DevolucionesGarantiaPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <article className="mx-auto max-w-5xl">
        <header className="border-b border-cyan-400/40 pb-6">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-500">
            PCSystemStore
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-gray-950">
            Devoluciones y Garantía
          </h1>
          <p className="mt-3 text-gray-600">Última actualización: mayo de 2026</p>
        </header>

        <section className="mt-10 space-y-5 text-base leading-8 text-gray-700">
          <p>
            En PCSystemStore buscamos que cada cliente reciba productos en buen estado,
            correctamente entregados y con respaldo postventa. La presente sección establece las
            condiciones aplicables para solicitudes de devolución, revisión de productos y trámites
            de garantía.
          </p>
          <p>
            Toda solicitud estará sujeta a evaluación previa por parte de PCSystemStore o, cuando
            corresponda, por el centro autorizado de servicio de la marca fabricante.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-gray-950">1. Política de Devoluciones</h2>
          <div className="mt-4 space-y-4 text-base leading-8 text-gray-700">
            <p>
              Las solicitudes de devolución podrán ser evaluadas cuando el cliente comunique su
              pedido dentro del plazo establecido por PCSystemStore y siempre que el producto cumpla
              con las condiciones necesarias para su revisión.
            </p>
            <p>
              La devolución no será aprobada de manera automática. PCSystemStore revisará el estado
              del producto, su empaque, accesorios, comprobante de compra y demás condiciones
              aplicables antes de confirmar si procede una devolución total, parcial o el rechazo de
              la solicitud.
            </p>
          </div>
          <PolicySubsections sections={RETURN_SECTIONS} />
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold text-gray-950">2. Política de Garantía</h2>
          <div className="mt-4 space-y-4 text-base leading-8 text-gray-700">
            <p>
              Si el producto adquirido en PCSystemStore presenta una falla, el cliente podrá
              solicitar la revisión correspondiente para iniciar el trámite de garantía. La garantía
              estará sujeta a las condiciones establecidas por el fabricante, la marca o el centro
              autorizado de servicio correspondiente.
            </p>
            <p>
              Una vez reportada la falla, PCSystemStore indicará el procedimiento aplicable para la
              revisión del producto. El cliente deberá entregar o enviar el producto al punto
              indicado, con el flete pagado cuando corresponda, junto con la documentación necesaria.
            </p>
          </div>
          <PolicySubsections sections={WARRANTY_SECTIONS} />
        </section>

        <section className="mt-14 border-t border-cyan-400/40 pt-8">
          <h2 className="text-2xl font-bold text-gray-950">3. Aceptación de la política</h2>
          <div className="mt-4 space-y-4 text-base leading-8 text-gray-700">
            <p>
              Al realizar una compra en PCSystemStore, el cliente declara haber leído y aceptado las
              condiciones establecidas en la presente Política de Devoluciones y Garantía.
            </p>
            <p>
              La atención de cada caso estará sujeta a revisión, documentación presentada,
              condiciones del producto, políticas del fabricante y normativa aplicable.
            </p>
          </div>
        </section>
      </article>
    </main>
  );
}
