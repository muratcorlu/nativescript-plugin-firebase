import { prompt } from "tns-core-modules/ui/dialogs";
import { getString, setString } from "tns-core-modules/application-settings";
import { firestore } from "./firebase";
import * as analytics from "./analytics/analytics";
import * as storage from "./storage/storage";
import * as mlkit from "./mlkit";

// note that this implementation is overridden for iOS
export class FieldValue {
  serverTimestamp = () => "SERVER_TIMESTAMP";
}

export class GeoPoint {
  constructor(public latitude: number, public longitude: number) {
  }
}

export const firebase: any = {
  initialized: false,
  instance: null,
  firebaseRemoteConfig: null,
  authStateListeners: [],
  interstitialAdStateListeners: [],
  _receivedNotificationCallback: null,
  _dynamicLinkCallback: null,
  analytics,
  storage,
  mlkit,
  firestore: {
    FieldValue: {
      serverTimestamp: () => "SERVER_TIMESTAMP"
    },
    GeoPoint: (latitude: number, longitude: number) => new GeoPoint(latitude, longitude)
  },
  invites: {
    MATCH_TYPE: {
      WEAK: 0,
      STRONG: 1
    }
  },
  dynamicLinks: {
    MATCH_CONFIDENCE: {
      WEAK: 0,
      STRONG: 1
    }
  },
  admob: {
    AD_SIZE: {
      SMART_BANNER: "SMART",
      LARGE_BANNER: "LARGE",
      BANNER: "BANNER",
      MEDIUM_RECTANGLE: "MEDIUM",
      FULL_BANNER: "FULL",
      LEADERBOARD: "LEADERBOARD",
      SKYSCRAPER: "SKYSCRAPER",
      FLUID: "FLUID"
    },
    defaults: {
      margins: {
        top: -1,
        bottom: -1
      },
      testing: false,
      size: "SMART"
    }
  },
  AdStates: {
    LOADED: "LOADED",
    FAILED: "FAILED",
    CLOSED: "CLOSED"
  },
  LoginType: {
    ANONYMOUS: "anonymous",
    PASSWORD: "password",
    PHONE: "phone",
    CUSTOM: "custom",
    FACEBOOK: "facebook",
    GOOGLE: "google",
    EMAIL_LINK: "emailLink"
  },
  QueryOrderByType: {
    KEY: "key",
    VALUE: "value",
    CHILD: "child",
    PRIORITY: "priority"
  },
  QueryLimitType: {
    FIRST: "first",
    LAST: "last"
  },
  QueryRangeType: {
    START_AT: "startAt",
    END_AT: "endAt",
    EQUAL_TO: "equalTo"
  },
  addAuthStateListener: listener => {
    if (firebase.authStateListeners.indexOf(listener) === -1) {
      firebase.authStateListeners.push(listener);
    }
    return true;
  },
  removeAuthStateListener: listener => {
    const index = firebase.authStateListeners.indexOf(listener);
    if (index >= 0) {
      firebase.authStateListeners.splice(index, 1);
      return true;
    } else {
      return false;
    }
  },
  hasAuthStateListener: listener => {
    return firebase.authStateListeners.indexOf(listener) >= 0;
  },
  notifyAuthStateListeners: data => {
    firebase.authStateListeners.forEach(listener => {
      try {
        if (listener.thisArg) {
          listener.onAuthStateChanged.call(listener.thisArg, data);
        } else {
          listener.onAuthStateChanged(data);
        }
      } catch (ex) {
        console.error("Firebase AuthStateListener failed to trigger", listener, ex);
      }
    });
  },
  addInterstitialAdStateListener: listener => {
    if (firebase.interstitialAdStateListeners.indexOf(listener) === -1) {
      firebase.interstitialAdStateListeners.push(listener);
    }
    return true;
  },
  removeInterstitialAdStateListener: listener => {
    const index = firebase.interstitialAdStateListeners.indexOf(listener);
    if (index >= 0) {
      firebase.interstitialAdStateListeners.splice(index, 1);
      return true;
    } else {
      return false;
    }
  },
  hasInterstitialAdStateListener: listener => {
    return firebase.interstitialAdStateListeners.indexOf(listener) >= 0;
  },
  notifyInterstitialAdStateListeners: data => {
    firebase.interstitialAdStateListeners.forEach(listener => {
      try {
        if (listener.thisArg) {
          listener.onInterstitialAdStateChanged.call(listener.thisArg, data);
        } else {
          listener.onInterstitialAdStateChanged(data);
        }
      } catch (ex) {
        console.error("Firebase AdStateListener failed to trigger", listener, ex);
      }
    });
  },
  rememberEmailForEmailLinkLogin: (email: string) => {
    setString("FirebasePlugin.EmailLinkLogin", email);
  },
  getRememberedEmailForEmailLinkLogin: () => {
    return getString("FirebasePlugin.EmailLinkLogin");
  },
  strongTypeify: value => {
    if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    } else if (parseFloat(value) === value) {
      value = parseFloat(value);
    } else if (parseInt(value) === value) {
      value = parseInt(value);
    }
    return value;
  },
  requestPhoneAuthVerificationCode: (onUserResponse, verificationPrompt) => {
    prompt(verificationPrompt || "Verification code").then(promptResult => {
      if (!promptResult.result) {
        return;
      }
      onUserResponse(promptResult.text);
    });
  },
  // for backward compatibility, because plugin version 4.0.0 moved the params to per-logintype objects
  moveLoginOptionsToObjects: loginOptions => {
    if (loginOptions.email) {
      console.log("Please update your code: the 'email' property is deprecated and now expected at 'passwordOptions.email'");
      if (!loginOptions.passwordOptions) {
        loginOptions.passwordOptions = {};
      }
      if (!loginOptions.passwordOptions.email) {
        loginOptions.passwordOptions.email = loginOptions.email;
      }
    }

    if (loginOptions.password) {
      console.log("Please update your code: the 'password' property is deprecated and now expected at 'passwordOptions.password'");
      if (!loginOptions.passwordOptions) {
        loginOptions.passwordOptions = {};
      }
      if (!loginOptions.passwordOptions.password) {
        loginOptions.passwordOptions.password = loginOptions.password;
      }
    }

    if (loginOptions.token) {
      console.log("Please update your code: the 'token' property is deprecated and now expected at 'customOptions.token'");
      if (!loginOptions.customOptions) {
        loginOptions.customOptions = {};
      }
      if (!loginOptions.customOptions.token) {
        loginOptions.customOptions.token = loginOptions.token;
      }
    }

    if (loginOptions.tokenProviderFn) {
      console.log("Please update your code: the 'tokenProviderFn' property is deprecated and now expected at 'customOptions.tokenProviderFn'");
      if (!loginOptions.customOptions) {
        loginOptions.customOptions = {};
      }
      if (!loginOptions.customOptions.tokenProviderFn) {
        loginOptions.customOptions.tokenProviderFn = loginOptions.tokenProviderFn;
      }
    }

    if (loginOptions.scope) {
      console.log("Please update your code: the 'scope' property is deprecated and now expected at 'facebookOptions.scope'");
      if (!loginOptions.facebookOptions) {
        loginOptions.facebookOptions = {};
      }
      if (!loginOptions.facebookOptions.scope) {
        loginOptions.facebookOptions.scope = loginOptions.scope;
      }
    }
  },
  merge: (obj1, obj2) => {
    const result = {}; // return result
    for (let i in obj1) {      // for every property in obj1
      if ((i in obj2) && (typeof obj1[i] === "object") && (i !== null)) {
        result[i] = firebase.merge(obj1[i], obj2[i]); // if it's an object, merge
      } else {
        result[i] = obj1[i]; // add it to result
      }
    }
    for (let i in obj2) { // add the remaining properties from object 2
      if (i in result) { // conflict
        continue;
      }
      result[i] = obj2[i];
    }
    return result;
  }
};

export abstract class DocumentSnapshot implements firestore.DocumentSnapshot {
  public data: () => firestore.DocumentData;
  constructor(public id: string, public exists: boolean, documentData: firestore.DocumentData) {
    this.data = () => exists ? documentData : undefined;
  }
}

export function isDocumentReference(object: any): object is firestore.DocumentReference {
  return object && object.discriminator === "docRef";
}

export class QuerySnapshot implements firestore.QuerySnapshot {
  public docSnapshots: firestore.DocumentSnapshot[];

  forEach(callback: (result: firestore.DocumentSnapshot) => void, thisArg?: any): void {
    this.docSnapshots.map(snapshot => callback(snapshot));
  }
}
