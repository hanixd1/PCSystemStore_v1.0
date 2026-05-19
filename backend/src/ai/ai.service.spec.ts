import { AiService } from './ai.service';

describe('AiService budget extraction', () => {
  const createService = () => new AiService({} as any) as any;

  it.each([
    ['busco una rtx 5060', null],
    ['quiero una rtx 5060 y tengo 4000 soles', 4000],
    ['tengo 3000 soles para una pc gamer', 3000],
    ['presupuesto de 4k', 4000],
    ['hasta 3.5k', 3500],
    ['cuento con S/ 2500', 2500],
    ['ryzen 5 5600', null],
    ['i5 12400', null],
  ])('extrae presupuesto seguro para "%s"', (message, expected) => {
    const service = createService();

    expect(service.extractBudgetFromText(message)).toBe(expected);
  });

  it('procesa textos largos sin backtracking ni bloqueo', () => {
    const service = createService();
    const longMessage = `${' '.repeat(5000)} rtx 5060 ${'#'.repeat(5000)}`;

    expect(service.extractBudgetFromText(longMessage)).toBeNull();
  });
});
