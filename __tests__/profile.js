/* global describe it expect */
const faker = require('faker');
const app = require('../index');

const {
  env: {
    'ti2-didgigo-testSupplierId': token,
  },
} = process;

describe('profile and key tests', () => {
  describe('key', () => {
    it('try an invalid key', async () => {
      const retVal = await app.validateToken({ token: faker.random.uuid() });
      expect(retVal).toBe(false);
    });
    it('try a valid key', async () => {
      const retVal = await app.validateToken({ token });
      expect(retVal).toBe(true);
    });
  });
  describe('profile', () => {
    it('should be able to retrieve a profile', async () => {
      const retVal = await app.getProfile({ token });
      expect(Object.keys(retVal)).toEqual(expect.arrayContaining(['name', 'website', 'telephone', 'address']));
      expect(Object.keys(retVal.address)).toEqual(expect.arrayContaining(['state', 'country', 'address1', 'postalCode']));
    });
    // current didgigo API can't update profile info / data
    it.skip('should be able to update a profile', async () => {
      const { address } = faker;
      const nuData = {
        name: faker.company.companyName(),
        description: faker.lorem.paragraph(),
        website: faker.internet.url(),
        address: {
          country: address.country(),
          state: address.state(),
          city: address.city(),
          postalCode: address.zipCode(),
          address1: address.streetAddress(),
          gps: {
            lat: address.latitude(),
            lng: address.longitude(),
          },
        },
      };
      const retVal = await app.updateProfile({ payload: nuData, token });
      expect(retVal).toBe(true);
      const newVal = await app.getProfile({ token });
      expect(newVal.name).toBe(nuData.name);
      expect(newVal.description).toBe(nuData.description);
      expect(newVal.website).toBe(nuData.website);
      expect(newVal.address).toEqual(expect.objectContaining(nuData.address));
    });
  });
});
