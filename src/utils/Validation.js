export const isString = (val) => typeof val === "string";
export const isNumber = (val) => typeof val === "number" && !isNaN(val);
export const isBoolean = (val) => typeof val === "boolean";
export const isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
export const isArray = (val) => Array.isArray(val);
export const isDate = (val) => !isNaN(Date.parse(val));
