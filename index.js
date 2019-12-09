require('dotenv').config();
const request = require('request-promise');
const assert = require('assert');

const {
  env: {
    'ti2-didgigo-apiUrl': apiUrl,
    'ti2-didgigo-appToken': appToken,
  },
} = process;

const headers = {
  'x-Api-Key': appToken,
  accept: 'application/json',
};

const doMap = (obj, map) => {
  const retVal = {};
  Object.entries(obj).forEach(([attribute, value]) => {
    if (map[attribute]) {
      const translate = map[attribute](value);
      if (translate && Array.isArray(translate[1])) {
        // its a multi-result de-construct
        translate.forEach(([remapName, newVal]) => {
          if (newVal !== undefined) {
            retVal[remapName] = newVal;
          }
        });
      } else if (translate) {
        const [remapName, newVal] = translate;
        if (newVal !== undefined) {
          retVal[remapName] = newVal;
        }
      }
    } else {
      retVal[attribute] = value;
    }
  });
  return retVal;
};

const profileMapIn = {
  contact: (val) => ([
    ['telephone', val.phone],
    ['website', val.website],
  ]),
  location: (addressVal) => ['address', doMap(addressVal, {
    state: (val) => ['state', val || undefined],
    country: (val) => ['country', val || undefined],
    address: (val) => ['address1', val || undefined],
    postcode: (val) => ['postalCode', val || undefined],
  })],
};

const mediaMapOut = {
  url: (val) => ['uri', val],
};

const gpsMapOut = {
  lat: (val) => ['latitude', val],
  lng: (val) => ['longitude', val],
};

const locationLocationMapOut = {
  address1: (val) => ['address', val],
  postalCode: (val) => ['postcode', val],
  gps: (val) => ['gps_coords', doMap(val, gpsMapOut)],
};

const locationMapOut = {
  locationId: (val) => ['id', val],
  locationName: (val) => ['name', val],
  description: (val) => ['descriptions', {
    long: val,
    short: val.split('.')[0],
  }],
  media: (val) => {
    const retVal = {};
    Object.keys(val).forEach((type) => {
      retVal[type] = doMap(val[type], mediaMapOut);
    });
    return retVal;
  },
  roomCount: () => {},
  location: (val) => ['location', doMap(val, locationLocationMapOut)],
  productType: (val) => ['type', (val === 'accommodation' ? 'Accommodation' : 'Non Accommodation')], // TODO: Check with Didgigo if Non Accommodation is right
};

const mediaMapIn = {
  url: (val) => ['uri', val],
};

const gpsMapIn = {
  latitude: (val) => ['lat', val],
  longitude: (val) => ['lng', val],
};

const locationLocationMapIn = {
  address: (val) => ['address1', val],
  postcode: (val) => ['postalCode', val],
  gps_coords: (val) => ['gps', doMap(val, gpsMapIn)],
};

const locationMapIn = {
  id: (val) => ['locationId', val],
  name: (val) => ['locationName', val],
  descriptions: (val) => ['description', val.long],
  media: (val) => {
    const retVal = {};
    Object.keys(val).forEach((type) => {
      retVal[type] = doMap(val[type], mediaMapIn);
    });
    return ['media', retVal];
  },
  location: (val) => ['location', doMap(val, locationLocationMapIn)],
  type: (val) => ['productType', val === 'Accomodation' ? 'accomodation' : 'non-accomodation'],
};

const validateToken = async ({ token }) => {
  try {
    // check the app Api Key
    const atResponse = await request({
      method: 'get',
      uri: `${apiUrl}/self`,
      headers,
      json: true,
    });
    assert(atResponse.api_key, appToken);
    // check the supplierId (aka token)
    const supplierReq = await request({
      method: 'get',
      uri: `${apiUrl}/suppliers/by-id/${token}`,
      headers,
      json: true,
    });
    assert(supplierReq.id.toString(), token.toString());
  } catch (err) {
    return false;
  }
  return true;
};

const getProfile = async ({ token }) => {
  const supplierReq = await request({
    method: 'get',
    uri: `${apiUrl}/suppliers/by-id/${token}`,
    headers,
    json: true,
  });
  const retVal = doMap(supplierReq, profileMapIn);
  return retVal;
};

// didgigo can't update a profile
// const updateProfile = async ({ token, payload }) => {}
const getLocations = async ({ token }) => {
  const locationList = await request({
    method: 'get',
    uri: `${apiUrl}/products/by-supplier/${token}?limit=100`,
    headers,
    json: true,
  });
  return locationList.map((location) => doMap(location, locationMapIn));
};

