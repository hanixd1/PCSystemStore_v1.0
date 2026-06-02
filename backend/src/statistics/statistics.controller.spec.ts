import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/auth.constants';
import { StatisticsController } from './statistics.controller';

describe('StatisticsController', () => {
  it('protege inventory-dashboard para ADMIN y EDITOR', () => {
    const reflector = new Reflector();
    const roles = reflector.get(ROLES_KEY, StatisticsController);

    expect(roles).toEqual(['ADMIN', 'EDITOR']);
  });
});
