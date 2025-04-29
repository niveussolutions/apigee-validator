// validator.js
var validator = {};
validator.validateRequestBody = function (requestBody, schema) {
  function isNumber(value) {
    if (typeof value === "number" && isFinite(value) && Number.isInteger(value)) return true;
    if (typeof value === "string" && !isNaN(value) && isFinite(Number(value)) && Number.isInteger(Number(value))) return true;
    return false;
  }

  function isString(value) {
    return typeof value === "string";
  }

  function isPhoneNumber(value) {
    value = value + "";
    return typeof value === "string" && /^\d{10}$/.test(value);
  }

  function isValidDate(value, dateFormat) {
    var datePatterns = {
      "dd/mm/yyyy": /^(0[1-9]|[12][0-9]|3[01])[\/](0[1-9]|1[0-2])[\/]\d{4}$/,
      "dd-mm-yyyy": /^(0[1-9]|[12][0-9]|3[01])[\-](0[1-9]|1[0-2])[\-]\d{4}$/,
      "mm/dd/yyyy": /^(0[1-9]|1[0-2])[\/](0[1-9]|[12][0-9]|3[01])[\/]\d{4}$/,
      "mm-dd-yyyy": /^(0[1-9]|1[0-2])[\-](0[1-9]|[12][0-9]|3[01])[\-]\d{4}$/,
      "yyyy/mm/dd": /^\d{4}[\/](0[1-9]|1[0-2])[\/](0[1-9]|[12][0-9]|3[01])$/,
      "yyyy-mm-dd": /^\d{4}[\-](0[1-9]|1[0-2])[\-](0[1-9]|[12][0-9]|3[01])$/
    };

    dateFormat = dateFormat || "dd/mm/yyyy";
    var pattern = datePatterns[dateFormat];
    return pattern ? pattern.test(value) : false;
  }

  function validateMin(value, min) {
    return Number(value) >= min;
  }

  function validateMax(value, max) {
    return Number(value) <= max;
  }

  function validateMinLength(value, minLength) {
    return value.length >= minLength;
  }

  function validateMaxLength(value, maxLength) {
    return value.length <= maxLength;
  }

  function validateLength(value, length) {
    // console.log("Validating length:", value.length, length);
    
    return value.length === length;
  }

  function validateValidValues(value, validValues) {
    return validValues.includes(value);
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateObject(object, schema, errors) {
    var validObject = {};
    var schemaKeys = Object.keys(schema);

    if (schema._anyOf && Array.isArray(schema._anyOf)) {
      const anyOfValid = schema._anyOf.some((field) => object[field] !== undefined && object[field] !== null);
      if (!anyOfValid) {
        errors.push(`At least one of the following fields is required: ${schema._anyOf.join(", ")}`);
      }
    }

    for (var key of schemaKeys) {
      if (key === "_anyOf") continue;
      var rule = schema[key];
      var value = object[key];

      if (rule.required && (value === undefined || value === null)) {
        errors.push('Field ' + key + ' is required.');
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rule.type === "number") {
          if (!rule.phone && !isNumber(value)) {
            errors.push('Field ' + key + ' should be an integer.');
          }
          if (rule.min !== undefined && !validateMin(value, rule.min)) {
            errors.push('Field ' + key + ' should be at least ' + rule.min + '.');
          }
          if (rule.max !== undefined && !validateMax(value, rule.max)) {
            errors.push('Field ' + key + ' should be at most ' + rule.max + '.');
          }
          if (isNumber(value) && rule.round && !Number.isInteger(Number(value))) {
            errors.push('Field ' + key + ' should be a rounded number without decimal points.');
          }
          if (rule.phone && !isPhoneNumber(value)) {
            errors.push('Field ' + key + ' should be a valid 10-digit phone number.');
          }
        } else if (rule.type === "string") {
          if (!isString(value)) {
            errors.push('Field ' + key + ' should be a string.');
          }
          if (rule.minLength !== undefined && !validateMinLength(value, rule.minLength)) {
            errors.push('Field ' + key + ' should have at least ' + rule.minLength + ' characters.');
          }
          if (rule.length !== undefined && !validateLength(value, rule.length)) { 
            errors.push('Field ' + key + ' should be only ' + rule.length + ' characters.');
          }
          if (rule.maxLength !== undefined && !validateMaxLength(value, rule.maxLength)) {
            errors.push('Field ' + key + ' should have at most ' + rule.maxLength + ' characters.');
          }
          if (rule.phone && !isPhoneNumber(value)) {
            errors.push('Field ' + key + ' should be a valid 10-digit phone number.');
          }
          if (rule.validValues && !validateValidValues(value, rule.validValues)) {
            errors.push('Field ' + key + ' should be one of the valid values: ' + rule.validValues.join(', ') + '.');
          }
          if (rule.email && !isEmail(value)) {
            errors.push(`Field ${key} should be a valid email address.`);
          }
        } else if (rule.type === "date") {
          if (!isValidDate(value, rule.dateFormat)) {
            errors.push('Field ' + key + ' should be a valid date in the format ' + (rule.dateFormat || "dd/mm/yyyy") + '.');
          }
        } else if (rule.type === "object") {
          if (typeof value !== "object") {
            errors.push('Field ' + key + ' should be an object.');
          } else {
            var nestedErrors = [];
            var validNestedObject = validateObject(value, rule.properties, nestedErrors);
            if (nestedErrors.length > 0) {
              errors.push(...nestedErrors);
            } else {
              validObject[key] = validNestedObject;
            }
          }
        } else {
          errors.push('Unsupported type ' + rule.type + ' for field ' + key + '.');
        }

        if (!errors.some(err => err.includes(key))) {
          validObject[key] = value;
        }
      }
    }

    return validObject;
  }

  var errors = [];
  var validRequestBody = validateObject(requestBody, schema, errors);

  return {
    errors: errors.length > 0 ? errors : null,
    validRequestBody: validRequestBody
  };
};

module.exports = validator;
