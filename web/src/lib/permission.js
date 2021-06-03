import { edger } from '@edgeros/web-sdk';

const permsNeed = ['network', 'ainn', 'rtsp'];
let permsObtain = {};

export function setPerms(perms) {
  permsObtain = perms;
}

export function checkPerm(perm) {
  if(perm.indexOf('.') !== -1) {
    let code = permission.split('.');
    return this.permsObtain[code[0]][code[1]];
  }
  return permsObtain[perm];
}

export function checkPerms(perms = permsNeed) {
  let code = [];
  perms.forEach((perm) => {
    if (!checkPerm(perm)) {
      code.push(perm);
    }
  });
  return code;
}

export function requestPerm() {
  const config = {
    code:  permsNeed,
    type: 'permissions'
  };

  edger.permission.request(config).then((data) => {
    console.log(`permissionRequest:${JSON.stringify(data)}`);
  });
}
