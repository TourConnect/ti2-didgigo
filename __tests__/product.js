/* global describe beforeAll it expect */
const faker = require('faker');
const Plugin = require('../index');
const app = new Plugin();

const token = {
  apiUrl: process.env.ti2_didgigo_apiUrl,
  appToken: process.env.ti2_didgigo_appToken,
  supplierToken: process.env.ti2_didgigo_testSupplierId,
};

describe('products', () => {
  let allProducts;
  const testLocation = {
    locationName: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    media: {
      images: [
        {
          url: faker.image.image(),
        },
        {
          url: faker.image.image(),
        },
      ],
    },
    location: {
      country: faker.address.country(),
      state: faker.address.state(),
      city: faker.address.city(),
      postalCode: faker.address.zipCode().toString(),
      address1: faker.address.streetAddress(),
      address2: null,
      gps: {
        lat: faker.address.latitude(),
        lng: faker.address.longitude(),
      },
    },
  };
  const testProduct = {
    productName: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    media: {
      images: [
        {
          url: faker.image.image(),
        },
        {
          url: faker.image.image(),
        },
      ],
    },
    location: {
      country: faker.address.country(),
      state: faker.address.state(),
      city: faker.address.city(),
      postalCode: faker.address.zipCode().toString(),
      address1: faker.address.streetAddress(),
      address2: null,
      gps: {
        lat: faker.address.latitude(),
        lng: faker.address.longitude(),
      },
    },
  };
  it('should be able to create a product', async () => {
    const retVal = await app.createProduct({
      token,
      locationId: testLocation.locationId,
      payload: testProduct,
    });
    expect(Object.keys(retVal)).toEqual(expect.arrayContaining(['productId']));
    testProduct.productId = retVal.productId;
  }, 30e3);
  it('should be able to retrieve all products', async () => {
    allProducts = await app.getProducts({ token, locationId: testProduct.locationId });
    expect(Array.isArray(allProducts)).toBe(true);
  });
  it('the new product should be on the list', async () => {
    expect(allProducts.map(({ productId }) => productId))
      .toEqual(expect.arrayContaining([testProduct.productId]));
  });
  it('should be able to retrieve a product', async () => {
    const retVal = await app.getProduct({
      locationId: testProduct.locationId,
      productId: testProduct.productId,
      token,
    });
    expect(retVal).toEqual(
      expect.objectContaining(testProduct),
    );
  });
  it('should be able to update a product', async () => {
    const nuData = {
      productName: faker.company.companyName(),
      description: faker.lorem.paragraph(),
    };
    const retVal = await app.updateProduct({
      locationId: testLocation.locationId,
      productId: testProduct.productId,
      payload: nuData,
      token,
    });
    expect(retVal).toBe(true);
    const updatedProduct = await app.getProduct({
      locationId: testLocation.locationId,
      productId: testProduct.productId,
      token,
    });
    expect(updatedProduct).toEqual(
      expect.objectContaining({
        ...testLocation,
        ...nuData,
      }),
    );
  });
});
