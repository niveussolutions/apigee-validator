// use this package in apigee
var validator = {};
validator.validateRequestBody = function (requestBody, schema, stripUnknown) {
  // Helper functions for specific validations
  function isNumber(value) {
    if (typeof value === "number" && isFinite(value) && Number.isInteger(value)) {
      return true;
    }
    if (typeof value === "string" && !isNaN(value) && isFinite(Number(value)) && Number.isInteger(Number(value))) {
      return true;
    }
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
    // Define date patterns
    var datePatterns = {
      "dd/mm/yyyy": /^(0[1-9]|[12][0-9]|3[01])[\/](0[1-9]|1[0-2])[\/]\d{4}$/,
      "dd-mm-yyyy": /^(0[1-9]|[12][0-9]|3[01])[\-](0[1-9]|1[0-2])[\-]\d{4}$/,
      "mm/dd/yyyy": /^(0[1-9]|1[0-2])[\/](0[1-9]|[12][0-9]|3[01])[\/]\d{4}$/,
      "mm-dd-yyyy": /^(0[1-9]|1[0-2])[\-](0[1-9]|[12][0-9]|3[01])[\-]\d{4}$/,
      "yyyy/mm/dd": /^\d{4}[\/](0[1-9]|1[0-2])[\/](0[1-9]|[12][0-9]|3[01])$/,
      "yyyy-mm-dd": /^\d{4}[\-](0[1-9]|1[0-2])[\-](0[1-9]|[12][0-9]|3[01])$/
    };

    // Use default format if not specified
    dateFormat = dateFormat || "dd/mm/yyyy";

    // Validate against the specified or default date format
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

  function validateValidValues(value, validValues) {
    return validValues.includes(value);
  }

  // Recursive function to validate the request body against the schema and strip unknown fields if required
  function validateAndStrip(object, schema, errors) {
    var validObject = {};
    var schemaKeys = Object.keys(schema);
    for (var i = 0; i < schemaKeys.length; i++) {
      var key = schemaKeys[i];
      if (schema.hasOwnProperty(key)) {
        var rule = schema[key];
        var value = object[key];

        if (rule.required && (value === undefined || value === null)) {
          errors.push('Field ' + key + ' is required.');
        }

        if (value !== undefined && value !== null) {
          if (rule.type === "number") {
            if (!isNumber(value)) {
              errors.push('Field ' + key + ' should be an integer.');
            }
            if (rule.min !== undefined && !validateMin(value, rule.min)) {
              errors.push('Field ' + key + ' should be at least ' + rule.min + '.');
            }
            if (rule.max !== undefined && !validateMax(value, rule.max)) {
              errors.push('Field ' + key + ' should be at most ' + rule.max + '.');
            }
            if (rule.round && !Number.isInteger(Number(value))) {
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
            if (rule.maxLength !== undefined && !validateMaxLength(value, rule.maxLength)) {
              errors.push('Field ' + key + ' should have at most ' + rule.maxLength + ' characters.');
            }
            if (rule.phone && !isPhoneNumber(value)) {
              errors.push('Field ' + key + ' should be a valid 10-digit phone number.');
            }
            if (rule.validValues && !validateValidValues(value, rule.validValues)) {
              errors.push('Field ' + key + ' should be one of the valid values: ' + rule.validValues.join(', ') + '.');
            }
          } else if (rule.type === "date") {
            if (!isValidDate(value, rule.dateFormat)) {
              errors.push('Field ' + key + ' should be a valid date in the format ' + (rule.dateFormat || "dd/mm/yyyy") + '.');
            }
          } else if (rule.type === "object") {
            var nestedErrors = [];
            // Recursive call to validate and strip nested object
            var validNestedObject = validateAndStrip(value, rule.properties, nestedErrors);
            if (nestedErrors.length > 0) {
              errors.push.apply(errors, nestedErrors);
            } else {
              validObject[key] = validNestedObject;
            }
          } else {
            errors.push('Unsupported type ' + rule.type + ' for field ' + key + '.');
          }

          if (!errors.some(err => err.includes(key))) {
            validObject[key] = value;
          }
        }
      }
    }

    if (stripUnknown) {
      var objectKeys = Object.keys(object);
      for (var j = 0; j < objectKeys.length; j++) {
        var objectKey = objectKeys[j];
        // Remove any key not present in the schema
        if (!schema.hasOwnProperty(objectKey)) {
          delete object[objectKey];
        }
      }
    }

    return validObject;
  }

  // Define the validation schema
  var schemaDefinition = schema;

  // Initialize errors array
  var errors = [];

  // Validate and strip unknown fields
  var validRequestBody = validateAndStrip(requestBody, schemaDefinition, errors);

  // Return the validation result
  return {
    errors: errors.length > 0 ? errors : null,
    validRequestBody: validRequestBody
  };
};