const getLocation = async ({ locationId }) => {
  const aLocation = await request({
    method: 'get',
    uri: `${apiUrl}/product/by-id/${locationId}`,
    headers,
    json: true,
  });
  return doMap(aLocation, locationMapIn);
};

const createLocation = async ({ token, payload }) => {
  const mapped = doMap(payload, locationMapOut);
  const body = {
    product: [{
      ...mapped,
      company: {
        id: token,
      },
    }],
  };
  const createReply = await request({
    method: 'post',
    uri: `${apiUrl}/products/create/`,
    headers,
    body,
    json: true,
  });
  // TODO: Ask Didgigo how to get the created product Id,
  // once it works.
  assert(Boolean(
    createReply.error === undefined
    && Array.isArray(createReply.product)
    && createReply.product.length > 0
    && createReply.product[0].id > 0,
  ), true);
  return ({ locationId: createReply.product[0].id });
};
const updateLocation = async ({ token, locationId, payload }) => {
  const mapped = doMap(payload, locationMapOut);
  const body = {
    product: [{
      id: locationId,
      ...mapped,
      company: {
        id: token,
      },
    }],
  };
  const updateReply = await request({
    method: 'post',
    uri: `${apiUrl}/products/create/`,
    headers,
    body,
    json: true,
  });
  return (updateReply.error === undefined);
};

const productMapOut = {
  plroductId: (val) => ['id', val],
  productName: (val) => ['name', val],
  description: (val) => ['descriptions', {
    long: val,
    short: val.split('.')[0],
  }],
  media: (val) => {
    const retVal = {};
    Object.keys(val).forEach((type) => {
      retVal[type] = doMap(val[type], mediaMapOut);
    });
    return ['media', retVal];
  },
  location: (val) => ['location', doMap(val, locationLocationMapOut)],
};

const productMapIn = {
  id: (val) => ['productId', val],
  name: (val) => ['productName', val],
  descriptions: (val) => ['description', val.long],
  media: (val) => {
    const retVal = {};
    Object.keys(val).forEach((type) => {
      retVal[type] = doMap(val[type], mediaMapIn);
    });
    return ['media', retVal];
  },
  location: (val) => ['location', doMap(val, locationLocationMapIn)],
};

const getProducts = async ({ locationId }) => {
  // return all product options
  const aLocation = await request({
    method: 'get',
    uri: `${apiUrl}/product/by-id/${locationId}`,
    headers,
    json: true,
  });
  return aLocation.options.map((option) => doMap(option, productMapIn));
};

const getProduct = async ({ locationId, productId }) => {
  const aLocation = await request({
    method: 'get',
    uri: `${apiUrl}/product/by-id/${locationId}`,
    headers,
    json: true,
  });
  assert(Array.isArray(aLocation.options));
  return doMap(
    aLocation.options.filter(({ id }) => id === productId)[0],
    productMapIn,
  );
};
const createProduct = async ({ token, locationId, payload }) => {
  // product aka product option
  const mapped = doMap(payload, productMapOut);
  const body = {
    product: [{
      id: locationId,
      ...mapped,
      company: {
        id: token,
      },
      options: [
        payload, // TODO: should we include all the options on the payload ?
      ],
    }],
  };
  const updateReply = await request({
    method: 'post',
    uri: `${apiUrl}/products/create/`,
    headers,
    body,
    json: true,
  });
  assert(updateReply.error === undefined);
  // TODO: get the inserted product (aka option) id
  assert(Array.isArray(updateReply.options));
  const productId = updateReply.options[updateReply.options.length - 1].id;
  return { productId };
};

const updateProduct = async ({
  token,
  locationId,
  productId,
  payload,
}) => {
  const mapped = doMap(payload, productMapOut);
  const body = {
    product: [{
      id: locationId,
      ...mapped,
      company: {
        id: token,
      },
      options: [
        {
          id: productId, // TODO: does sending an existing Id updates the option ?
          ...payload, // TODO: should we include all the options in order not to loose them?
        },
      ],
    }],
  };
  const updateReply = await request({
    method: 'post',
    uri: `${apiUrl}/products/create/`,
    headers,
    body,
    json: true,
  });
  assert(updateReply.error === undefined);
  return true;
};

module.exports = {
  validateToken,
  getProfile,
  // updateProfile,
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
};
