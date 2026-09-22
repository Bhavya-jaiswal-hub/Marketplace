import { AppController } from '../src/app.controller';

describe('AppController', () => {
  it('returns the service health payload', () => {
    const controller = new AppController();

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'marketplace-backend',
    });
  });
});
