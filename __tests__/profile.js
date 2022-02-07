/* global describe it expect */
const chance = require('chance').Chance();
const Plugin = require('../index');

const app = new Plugin();

const token = {
  apiUrl: process.env.ti2_didgigo_apiUrl,
  appToken: process.env.ti2_didgigo_appToken,
  supplierToken: process.env.ti2_didgigo_testSupplierId,
};

describe('profile and key tests', () => {
  describe('key', () => {
    it('try an invalid key', async () => {
      const retVal = await app.validateToken({
        ...token,
        supplierToken: chance.guid(),
      });
      expect(retVal).toBe(false);
    }, 30e3);
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
      // const { address } = faker;
      const nuData = {
        name: chance.company(),
        description: chance.paragraph(),
        website: chance.url(),
        address: {
          country: chance.country(),
          state: chance.state(),
          city: chance.city(),
          postalCode: chance.zip(),
          address1: chance.address(),
          gps: {
            lat: chance.latitude(),
            lng: chance.longitude(),
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
