const auth = {
  token: '',
  srand: ''
};

export function getAuth() {
  return {token: auth.token, srand: auth.srand};
}

export function setToken(payload) {
  auth.token = payload;
}

export function setSrand(payload) {
  auth.srand = payload;
}

export function getHeaders() {
  return {
    'edger-token': auth.token,
    'edger-srand': auth.srand
  };
}
