// require('dotenv').config();
const request = require('request-promise');
const assert = require('assert');

const getHeaders = (appToken) => ({
  'x-Api-Key': appToken,
  accept: 'application/json',
});

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
      if (!retVal[type]) retVal[type] = [];
      retVal[type].push(doMap(val[type], mediaMapOut)[1]);
    });
    return ['media', retVal];
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
  company: () => undefined,
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
      if (!retVal[type]) retVal[type] = [];
      retVal[type].push(doMap(val[type], mediaMapOut)[1]);
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

class Plugin {
  constructor(params = {}) { // we get the env variables from here
    Object.entries(params).forEach(([attr, value]) => {
      this[attr] = value;
    });
  }

  // async validateToken({ token: { apiKey } }) {
  async validateToken({
    token: {
      apiUrl = this.apiUrl,
      appToken = this.appToken,
      supplierToken = this.supplierToken,
    },
  }) {
    try {
      // check the app Api Key
      const atResponse = await request({
        method: 'get',
        uri: `${apiUrl}/self`,
        headers: getHeaders(appToken),
        json: true,
      });
      assert(atResponse.api_key, appToken);
      // check the supplierId (aka token)
      const supplierReq = await request({
        method: 'get',
        uri: `${apiUrl}/suppliers/by-id/${supplierToken}`,
        headers: getHeaders(appToken),
        json: true,
      });
      assert(supplierReq.id.toString(), supplierToken.toString());
    } catch (err) {
      return false;
    }
    return true;
  }

  async getProfile({
    token: {
      apiUrl = this.apiUrl,
      appToken = this.appToken,
      supplierToken = this.supplierToken,
    },
  }) {
    const supplierReq = await request({
      method: 'get',
      uri: `${apiUrl}/suppliers/by-id/${supplierToken}`,
      headers: getHeaders(appToken),
      json: true,
    });
    const retVal = doMap(supplierReq, profileMapIn);
    return retVal;
  }

  // didgigo can't update profile information :(
  // async updateProfile = async ({ token, payload }) => {}

  async getLocations({
    token: {
      apiUrl = this.apiUrl,
      appToken = this.appToken,
      supplierToken = this.supplierToken,
    },
  }) {
    const locationList = await request({
      method: 'get',
      uri: `${apiUrl}/products/by-supplier/${supplierToken}?limit=1000`,
      headers: getHeaders(appToken),
      json: true,
    });
    return locationList.map((location) => doMap(location, locationMapIn));
  }

  async getLocation({
    token: {
      apiUrl = this.apiUrl,
      appToken = this.appToken,
    },
    locationId,
  }) {
    const aLocation = await request({
      method: 'get',
      uri: `${apiUrl}/product/by-id/${locationId}`,
      headers: getHeaders(appToken),
      json: true,
    });
    // console.log(JSON.stringify(aLocation, null, 1));
    return doMap(aLocation, locationMapIn);
  }

  async createLocation({
    token: {
      apiUrl = this.apiUrl,
      appToken = this.appToken,
      supplierToken = this.supplierToken,
    },
    payload,
  }) {
    const mapped = doMap(payload, locationMapOut);
    const body = {
      products: [{
        ...mapped,
        company: {
          id: supplierToken,
          type: 'Supplier',
        },
      }],
    };
    // console.log(JSON.stringify(body, null, 2));
    const createReply = await request({
      method: 'post',
      uri: `${apiUrl}/products/create/`,
      headers: getHeaders(appToken),
      body,
      json: true,
    });
    assert(Boolean(
      createReply.error === undefined
      && Array.isArray(createReply)
      && createReply.length > 0
      && createReply[0] > 0,
    ), true);
    const locationId = createReply[0];
    return ({ locationId });
  }

  async updateLocation({
    token: {
      apiUrl = this.apiUrl,
      appToken = this.appToken,
      supplierToken = this.supplierToken,
    },
    locationId,
    payload,
  }) {
    const mapped = doMap(payload, locationMapOut);
    const body = {
      product: [{
        id: locationId,
        ...mapped,
        company: {
          id: supplierToken,
        },
      }],
    };
    const updateReply = await request({
      method: 'post',
      uri: `${apiUrl}/products/create/`,
      headers: getHeaders(appToken),
      body,
      json: true,
    });
    return (updateReply.error === undefined);
  }

  async getProducts({
    token: {
      apiUrl = this.apiUrl,
      appToken = this.appToken,
    },
    locationId,
  }) {
    // return all product options
    const aLocation = await request({
      method: 'get',
      uri: `${apiUrl}/product/by-id/${locationId}`,
      headers: getHeaders(appToken),
      json: true,
    });
    return aLocation.options.map((option) => doMap(option, productMapIn));
  }

  async getProduct({
    token: {
      apiUrl = this.apiUrl,
      appToken = this.appToken,
    },
    locationId,
    productId,
  }) {
    const aLocation = await request({
      method: 'get',
      uri: `${apiUrl}/product/by-id/${locationId}`,
      headers: getHeaders(appToken),
      json: true,
    });
    assert(Array.isArray(aLocation.options));
    return doMap(
      aLocation.options.filter(({ id }) => id === productId)[0],
      productMapIn,
    );
  }

  async createProduct({
    token: {
      apiUrl = this.apiUrl,
      appToken = this.appToken,
      supplierToken = this.supplierToken,
    },
    locationId,
    payload,
  }) {
    // product aka product option
    const mapped = doMap(payload, productMapOut);
    const body = {
      products: [{
        id: locationId,
        ...mapped,
        company: {
          id: supplierToken,
        },
        options: [
          payload, // TODO: should we include all the options on the payload ?
        ],
      }],
    };
    // console.log(JSON.stringify(body, null, 1));
    const updateReply = await request({
      method: 'post',
      uri: `${apiUrl}/products/create/`,
      headers: getHeaders(appToken),
      body,
      json: true,
    });
    assert(updateReply.error === undefined);
    // TODO: get the inserted product (aka option) id
    assert(Array.isArray(updateReply.options));
    const productId = updateReply.options[updateReply.options.length - 1].id;
    return { productId };
  }

  async updateProduct({
    token: {
      apiUrl = this.apiUrl,
      appToken = this.appToken,
      supplierToken = this.supplierToken,
    },
    locationId,
    productId,
    payload,
  }) {
    const mapped = doMap(payload, productMapOut);
    const body = {
      product: [{
        id: locationId,
        ...mapped,
        company: {
          id: supplierToken,
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
      headers: getHeaders(appToken),
      body,
      json: true,
    });
    assert(updateReply.error === undefined);
    return true;
  }
}

module.exports = Plugin;
